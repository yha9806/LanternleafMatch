/**
 * MiniGameManager - 迷你游戏调度管理器
 * 负责触发时机、随机选择、奖励发放
 */

import { RescueMiniGame, RescueResult, createRescueMiniGame } from './RescueMiniGame';
import { ColorSortMiniGame, ColorSortResult, createColorSortMiniGame, getRecommendedDifficulty } from './ColorSortMiniGame';
import { TreasureHuntMiniGame, TreasureHuntResult, createTreasureHuntMiniGame, getTreasureHuntConfigForLevel } from './TreasureHuntMiniGame';

// ============================================
// 类型定义
// ============================================

export type MiniGameType = 'rescue' | 'color_sort' | 'treasure_hunt';

export interface MiniGameTrigger {
  type: 'level_complete' | 'streak' | 'daily' | 'special_event';
  condition: {
    levelIndex?: number;
    streakCount?: number;
    dayOfWeek?: number;
    eventId?: string;
  };
}

export interface MiniGameSession {
  id: string;
  type: MiniGameType;
  startTime: number;
  endTime?: number;
  trigger: MiniGameTrigger;
  result?: MiniGameResult;
}

export interface MiniGameResult {
  type: MiniGameType;
  success: boolean;
  coins: number;
  gems: number;
  boosters: string[];
  rawResult: RescueResult | ColorSortResult | TreasureHuntResult;
}

export interface MiniGameManagerConfig {
  triggerChance: number; // 0-1, 触发概率
  cooldownMinutes: number; // 冷却时间
  weights: Record<MiniGameType, number>; // 各游戏权重
  streakThreshold: number; // 连胜多少次触发
  levelInterval: number; // 每隔多少关触发
}

export interface MiniGameManagerState {
  lastPlayedTime: number;
  totalPlayed: number;
  typeStats: Record<MiniGameType, { played: number; won: number }>;
  currentSession: MiniGameSession | null;
}

export interface MiniGameEvent {
  type: 'trigger' | 'start' | 'complete' | 'skip';
  gameType?: MiniGameType;
  session?: MiniGameSession;
  result?: MiniGameResult;
}

// ============================================
// 常量
// ============================================

const DEFAULT_CONFIG: MiniGameManagerConfig = {
  triggerChance: 0.3, // 30% 基础触发率
  cooldownMinutes: 30, // 30 分钟冷却
  weights: {
    rescue: 40,
    color_sort: 35,
    treasure_hunt: 25,
  },
  streakThreshold: 5, // 5 连胜必触发
  levelInterval: 5, // 每 5 关可能触发
};

const STORAGE_KEY = 'lanternleaf_minigame_state';

// ============================================
// MiniGameManager 类
// ============================================

export class MiniGameManager {
  private config: MiniGameManagerConfig;
  private state: MiniGameManagerState;
  private currentGame: RescueMiniGame | ColorSortMiniGame | TreasureHuntMiniGame | null = null;
  private listeners: Array<(event: MiniGameEvent) => void> = [];

  constructor(config?: Partial<MiniGameManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.loadState();
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 获取当前状态
   */
  getState(): MiniGameManagerState {
    return { ...this.state };
  }

  /**
   * 获取统计数据
   */
  getStats(): {
    totalPlayed: number;
    totalWon: number;
    winRate: number;
    favoriteGame: MiniGameType | null;
  } {
    const totalWon = Object.values(this.state.typeStats).reduce((sum, s) => sum + s.won, 0);
    const winRate = this.state.totalPlayed > 0 ? totalWon / this.state.totalPlayed : 0;

    let favoriteGame: MiniGameType | null = null;
    let maxPlayed = 0;
    for (const [type, stats] of Object.entries(this.state.typeStats)) {
      if (stats.played > maxPlayed) {
        maxPlayed = stats.played;
        favoriteGame = type as MiniGameType;
      }
    }

    return {
      totalPlayed: this.state.totalPlayed,
      totalWon,
      winRate,
      favoriteGame,
    };
  }

  /**
   * 检查是否应该触发迷你游戏
   */
  shouldTrigger(trigger: MiniGameTrigger): boolean {
    // 检查冷却时间
    const now = Date.now();
    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    if (now - this.state.lastPlayedTime < cooldownMs) {
      return false;
    }

    // 检查是否已有进行中的游戏
    if (this.state.currentSession) {
      return false;
    }

    // 根据触发类型判断
    switch (trigger.type) {
      case 'level_complete':
        // 每隔 N 关有机会触发
        if (trigger.condition.levelIndex && trigger.condition.levelIndex % this.config.levelInterval === 0) {
          return Math.random() < this.config.triggerChance;
        }
        return false;

      case 'streak':
        // 达到连胜阈值必触发
        if (trigger.condition.streakCount && trigger.condition.streakCount >= this.config.streakThreshold) {
          return true;
        }
        return false;

      case 'daily':
        // 每日首次登录触发
        return Math.random() < this.config.triggerChance * 1.5; // 提高概率

      case 'special_event':
        // 特殊事件必触发
        return true;

      default:
        return false;
    }
  }

  /**
   * 触发迷你游戏
   */
  trigger(trigger: MiniGameTrigger, preferredType?: MiniGameType): MiniGameType | null {
    if (!this.shouldTrigger(trigger)) {
      return null;
    }

    const gameType = preferredType || this.selectRandomGame();

    // 创建会话
    const session: MiniGameSession = {
      id: `mg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: gameType,
      startTime: Date.now(),
      trigger,
    };

    this.state.currentSession = session;
    this.saveState();

    this.emitEvent({
      type: 'trigger',
      gameType,
      session,
    });

    return gameType;
  }

  /**
   * 开始迷你游戏
   */
  startGame(playerLevel: number = 1): RescueMiniGame | ColorSortMiniGame | TreasureHuntMiniGame | null {
    if (!this.state.currentSession) {
      return null;
    }

    const { type } = this.state.currentSession;

    switch (type) {
      case 'rescue':
        this.currentGame = createRescueMiniGame();
        break;

      case 'color_sort':
        const difficulty = getRecommendedDifficulty(playerLevel);
        this.currentGame = createColorSortMiniGame(difficulty);
        break;

      case 'treasure_hunt':
        const config = getTreasureHuntConfigForLevel(playerLevel);
        this.currentGame = createTreasureHuntMiniGame(config);
        break;

      default:
        return null;
    }

    this.emitEvent({
      type: 'start',
      gameType: type,
      session: this.state.currentSession,
    });

    return this.currentGame;
  }

  /**
   * 完成迷你游戏
   */
  completeGame(rawResult: RescueResult | ColorSortResult | TreasureHuntResult): MiniGameResult | null {
    if (!this.state.currentSession) {
      return null;
    }

    const { type } = this.state.currentSession;

    // 解析结果
    const result = this.parseResult(type, rawResult);

    // 更新会话
    this.state.currentSession.endTime = Date.now();
    this.state.currentSession.result = result;

    // 更新统计
    this.state.totalPlayed++;
    this.state.lastPlayedTime = Date.now();

    if (!this.state.typeStats[type]) {
      this.state.typeStats[type] = { played: 0, won: 0 };
    }
    this.state.typeStats[type].played++;
    if (result.success) {
      this.state.typeStats[type].won++;
    }

    // 清理当前会话
    const completedSession = this.state.currentSession;
    this.state.currentSession = null;
    this.currentGame = null;

    this.saveState();

    this.emitEvent({
      type: 'complete',
      gameType: type,
      session: completedSession,
      result,
    });

    return result;
  }

  /**
   * 跳过当前迷你游戏
   */
  skipGame(): void {
    if (!this.state.currentSession) {
      return;
    }

    const session = this.state.currentSession;
    this.state.currentSession = null;
    this.currentGame?.destroy();
    this.currentGame = null;

    this.saveState();

    this.emitEvent({
      type: 'skip',
      gameType: session.type,
      session,
    });
  }

  /**
   * 获取当前游戏实例
   */
  getCurrentGame(): RescueMiniGame | ColorSortMiniGame | TreasureHuntMiniGame | null {
    return this.currentGame;
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): MiniGameSession | null {
    return this.state.currentSession;
  }

  /**
   * 重置状态（调试用）
   */
  reset(): void {
    this.state = {
      lastPlayedTime: 0,
      totalPlayed: 0,
      typeStats: {
        rescue: { played: 0, won: 0 },
        color_sort: { played: 0, won: 0 },
        treasure_hunt: { played: 0, won: 0 },
      },
      currentSession: null,
    };
    this.currentGame = null;
    this.saveState();
  }

  // ============================================
  // 事件系统
  // ============================================

  /**
   * 监听事件
   */
  onEvent(listener: (event: MiniGameEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emitEvent(event: MiniGameEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[MiniGameManager] Listener error:', e);
      }
    }
  }

  // ============================================
  // 内部方法
  // ============================================

  private selectRandomGame(): MiniGameType {
    const { weights } = this.config;
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (const [type, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return type as MiniGameType;
      }
    }

    return 'rescue'; // 默认
  }

  private parseResult(type: MiniGameType, rawResult: RescueResult | ColorSortResult | TreasureHuntResult): MiniGameResult {
    let coins = 0;
    let gems = 0;
    let boosters: string[] = [];
    let success = false;

    switch (type) {
      case 'rescue': {
        const r = rawResult as RescueResult;
        success = r.success;
        coins = r.reward.coins;
        gems = r.reward.gems || 0;
        if (r.reward.booster) {
          boosters.push(r.reward.booster);
        }
        break;
      }

      case 'color_sort': {
        const r = rawResult as ColorSortResult;
        success = r.success;
        coins = r.reward.coins;
        gems = r.reward.gems || 0;
        break;
      }

      case 'treasure_hunt': {
        const r = rawResult as TreasureHuntResult;
        success = r.found;
        coins = r.totalCoins;
        gems = r.totalGems;
        boosters = [...r.boosters];
        break;
      }
    }

    return {
      type,
      success,
      coins,
      gems,
      boosters,
      rawResult,
    };
  }

  private loadState(): MiniGameManagerState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[MiniGameManager] Failed to load state:', e);
    }

    return {
      lastPlayedTime: 0,
      totalPlayed: 0,
      typeStats: {
        rescue: { played: 0, won: 0 },
        color_sort: { played: 0, won: 0 },
        treasure_hunt: { played: 0, won: 0 },
      },
      currentSession: null,
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('[MiniGameManager] Failed to save state:', e);
    }
  }
}

// ============================================
// 单例与工厂
// ============================================

let managerInstance: MiniGameManager | null = null;

/**
 * 获取 MiniGameManager 单例
 */
export function getMiniGameManager(config?: Partial<MiniGameManagerConfig>): MiniGameManager {
  if (!managerInstance) {
    managerInstance = new MiniGameManager(config);
  }
  return managerInstance;
}

/**
 * 创建新的 MiniGameManager 实例（测试用）
 */
export function createMiniGameManager(config?: Partial<MiniGameManagerConfig>): MiniGameManager {
  return new MiniGameManager(config);
}

/**
 * 重置单例（测试用）
 */
export function resetMiniGameManager(): void {
  managerInstance = null;
}
