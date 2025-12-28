import { _decorator, Component, sys } from 'cc';
import {
  AnalyticsManager,
  getAnalyticsManager,
  initAnalytics,
  ANALYTICS_EVENTS,
  LevelStartData,
  LevelEndData,
  AdWatchData
} from '../../../src/core/Analytics';
import { getConsentManager } from '../privacy/ConsentManager';

const { ccclass, property } = _decorator;

/**
 * 平台类型
 */
type Platform = 'weixin' | 'douyin' | 'web' | 'unknown';

/**
 * 微信/抖音上报数据
 */
interface WxReportData {
  key: string;
  value: number;
}

/**
 * AnalyticsTracker - Cocos 埋点组件
 * 封装核心 AnalyticsManager，添加平台适配和隐私合规
 */
@ccclass('AnalyticsTracker')
export class AnalyticsTracker extends Component {
  private static _instance: AnalyticsTracker | null = null;

  // ============================================
  // 配置
  // ============================================

  @property
  endpoint: string = '/api/analytics';

  @property
  debug: boolean = false;

  @property
  enablePlatformTracking: boolean = true;

  // ============================================
  // 状态
  // ============================================

  private manager: AnalyticsManager | null = null;
  private platform: Platform = 'unknown';
  private isEnabled: boolean = true;

  // 关卡状态跟踪
  private currentLevel: number = 0;
  private levelStartTime: number = 0;
  private moveCount: number = 0;
  private cascadeCount: number = 0;
  private shuffleCount: number = 0;
  private specialsCreated: number = 0;
  private specialsTriggered: number = 0;

  // ============================================
  // 单例
  // ============================================

  static getInstance(): AnalyticsTracker | null {
    return AnalyticsTracker._instance;
  }

  onLoad() {
    if (AnalyticsTracker._instance && AnalyticsTracker._instance !== this) {
      this.destroy();
      return;
    }
    AnalyticsTracker._instance = this;

    this.detectPlatform();
    this.initializeManager();
    this.checkConsentAndEnable();
  }

  onDestroy() {
    if (AnalyticsTracker._instance === this) {
      AnalyticsTracker._instance = null;
    }

    if (this.manager) {
      this.manager.endSession();
      this.manager.stop();
    }
  }

  // ============================================
  // 初始化
  // ============================================

  private detectPlatform() {
    if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
      this.platform = 'weixin';
    } else if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
      this.platform = 'douyin';
    } else if (sys.isBrowser) {
      this.platform = 'web';
    } else {
      this.platform = 'unknown';
    }

    console.log(`[Analytics] Platform: ${this.platform}`);
  }

  private initializeManager() {
    this.manager = initAnalytics({
      endpoint: this.endpoint,
      debug: this.debug,
      enabled: this.isEnabled,
    });

    // 设置玩家 ID
    const playerId = this.getOrCreatePlayerId();
    this.manager.setPlayerId(playerId);

    // 开始会话
    this.manager.startSession();
  }

  private checkConsentAndEnable() {
    const consent = getConsentManager();
    if (!consent) {
      this.isEnabled = true;
      return;
    }

    // 检查用户同意状态
    const status = consent.getConsentStatus();
    this.isEnabled = status.analytics;

    if (this.manager) {
      this.manager.setEnabled(this.isEnabled);
    }

    // 监听同意状态变化
    consent.onConsentChange((newStatus) => {
      this.isEnabled = newStatus.analytics;
      if (this.manager) {
        this.manager.setEnabled(this.isEnabled);
      }
    });
  }

  private getOrCreatePlayerId(): string {
    const key = 'lanternleaf_player_id';
    let playerId = localStorage.getItem(key);

    if (!playerId) {
      playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, playerId);
    }

    return playerId;
  }

  // ============================================
  // 公共 API - 关卡事件
  // ============================================

  /**
   * 记录关卡开始
   */
  trackLevelStart(data: LevelStartData) {
    if (!this.isEnabled || !this.manager) return;

    this.currentLevel = data.level;
    this.levelStartTime = Date.now();
    this.moveCount = 0;
    this.cascadeCount = 0;
    this.shuffleCount = 0;
    this.specialsCreated = 0;
    this.specialsTriggered = 0;

    this.manager.trackLevelStart(data);

    // 平台上报
    this.reportToPlatform('level_start', { level: data.level });
  }

  /**
   * 记录关卡结束
   */
  trackLevelEnd(result: 'win' | 'lose' | 'quit', goalProgress: number, goalTotal: number, movesRemaining: number) {
    if (!this.isEnabled || !this.manager) return;

    const duration = (Date.now() - this.levelStartTime) / 1000;
    const movesUsed = this.moveCount;

    const data: LevelEndData = {
      level: this.currentLevel,
      result,
      movesUsed,
      movesRemaining,
      goalProgress,
      goalTotal,
      duration,
      cascadeCount: this.cascadeCount,
      shuffleCount: this.shuffleCount,
      specialsCreated: this.specialsCreated,
      specialsTriggered: this.specialsTriggered,
      retryCount: 0, // 需要外部提供
    };

    this.manager.trackLevelEnd(data);

    // 平台上报
    this.reportToPlatform('level_end', {
      level: this.currentLevel,
      result: result === 'win' ? 1 : 0,
    });

    // 重置状态
    this.currentLevel = 0;
    this.levelStartTime = 0;
  }

  // ============================================
  // 公共 API - 操作事件
  // ============================================

  /**
   * 记录交换操作
   */
  trackMove(from: { row: number; col: number }, to: { row: number; col: number }, matchCount: number) {
    if (!this.isEnabled || !this.manager) return;

    this.moveCount++;

    this.manager.trackMove({
      level: this.currentLevel,
      moveNumber: this.moveCount,
      fromRow: from.row,
      fromCol: from.col,
      toRow: to.row,
      toCol: to.col,
      matchCount,
      isCascade: false,
      isSpecial: false,
    });
  }

  /**
   * 记录连消
   */
  trackCascade(cascadeDepth: number, totalCleared: number) {
    if (!this.isEnabled || !this.manager) return;

    this.cascadeCount++;
    this.manager.trackCascade(this.currentLevel, cascadeDepth, totalCleared);
  }

  /**
   * 记录洗牌
   */
  trackShuffle() {
    if (!this.isEnabled || !this.manager) return;

    this.shuffleCount++;
    this.manager.trackShuffle(this.currentLevel, this.shuffleCount);
  }

  /**
   * 记录特殊块创建
   */
  trackSpecialCreated(type: string, position: { row: number; col: number }) {
    if (!this.isEnabled || !this.manager) return;

    this.specialsCreated++;
    this.manager.trackSpecialCreated(this.currentLevel, type, position);
  }

  /**
   * 记录特殊块触发
   */
  trackSpecialTriggered(type: string, clearedCount: number) {
    if (!this.isEnabled || !this.manager) return;

    this.specialsTriggered++;
    this.manager.trackSpecialTriggered(this.currentLevel, type, clearedCount);
  }

  // ============================================
  // 公共 API - 体力/广告事件
  // ============================================

  /**
   * 记录体力消耗
   */
  trackEnergyConsumed(remaining: number) {
    if (!this.isEnabled || !this.manager) return;

    this.manager.trackEnergyConsumed(this.currentLevel, remaining);
  }

  /**
   * 记录体力恢复
   */
  trackEnergyRecovered(source: 'natural' | 'ad' | 'purchase', amount: number) {
    if (!this.isEnabled || !this.manager) return;

    this.manager.trackEnergyRecovered(source, amount);
  }

  /**
   * 记录广告观看
   */
  trackAdWatched(data: AdWatchData) {
    if (!this.isEnabled || !this.manager) return;

    this.manager.trackAdWatched(data);

    // 平台上报
    if (data.result === 'completed') {
      this.reportToPlatform('ad_completed', { placement: data.placement });
    }
  }

  /**
   * 记录广告失败
   */
  trackAdFailed(adType: string, error: string) {
    if (!this.isEnabled || !this.manager) return;

    this.manager.trackAdFailed(adType, error);
  }

  /**
   * 记录体力门显示
   */
  trackEnergyGateShown() {
    if (!this.isEnabled || !this.manager) return;

    this.manager.trackEnergyGateShown(this.currentLevel);
  }

  /**
   * 记录体力门关闭
   */
  trackEnergyGateClosed(action: 'watch_ad' | 'wait' | 'close') {
    if (!this.isEnabled || !this.manager) return;

    this.manager.trackEnergyGateClosed(this.currentLevel, action);
  }

  // ============================================
  // 公共 API - UI 事件
  // ============================================

  /**
   * 记录按钮点击
   */
  trackButtonClick(buttonId: string, context?: string) {
    if (!this.isEnabled || !this.manager) return;

    this.manager.trackButtonClick(buttonId, context);
  }

  /**
   * 记录道具使用
   */
  trackBoosterUsed(boosterType: string, source: string) {
    if (!this.isEnabled || !this.manager) return;

    this.manager.track(ANALYTICS_EVENTS.BUTTON_CLICK, {
      buttonId: `booster_${boosterType}`,
      context: `source_${source}`,
    });

    // 平台上报
    this.reportToPlatform('booster_used', { type: boosterType });
  }

  // ============================================
  // 平台上报
  // ============================================

  private reportToPlatform(key: string, data: Record<string, any>) {
    if (!this.enablePlatformTracking) return;

    switch (this.platform) {
      case 'weixin':
        this.reportToWeixin(key, data);
        break;
      case 'douyin':
        this.reportToDouyin(key, data);
        break;
      default:
        // Web 或其他平台，使用标准上报
        break;
    }
  }

  private reportToWeixin(key: string, data: Record<string, any>) {
    try {
      if (typeof wx !== 'undefined' && wx.reportEvent) {
        wx.reportEvent(key, data);
      }
    } catch (e) {
      console.warn('[Analytics] WeChat report failed:', e);
    }
  }

  private reportToDouyin(key: string, data: Record<string, any>) {
    try {
      if (typeof tt !== 'undefined' && tt.reportAnalytics) {
        tt.reportAnalytics(key, data);
      }
    } catch (e) {
      console.warn('[Analytics] Douyin report failed:', e);
    }
  }

  // ============================================
  // 工具方法
  // ============================================

  /**
   * 手动刷新上报
   */
  async flush(): Promise<boolean> {
    if (!this.manager) return false;
    return this.manager.flush();
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.manager?.getQueueLength() || 0;
  }

  /**
   * 设置调试模式
   */
  setDebug(debug: boolean) {
    this.debug = debug;
    if (this.manager) {
      this.manager.setDebug(debug);
    }
  }

  /**
   * 获取当前平台
   */
  getPlatform(): Platform {
    return this.platform;
  }
}

// ============================================
// 便捷函数
// ============================================

export function getAnalyticsTracker(): AnalyticsTracker | null {
  return AnalyticsTracker.getInstance();
}

// 声明微信/抖音全局对象
declare const wx: any;
declare const tt: any;
