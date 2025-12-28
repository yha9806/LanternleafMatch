/**
 * RetentionSystem - 留存系统集成
 * 连接连胜、预置道具、迷你游戏
 */

import { WinStreakManager, createWinStreakManager, StreakEvent } from './WinStreakManager';
import { PreBoosterManager, createPreBoosterManager, PreBoosterType } from './PreBoosterManager';
import {
  MiniGameManager,
  getMiniGameManager,
  MiniGameEvent,
  MiniGameResult,
} from '../minigames/MiniGameManager';

// ============================================
// 类型定义
// ============================================

export interface RetentionConfig {
  featureFlags: {
    winStreak: boolean;
    preBoosters: boolean;
    miniGames: boolean;
    streakRevival: boolean;
    smartRecommendation: boolean;
  };
}

export interface RetentionEvent {
  type: 'streak' | 'booster' | 'minigame' | 'reward';
  subtype: string;
  data: any;
  timestamp: number;
}

export interface RetentionStats {
  streak: {
    current: number;
    max: number;
    totalWins: number;
  };
  boosters: {
    totalUsed: number;
    totalPurchased: number;
    totalFree: number;
  };
  miniGames: {
    totalPlayed: number;
    totalWon: number;
    favorite: string | null;
  };
  rewards: {
    totalCoins: number;
    totalGems: number;
    totalBoosters: number;
  };
}

// ============================================
// RetentionSystem 类
// ============================================

export class RetentionSystem {
  private config: RetentionConfig;
  private streakManager: WinStreakManager;
  private boosterManager: PreBoosterManager;
  private miniGameManager: MiniGameManager;
  private listeners: Array<(event: RetentionEvent) => void> = [];
  private stats: RetentionStats;

  constructor(config?: Partial<RetentionConfig>) {
    this.config = {
      featureFlags: {
        winStreak: true,
        preBoosters: true,
        miniGames: true,
        streakRevival: true,
        smartRecommendation: true,
        ...config?.featureFlags,
      },
    };

    this.streakManager = createWinStreakManager();
    this.boosterManager = createPreBoosterManager();
    this.miniGameManager = getMiniGameManager();

    this.stats = this.loadStats();
    this.setupEventForwarding();
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 获取配置
   */
  getConfig(): RetentionConfig {
    return this.config;
  }

  /**
   * 获取统计数据
   */
  getStats(): RetentionStats {
    return { ...this.stats };
  }

  /**
   * 获取连胜管理器
   */
  getStreakManager(): WinStreakManager {
    return this.streakManager;
  }

  /**
   * 获取道具管理器
   */
  getBoosterManager(): PreBoosterManager {
    return this.boosterManager;
  }

  /**
   * 获取迷你游戏管理器
   */
  getMiniGameManager(): MiniGameManager {
    return this.miniGameManager;
  }

  // ============================================
  // 关卡流程集成
  // ============================================

  /**
   * 关卡开始前 - 获取可用预置道具
   */
  onLevelStart(levelIndex: number): {
    availableBoosters: any[];
    freeBoosters: PreBoosterType[];
    recommendation: any | null;
  } {
    if (!this.config.featureFlags.preBoosters) {
      return { availableBoosters: [], freeBoosters: [], recommendation: null };
    }

    const availableBoosters = this.boosterManager.getAvailableBoosters(levelIndex);

    // 从连胜获取免费道具
    const freeBoosters: PreBoosterType[] = [];
    if (this.config.featureFlags.winStreak) {
      const streakBoosters = this.streakManager.getPreBoosters();
      for (const reward of streakBoosters) {
        if (reward.type) {
          freeBoosters.push(reward.type as PreBoosterType);
        }
      }
    }

    // 智能推荐
    let recommendation = null;
    if (this.config.featureFlags.smartRecommendation) {
      recommendation = this.boosterManager.getRecommendation(levelIndex);
    }

    return { availableBoosters, freeBoosters, recommendation };
  }

  /**
   * 关卡通关 - 处理连胜和触发迷你游戏
   */
  onLevelWin(levelIndex: number): {
    streakReward: any;
    shouldTriggerMiniGame: boolean;
    miniGameType: string | null;
  } {
    let streakReward = null;
    let shouldTriggerMiniGame = false;
    let miniGameType: string | null = null;

    // 更新连胜
    if (this.config.featureFlags.winStreak) {
      streakReward = this.streakManager.onLevelWin(levelIndex);

      // 更新统计
      this.stats.rewards.totalCoins += streakReward.coins || 0;
      this.stats.rewards.totalGems += streakReward.gems || 0;
      if (streakReward.booster) {
        this.stats.rewards.totalBoosters++;
      }

      this.emitEvent({
        type: 'streak',
        subtype: 'level_win',
        data: streakReward,
        timestamp: Date.now(),
      });
    }

    // 检查是否触发迷你游戏
    if (this.config.featureFlags.miniGames) {
      const currentStreak = this.streakManager.getCurrentStreak();

      // 基于关卡触发
      const levelTrigger = this.miniGameManager.shouldTrigger({
        type: 'level_complete',
        condition: { levelIndex },
      });

      // 基于连胜触发
      const streakTrigger = this.miniGameManager.shouldTrigger({
        type: 'streak',
        condition: { streakCount: currentStreak },
      });

      if (levelTrigger || streakTrigger) {
        miniGameType = this.miniGameManager.trigger({
          type: streakTrigger ? 'streak' : 'level_complete',
          condition: { levelIndex, streakCount: currentStreak },
        });
        shouldTriggerMiniGame = miniGameType !== null;
      }
    }

    this.saveStats();

    return { streakReward, shouldTriggerMiniGame, miniGameType };
  }

  /**
   * 关卡失败 - 处理连胜丢失和复活选项
   */
  onLevelFail(levelIndex: number): {
    streakLost: number;
    revivalOptions: any;
    recommendation: any | null;
  } {
    let streakLost = 0;
    let revivalOptions = null;
    let recommendation = null;

    if (this.config.featureFlags.winStreak) {
      const result = this.streakManager.onLevelFail();
      streakLost = result.previousStreak;
      revivalOptions = result.revivalOptions;

      this.emitEvent({
        type: 'streak',
        subtype: 'level_fail',
        data: { streakLost },
        timestamp: Date.now(),
      });
    }

    // 失败后推荐道具
    if (this.config.featureFlags.smartRecommendation) {
      recommendation = this.boosterManager.getRecommendation(levelIndex);
    }

    return { streakLost, revivalOptions, recommendation };
  }

  /**
   * 复活连胜（广告）
   */
  reviveStreakWithAd(): boolean {
    if (!this.config.featureFlags.streakRevival) return false;

    const success = this.streakManager.reviveWithAd();
    if (success) {
      this.emitEvent({
        type: 'streak',
        subtype: 'revival_ad',
        data: { streak: this.streakManager.getCurrentStreak() },
        timestamp: Date.now(),
      });
    }
    return success;
  }

  /**
   * 复活连胜（宝石）
   */
  reviveStreakWithGems(): number {
    if (!this.config.featureFlags.streakRevival) return 0;

    const cost = this.streakManager.reviveWithGems();
    if (cost > 0) {
      this.emitEvent({
        type: 'streak',
        subtype: 'revival_gems',
        data: { cost, streak: this.streakManager.getCurrentStreak() },
        timestamp: Date.now(),
      });
    }
    return cost;
  }

  /**
   * 完成迷你游戏
   */
  completeMiniGame(result: MiniGameResult): void {
    // 更新统计
    this.stats.miniGames.totalPlayed++;
    if (result.success) {
      this.stats.miniGames.totalWon++;
    }
    this.stats.rewards.totalCoins += result.coins;
    this.stats.rewards.totalGems += result.gems;
    this.stats.rewards.totalBoosters += result.boosters.length;

    this.emitEvent({
      type: 'minigame',
      subtype: 'complete',
      data: result,
      timestamp: Date.now(),
    });

    this.saveStats();
  }

  // ============================================
  // 事件系统
  // ============================================

  /**
   * 监听留存事件
   */
  onEvent(listener: (event: RetentionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emitEvent(event: RetentionEvent): void {
    // 发送分析事件
    this.sendAnalytics(event);

    // 通知监听者
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[RetentionSystem] Listener error:', e);
      }
    }
  }

  private sendAnalytics(event: RetentionEvent): void {
    // TODO: 集成实际的分析 SDK
    console.log('[Analytics]', event.type, event.subtype, event.data);
  }

  // ============================================
  // 内部方法
  // ============================================

  private setupEventForwarding(): void {
    // 转发连胜事件
    this.streakManager.onEvent((e: StreakEvent) => {
      this.emitEvent({
        type: 'streak',
        subtype: e.type,
        data: e,
        timestamp: Date.now(),
      });
    });

    // 转发迷你游戏事件
    this.miniGameManager.onEvent((e: MiniGameEvent) => {
      this.emitEvent({
        type: 'minigame',
        subtype: e.type,
        data: e,
        timestamp: Date.now(),
      });
    });
  }

  private loadStats(): RetentionStats {
    try {
      const saved = localStorage.getItem('lanternleaf_retention_stats');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[RetentionSystem] Failed to load stats:', e);
    }

    return {
      streak: { current: 0, max: 0, totalWins: 0 },
      boosters: { totalUsed: 0, totalPurchased: 0, totalFree: 0 },
      miniGames: { totalPlayed: 0, totalWon: 0, favorite: null },
      rewards: { totalCoins: 0, totalGems: 0, totalBoosters: 0 },
    };
  }

  private saveStats(): void {
    try {
      // 同步连胜数据
      this.stats.streak.current = this.streakManager.getCurrentStreak();
      this.stats.streak.max = this.streakManager.getMaxStreak();

      localStorage.setItem('lanternleaf_retention_stats', JSON.stringify(this.stats));
    } catch (e) {
      console.warn('[RetentionSystem] Failed to save stats:', e);
    }
  }
}

// ============================================
// 单例与工厂
// ============================================

let systemInstance: RetentionSystem | null = null;

/**
 * 获取 RetentionSystem 单例
 */
export function getRetentionSystem(config?: Partial<RetentionConfig>): RetentionSystem {
  if (!systemInstance) {
    systemInstance = new RetentionSystem(config);
  }
  return systemInstance;
}

/**
 * 创建新的 RetentionSystem 实例（测试用）
 */
export function createRetentionSystem(config?: Partial<RetentionConfig>): RetentionSystem {
  return new RetentionSystem(config);
}

/**
 * 重置单例（测试用）
 */
export function resetRetentionSystem(): void {
  systemInstance = null;
}
