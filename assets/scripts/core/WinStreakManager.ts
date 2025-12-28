/**
 * WinStreakManager - 连胜系统管理器
 * 追踪玩家连续通关次数，提供递增奖励和复活机制
 */

// ============================================
// 类型定义
// ============================================

export interface StreakReward {
  coins: number;
  gems: number;
  preBoosters: PreBoosterReward[];
}

export interface PreBoosterReward {
  type: 'rocket' | 'bomb' | 'rainbow' | 'super_rainbow';
  count: number;
}

export interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastWinTime: number;
  lastLevelIndex: number;
  revivalsToday: number;
  lastRevivalTime: number;
}

export interface RevivalOptions {
  canRevive: boolean;
  adAvailable: boolean;
  gemCost: number;
  reason?: string;
}

export type StreakEventType =
  | 'streak_incremented'
  | 'streak_reset'
  | 'streak_revived'
  | 'milestone_reached';

export interface StreakEvent {
  type: StreakEventType;
  streak: number;
  previousStreak?: number;
  reward?: StreakReward;
  milestone?: number;
}

// ============================================
// 常量
// ============================================

const STORAGE_KEY = 'lanternleaf_win_streak';
const MAX_REVIVALS_PER_HOUR = 3;
const REVIVAL_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// 连胜奖励配置
const STREAK_REWARDS: { [threshold: number]: { coins: number; gems: number } } = {
  1: { coins: 20, gems: 0 },
  2: { coins: 40, gems: 0 },
  3: { coins: 80, gems: 0 },
  4: { coins: 100, gems: 0 },
  5: { coins: 150, gems: 1 },
  6: { coins: 180, gems: 0 },
  7: { coins: 220, gems: 2 },
  8: { coins: 250, gems: 0 },
  9: { coins: 250, gems: 0 },
  10: { coins: 300, gems: 3 },
};

// 连胜预置道具配置
const STREAK_BOOSTERS: { [threshold: number]: PreBoosterReward[] } = {
  3: [{ type: 'rocket', count: 1 }],
  5: [{ type: 'rocket', count: 1 }, { type: 'bomb', count: 1 }],
  7: [{ type: 'rocket', count: 1 }, { type: 'bomb', count: 1 }, { type: 'rainbow', count: 1 }],
  10: [
    { type: 'rocket', count: 1 },
    { type: 'bomb', count: 1 },
    { type: 'rainbow', count: 1 },
    { type: 'super_rainbow', count: 1 },
  ],
};

// 连胜里程碑
const MILESTONES = [3, 5, 7, 10];

// ============================================
// WinStreakManager 类
// ============================================

export class WinStreakManager {
  private data: StreakData;
  private listeners: Array<(event: StreakEvent) => void> = [];

  constructor() {
    this.data = this.loadData();
    this.checkDailyReset();
  }

  // ============================================
  // 公共 API - 查询
  // ============================================

  /**
   * 获取当前连胜数
   */
  getCurrentStreak(): number {
    return this.data.currentStreak;
  }

  /**
   * 获取历史最高连胜
   */
  getMaxStreak(): number {
    return this.data.maxStreak;
  }

  /**
   * 获取当前连胜的奖励
   */
  getCurrentReward(): StreakReward {
    return this.calculateReward(this.data.currentStreak);
  }

  /**
   * 获取下一关的预置道具（基于当前连胜）
   */
  getPreBoosters(): PreBoosterReward[] {
    const streak = this.data.currentStreak;

    // 找到最高适用的阈值
    let boosters: PreBoosterReward[] = [];
    for (const threshold of Object.keys(STREAK_BOOSTERS).map(Number).sort((a, b) => b - a)) {
      if (streak >= threshold) {
        boosters = STREAK_BOOSTERS[threshold];
        break;
      }
    }

    return boosters;
  }

  /**
   * 获取下一个里程碑
   */
  getNextMilestone(): number | null {
    for (const milestone of MILESTONES) {
      if (this.data.currentStreak < milestone) {
        return milestone;
      }
    }
    return null;
  }

  /**
   * 获取到下一个里程碑的进度 (0-1)
   */
  getMilestoneProgress(): number {
    const next = this.getNextMilestone();
    if (!next) return 1;

    const prev = MILESTONES[MILESTONES.indexOf(next) - 1] || 0;
    const current = this.data.currentStreak;

    return (current - prev) / (next - prev);
  }

  // ============================================
  // 公共 API - 操作
  // ============================================

  /**
   * 记录关卡通关
   */
  onLevelWin(levelIndex: number): StreakReward {
    const previousStreak = this.data.currentStreak;
    this.data.currentStreak++;
    this.data.lastWinTime = Date.now();
    this.data.lastLevelIndex = levelIndex;

    // 更新最高记录
    if (this.data.currentStreak > this.data.maxStreak) {
      this.data.maxStreak = this.data.currentStreak;
    }

    this.saveData();

    const reward = this.calculateReward(this.data.currentStreak);

    // 触发事件
    this.emitEvent({
      type: 'streak_incremented',
      streak: this.data.currentStreak,
      previousStreak,
      reward,
    });

    // 检查里程碑
    if (MILESTONES.includes(this.data.currentStreak)) {
      this.emitEvent({
        type: 'milestone_reached',
        streak: this.data.currentStreak,
        milestone: this.data.currentStreak,
        reward,
      });
    }

    return reward;
  }

  /**
   * 记录关卡失败
   */
  onLevelFail(): { previousStreak: number; revivalOptions: RevivalOptions } {
    const previousStreak = this.data.currentStreak;
    const revivalOptions = this.getRevivalOptions();

    return { previousStreak, revivalOptions };
  }

  /**
   * 获取复活选项
   */
  getRevivalOptions(): RevivalOptions {
    const streak = this.data.currentStreak;

    // 连胜不足3不提供复活
    if (streak < 3) {
      return {
        canRevive: false,
        adAvailable: false,
        gemCost: 0,
        reason: 'Streak too low',
      };
    }

    // 检查复活次数限制
    const now = Date.now();
    if (now - this.data.lastRevivalTime > REVIVAL_COOLDOWN_MS) {
      this.data.revivalsToday = 0;
    }

    const adAvailable = this.data.revivalsToday < MAX_REVIVALS_PER_HOUR;
    const gemCost = Math.min(50, streak * 5);

    return {
      canRevive: true,
      adAvailable,
      gemCost,
    };
  }

  /**
   * 使用广告复活连胜
   */
  reviveWithAd(): boolean {
    const options = this.getRevivalOptions();
    if (!options.canRevive || !options.adAvailable) {
      return false;
    }

    this.data.revivalsToday++;
    this.data.lastRevivalTime = Date.now();
    this.saveData();

    this.emitEvent({
      type: 'streak_revived',
      streak: this.data.currentStreak,
    });

    return true;
  }

  /**
   * 使用宝石复活连胜
   * @returns 需要的宝石数量，如果无法复活返回 -1
   */
  reviveWithGems(): number {
    const options = this.getRevivalOptions();
    if (!options.canRevive) {
      return -1;
    }

    this.emitEvent({
      type: 'streak_revived',
      streak: this.data.currentStreak,
    });

    return options.gemCost;
  }

  /**
   * 放弃连胜（不复活）
   */
  resetStreak(): void {
    const previousStreak = this.data.currentStreak;

    if (previousStreak > 0) {
      this.data.currentStreak = 0;
      this.saveData();

      this.emitEvent({
        type: 'streak_reset',
        streak: 0,
        previousStreak,
      });
    }
  }

  // ============================================
  // 事件系统
  // ============================================

  /**
   * 监听连胜事件
   */
  onStreakEvent(listener: (event: StreakEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emitEvent(event: StreakEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[WinStreakManager] Event listener error:', e);
      }
    }
  }

  // ============================================
  // 内部方法
  // ============================================

  private calculateReward(streak: number): StreakReward {
    // 找到适用的奖励等级
    let coins = 0;
    let gems = 0;

    for (const threshold of Object.keys(STREAK_REWARDS).map(Number).sort((a, b) => b - a)) {
      if (streak >= threshold) {
        const reward = STREAK_REWARDS[threshold];
        coins = reward.coins;
        gems = reward.gems;
        break;
      }
    }

    // 10连胜以上保持最高奖励
    if (streak >= 10) {
      coins = STREAK_REWARDS[10].coins;
      gems = STREAK_REWARDS[10].gems;
    }

    const preBoosters = this.getPreBoosters();

    return { coins, gems, preBoosters };
  }

  private loadData(): StreakData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[WinStreakManager] Failed to load data:', e);
    }

    return this.createDefaultData();
  }

  private createDefaultData(): StreakData {
    return {
      currentStreak: 0,
      maxStreak: 0,
      lastWinTime: 0,
      lastLevelIndex: 0,
      revivalsToday: 0,
      lastRevivalTime: 0,
    };
  }

  private saveData(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[WinStreakManager] Failed to save data:', e);
    }
  }

  private checkDailyReset(): void {
    // 每日重置复活次数（通过检查时间差自动处理）
    const now = Date.now();
    if (now - this.data.lastRevivalTime > REVIVAL_COOLDOWN_MS) {
      this.data.revivalsToday = 0;
    }
  }

  // ============================================
  // 调试/测试
  // ============================================

  /**
   * 获取完整状态（用于调试）
   */
  getDebugState(): StreakData {
    return { ...this.data };
  }

  /**
   * 设置连胜数（仅用于测试）
   */
  setStreakForTesting(streak: number): void {
    this.data.currentStreak = streak;
    this.saveData();
  }

  /**
   * 清除所有数据（仅用于测试）
   */
  clearData(): void {
    this.data = this.createDefaultData();
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ============================================
// 单例实例
// ============================================

let _instance: WinStreakManager | null = null;

export function getWinStreakManager(): WinStreakManager {
  if (!_instance) {
    _instance = new WinStreakManager();
  }
  return _instance;
}

export function resetWinStreakManager(): void {
  _instance = null;
}
