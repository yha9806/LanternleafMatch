// ============================================
// 数据埋点与分析系统
// 支持事件收集、批量上报、离线缓存
// ============================================

import type { TileType } from '../types';

// ============================================
// 事件类型定义
// ============================================

export const ANALYTICS_EVENTS = {
  // 关卡事件
  LEVEL_START: 'level_start',
  LEVEL_END: 'level_end',
  LEVEL_RETRY: 'level_retry',

  // 操作事件
  MOVE_MADE: 'move_made',
  SPECIAL_CREATED: 'special_created',
  SPECIAL_TRIGGERED: 'special_triggered',
  CASCADE_TRIGGERED: 'cascade_triggered',
  SHUFFLE_TRIGGERED: 'shuffle_triggered',

  // 体力事件
  ENERGY_CONSUMED: 'energy_consumed',
  ENERGY_RECOVERED: 'energy_recovered',
  AD_WATCHED: 'ad_watched',
  AD_FAILED: 'ad_failed',

  // 流失点
  ENERGY_GATE_SHOWN: 'energy_gate_shown',
  ENERGY_GATE_CLOSED: 'energy_gate_closed',
  GAME_QUIT: 'game_quit',

  // UI 事件
  BUTTON_CLICK: 'button_click',
  MODAL_SHOWN: 'modal_shown',
  MODAL_CLOSED: 'modal_closed',

  // 会话事件
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

// ============================================
// 数据结构
// ============================================

export interface AnalyticsEvent {
  eventName: AnalyticsEventName;
  timestamp: number;
  playerId: string;
  sessionId: string;
  data: Record<string, any>;
}

export interface LevelStartData {
  level: number;
  seed: number;
  moves: number;
  goalType: string;
  goalItem?: TileType;
  goalCount: number;
  mossCount: number;
  pattern: string;
}

export interface LevelEndData {
  level: number;
  result: 'win' | 'lose' | 'quit';
  movesUsed: number;
  movesRemaining: number;
  goalProgress: number;
  goalTotal: number;
  duration: number;        // 游戏时长（秒）
  cascadeCount: number;
  shuffleCount: number;
  specialsCreated: number;
  specialsTriggered: number;
  retryCount: number;
}

export interface MoveData {
  level: number;
  moveNumber: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  matchCount: number;
  isCascade: boolean;
  isSpecial: boolean;
}

export interface AdWatchData {
  adType: 'rewarded' | 'interstitial';
  placement: string;
  result: 'completed' | 'skipped' | 'failed';
  reward?: string;
  rewardAmount?: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
  endpoint: string;
  flushIntervalMs: number;
  maxQueueSize: number;
  batchSize: number;
  retryAttempts: number;
  offlineStorageKey: string;
  debug: boolean;
}

// ============================================
// 默认配置
// ============================================

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  endpoint: '/api/analytics',
  flushIntervalMs: 30000,       // 30秒
  maxQueueSize: 1000,
  batchSize: 50,
  retryAttempts: 3,
  offlineStorageKey: 'analytics_queue',
  debug: false,
};

// ============================================
// AnalyticsManager 类
// ============================================

export class AnalyticsManager {
  private config: AnalyticsConfig;
  private queue: AnalyticsEvent[] = [];
  private playerId: string = '';
  private sessionId: string = '';
  private sessionStartTime: number = 0;
  private flushTimer?: NodeJS.Timeout;
  private isFlushing: boolean = false;
  private storage?: Storage;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();

    // 尝试使用 localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
      this.loadOfflineQueue();
    }

    // 启动定时刷新
    if (this.config.enabled) {
      this.startFlushTimer();
    }
  }

  // ============================================
  // 初始化
  // ============================================

  /**
   * 设置玩家 ID
   */
  setPlayerId(playerId: string): void {
    this.playerId = playerId;
  }

  /**
   * 开始新会话
   */
  startSession(): void {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();

    this.track(ANALYTICS_EVENTS.SESSION_START, {
      timestamp: this.sessionStartTime,
    });
  }

  /**
   * 结束会话
   */
  endSession(): void {
    const duration = (Date.now() - this.sessionStartTime) / 1000;

    this.track(ANALYTICS_EVENTS.SESSION_END, {
      duration,
      eventsCount: this.queue.length,
    });

    // 立即刷新
    this.flush();
  }

  // ============================================
  // 事件追踪
  // ============================================

  /**
   * 通用事件追踪
   */
  track(eventName: AnalyticsEventName, data: Record<string, any> = {}): void {
    if (!this.config.enabled) return;

    const event: AnalyticsEvent = {
      eventName,
      timestamp: Date.now(),
      playerId: this.playerId,
      sessionId: this.sessionId,
      data,
    };

    this.queue.push(event);

    if (this.config.debug) {
      console.log('[Analytics]', eventName, data);
    }

    // 队列满时自动刷新
    if (this.queue.length >= this.config.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * 记录关卡开始
   */
  trackLevelStart(data: LevelStartData): void {
    this.track(ANALYTICS_EVENTS.LEVEL_START, data);
  }

  /**
   * 记录关卡结束
   */
  trackLevelEnd(data: LevelEndData): void {
    // 计算派生指标
    const enrichedData = {
      ...data,
      efficiency: data.movesUsed > 0 ? data.goalProgress / data.movesUsed : 0,
      timePerMove: data.movesUsed > 0 ? data.duration / data.movesUsed : 0,
      cascadeRate: data.movesUsed > 0 ? data.cascadeCount / data.movesUsed : 0,
      specialRate: data.movesUsed > 0 ? data.specialsTriggered / data.movesUsed : 0,
      completionRate: data.goalTotal > 0 ? data.goalProgress / data.goalTotal : 0,
    };

    this.track(ANALYTICS_EVENTS.LEVEL_END, enrichedData);
  }

  /**
   * 记录操作
   */
  trackMove(data: MoveData): void {
    this.track(ANALYTICS_EVENTS.MOVE_MADE, data);
  }

  /**
   * 记录特殊块创建
   */
  trackSpecialCreated(level: number, type: string, position: { row: number; col: number }): void {
    this.track(ANALYTICS_EVENTS.SPECIAL_CREATED, {
      level,
      specialType: type,
      ...position,
    });
  }

  /**
   * 记录特殊块触发
   */
  trackSpecialTriggered(level: number, type: string, clearedCount: number): void {
    this.track(ANALYTICS_EVENTS.SPECIAL_TRIGGERED, {
      level,
      specialType: type,
      clearedCount,
    });
  }

  /**
   * 记录连消
   */
  trackCascade(level: number, cascadeDepth: number, totalCleared: number): void {
    this.track(ANALYTICS_EVENTS.CASCADE_TRIGGERED, {
      level,
      cascadeDepth,
      totalCleared,
    });
  }

  /**
   * 记录洗牌
   */
  trackShuffle(level: number, shuffleCount: number): void {
    this.track(ANALYTICS_EVENTS.SHUFFLE_TRIGGERED, {
      level,
      shuffleCount,
    });
  }

  /**
   * 记录广告观看
   */
  trackAdWatched(data: AdWatchData): void {
    this.track(ANALYTICS_EVENTS.AD_WATCHED, data);
  }

  /**
   * 记录广告失败
   */
  trackAdFailed(adType: string, error: string): void {
    this.track(ANALYTICS_EVENTS.AD_FAILED, {
      adType,
      error,
    });
  }

  /**
   * 记录体力消耗
   */
  trackEnergyConsumed(level: number, remaining: number): void {
    this.track(ANALYTICS_EVENTS.ENERGY_CONSUMED, {
      level,
      remaining,
    });
  }

  /**
   * 记录体力恢复
   */
  trackEnergyRecovered(source: 'natural' | 'ad' | 'purchase', amount: number): void {
    this.track(ANALYTICS_EVENTS.ENERGY_RECOVERED, {
      source,
      amount,
    });
  }

  /**
   * 记录体力门显示
   */
  trackEnergyGateShown(level: number): void {
    this.track(ANALYTICS_EVENTS.ENERGY_GATE_SHOWN, { level });
  }

  /**
   * 记录体力门关闭
   */
  trackEnergyGateClosed(level: number, action: 'watch_ad' | 'wait' | 'close'): void {
    this.track(ANALYTICS_EVENTS.ENERGY_GATE_CLOSED, { level, action });
  }

  /**
   * 记录按钮点击
   */
  trackButtonClick(buttonId: string, context?: string): void {
    this.track(ANALYTICS_EVENTS.BUTTON_CLICK, {
      buttonId,
      context,
    });
  }

  // ============================================
  // 数据上报
  // ============================================

  /**
   * 刷新队列（发送到服务器）
   */
  async flush(): Promise<boolean> {
    if (this.isFlushing || this.queue.length === 0) {
      return true;
    }

    this.isFlushing = true;

    try {
      // 分批发送
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.config.batchSize);
        const success = await this.sendBatch(batch);

        if (!success) {
          // 发送失败，放回队列
          this.queue.unshift(...batch);
          this.saveOfflineQueue();
          return false;
        }
      }

      return true;
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * 发送批次数据
   */
  private async sendBatch(events: AnalyticsEvent[]): Promise<boolean> {
    let attempts = 0;

    while (attempts < this.config.retryAttempts) {
      try {
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
        });

        if (response.ok) {
          if (this.config.debug) {
            console.log(`[Analytics] Sent ${events.length} events`);
          }
          return true;
        }

        console.warn(`[Analytics] Server returned ${response.status}`);
      } catch (error) {
        console.warn('[Analytics] Send failed:', error);
      }

      attempts++;
      if (attempts < this.config.retryAttempts) {
        await this.sleep(1000 * attempts); // 指数退避
      }
    }

    return false;
  }

  // ============================================
  // 离线存储
  // ============================================

  /**
   * 保存队列到离线存储
   */
  private saveOfflineQueue(): void {
    if (!this.storage) return;

    try {
      this.storage.setItem(
        this.config.offlineStorageKey,
        JSON.stringify(this.queue)
      );
    } catch (error) {
      console.warn('[Analytics] Failed to save offline queue:', error);
    }
  }

  /**
   * 加载离线队列
   */
  private loadOfflineQueue(): void {
    if (!this.storage) return;

    try {
      const saved = this.storage.getItem(this.config.offlineStorageKey);
      if (saved) {
        const events = JSON.parse(saved) as AnalyticsEvent[];
        this.queue.unshift(...events);
        this.storage.removeItem(this.config.offlineStorageKey);

        if (this.config.debug) {
          console.log(`[Analytics] Loaded ${events.length} offline events`);
        }
      }
    } catch (error) {
      console.warn('[Analytics] Failed to load offline queue:', error);
    }
  }

  // ============================================
  // 定时器管理
  // ============================================

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * 停止定时刷新
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // 保存未发送的事件
    this.saveOfflineQueue();
  }

  // ============================================
  // 工具方法
  // ============================================

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * 启用/禁用
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (enabled) {
      this.startFlushTimer();
    } else {
      this.stop();
    }
  }

  /**
   * 设置调试模式
   */
  setDebug(debug: boolean): void {
    this.config.debug = debug;
  }
}

// ============================================
// 单例实例
// ============================================

let _analyticsInstance: AnalyticsManager | null = null;

export function getAnalyticsManager(): AnalyticsManager {
  if (!_analyticsInstance) {
    _analyticsInstance = new AnalyticsManager();
  }
  return _analyticsInstance;
}

export function initAnalytics(config: Partial<AnalyticsConfig> = {}): AnalyticsManager {
  _analyticsInstance = new AnalyticsManager(config);
  return _analyticsInstance;
}

export function resetAnalytics(): void {
  if (_analyticsInstance) {
    _analyticsInstance.stop();
  }
  _analyticsInstance = null;
}
