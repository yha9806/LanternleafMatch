import { _decorator, Component, Vec2 } from 'cc';
import {
  BoosterType,
  BoosterDef,
  BoosterInventory,
  BoosterUseResult,
  BoosterUsageRecord,
  getBoosterDef,
  getAllBoosterTypes,
  BOOSTER_DEFS
} from './BoosterTypes';
import { getRewardedAdManager } from '../ads/RewardedAdManager';

const { ccclass, property } = _decorator;

/**
 * 存储键
 */
const STORAGE_KEY_INVENTORY = 'lanternleaf_booster_inventory';
const STORAGE_KEY_DAILY_FREE = 'lanternleaf_booster_daily_free';
const STORAGE_KEY_USAGE_LOG = 'lanternleaf_booster_usage';

/**
 * 每日免费使用记录
 */
interface DailyFreeUsage {
  date: string;
  usage: { [type: string]: number };
}

/**
 * BoosterManager - 道具管理器
 * 管理道具库存、使用、购买、广告奖励
 */
@ccclass('BoosterManager')
export class BoosterManager extends Component {
  private static _instance: BoosterManager | null = null;

  // ============================================
  // 状态
  // ============================================

  private inventory: BoosterInventory = {};
  private dailyFreeUsage: DailyFreeUsage = { date: '', usage: {} };
  private usageLog: BoosterUsageRecord[] = [];

  private pendingBooster: BoosterType | null = null;
  private useCallback: ((result: BoosterUseResult) => void) | null = null;
  private listeners: Array<(event: BoosterEvent) => void> = [];

  // 新手保护
  private completedLevels: number = 0;
  private newbieThreshold: number = 10;

  // ============================================
  // 单例
  // ============================================

  static getInstance(): BoosterManager | null {
    return BoosterManager._instance;
  }

  onLoad() {
    if (BoosterManager._instance && BoosterManager._instance !== this) {
      this.destroy();
      return;
    }
    BoosterManager._instance = this;

    this.loadData();
    this.initNewbieBonus();
  }

  onDestroy() {
    if (BoosterManager._instance === this) {
      BoosterManager._instance = null;
    }
  }

  // ============================================
  // 公共 API - 库存
  // ============================================

  /**
   * 获取道具数量
   */
  getCount(type: BoosterType): number {
    return this.inventory[type] || 0;
  }

  /**
   * 获取所有道具库存
   */
  getInventory(): BoosterInventory {
    return { ...this.inventory };
  }

  /**
   * 增加道具
   */
  addBooster(type: BoosterType, count: number = 1, source: string = 'unknown') {
    this.inventory[type] = (this.inventory[type] || 0) + count;
    this.saveInventory();

    this.emitEvent({
      type: 'booster_added',
      boosterType: type,
      count,
      source,
      newTotal: this.inventory[type]
    });
  }

  /**
   * 消耗道具（内部使用）
   */
  private consumeBooster(type: BoosterType): boolean {
    if ((this.inventory[type] || 0) <= 0) {
      return false;
    }

    this.inventory[type]--;
    this.saveInventory();
    return true;
  }

  // ============================================
  // 公共 API - 使用道具
  // ============================================

  /**
   * 检查道具是否可用
   */
  canUseBooster(type: BoosterType): { available: boolean; source: 'inventory' | 'free' | 'ad' | 'none' } {
    // 检查库存
    if (this.getCount(type) > 0) {
      return { available: true, source: 'inventory' };
    }

    // 检查每日免费
    if (this.getDailyFreeRemaining(type) > 0) {
      return { available: true, source: 'free' };
    }

    // 检查广告
    const adManager = getRewardedAdManager();
    if (adManager && adManager.isAdAvailable('booster_reward')) {
      return { available: true, source: 'ad' };
    }

    return { available: false, source: 'none' };
  }

  /**
   * 获取每日免费剩余次数
   */
  getDailyFreeRemaining(type: BoosterType): number {
    this.checkAndResetDailyFree();

    const def = getBoosterDef(type);
    const used = this.dailyFreeUsage.usage[type] || 0;
    return Math.max(0, def.dailyFreeCount - used);
  }

  /**
   * 开始使用道具（需要选择目标的道具）
   */
  startUseBooster(type: BoosterType): { started: boolean; requiresTarget: boolean; targetType?: string } {
    const def = getBoosterDef(type);
    const { available, source } = this.canUseBooster(type);

    if (!available) {
      return { started: false, requiresTarget: false };
    }

    this.pendingBooster = type;

    this.emitEvent({
      type: 'booster_select_start',
      boosterType: type,
      source
    });

    return {
      started: true,
      requiresTarget: def.requiresTarget,
      targetType: def.targetType
    };
  }

  /**
   * 取消使用道具
   */
  cancelUseBooster() {
    if (this.pendingBooster) {
      this.emitEvent({
        type: 'booster_select_cancel',
        boosterType: this.pendingBooster
      });
      this.pendingBooster = null;
    }
  }

  /**
   * 确认使用道具（提供目标）
   */
  async confirmUseBooster(
    target?: Vec2 | number | string,
    levelIndex: number = 0
  ): Promise<BoosterUseResult> {
    if (!this.pendingBooster) {
      return {
        success: false,
        boosterType: 'hammer',
        tilesAffected: [],
        error: 'No pending booster'
      };
    }

    const type = this.pendingBooster;
    const def = getBoosterDef(type);
    this.pendingBooster = null;

    // 验证目标
    if (def.requiresTarget && target === undefined) {
      return {
        success: false,
        boosterType: type,
        tilesAffected: [],
        error: 'Target required'
      };
    }

    // 确定来源并消耗
    const { available, source } = this.canUseBooster(type);
    if (!available) {
      return {
        success: false,
        boosterType: type,
        tilesAffected: [],
        error: 'Booster not available'
      };
    }

    let actualSource: 'inventory' | 'free' | 'ad' | 'purchase' = source as any;

    if (source === 'inventory') {
      this.consumeBooster(type);
    } else if (source === 'free') {
      this.useDailyFree(type);
    } else if (source === 'ad') {
      // 需要先看广告
      const adManager = getRewardedAdManager();
      if (!adManager) {
        return {
          success: false,
          boosterType: type,
          tilesAffected: [],
          error: 'Ad not available'
        };
      }

      const adResult = await adManager.show('booster_reward');
      if (!adResult.rewarded) {
        return {
          success: false,
          boosterType: type,
          tilesAffected: [],
          error: adResult.error?.errMsg || 'Ad not completed'
        };
      }
      actualSource = 'ad';
    }

    // 记录使用
    this.logUsage(type, levelIndex, actualSource);

    // 返回成功，实际效果由 GameController 处理
    this.emitEvent({
      type: 'booster_used',
      boosterType: type,
      source: actualSource,
      target
    });

    return {
      success: true,
      boosterType: type,
      target,
      tilesAffected: [] // 由调用方填充
    };
  }

  /**
   * 直接使用道具（不需要选择目标的道具，如洗牌、提示）
   */
  async useBoosterDirect(type: BoosterType, levelIndex: number = 0): Promise<BoosterUseResult> {
    const def = getBoosterDef(type);

    if (def.requiresTarget) {
      return {
        success: false,
        boosterType: type,
        tilesAffected: [],
        error: 'This booster requires target selection'
      };
    }

    this.pendingBooster = type;
    return this.confirmUseBooster(undefined, levelIndex);
  }

  /**
   * 获取当前待使用的道具
   */
  getPendingBooster(): BoosterType | null {
    return this.pendingBooster;
  }

  // ============================================
  // 公共 API - 购买/奖励
  // ============================================

  /**
   * 通过广告获取道具
   */
  async getBoosterByAd(type: BoosterType): Promise<boolean> {
    const adManager = getRewardedAdManager();
    if (!adManager) return false;

    const result = await adManager.show('booster_reward');
    if (result.rewarded) {
      const def = getBoosterDef(type);
      this.addBooster(type, def.adRewardCount, 'ad');
      return true;
    }

    return false;
  }

  /**
   * 购买道具（IAP 或虚拟货币）
   */
  purchaseBooster(type: BoosterType, count: number = 1): boolean {
    // TODO: 对接实际支付系统
    // 这里模拟购买成功
    this.addBooster(type, count, 'purchase');
    return true;
  }

  /**
   * 获取道具价格
   */
  getBoosterPrice(type: BoosterType): number {
    return getBoosterDef(type).basePrice;
  }

  // ============================================
  // 公共 API - 事件监听
  // ============================================

  /**
   * 监听道具事件
   */
  onBoosterEvent(listener: (event: BoosterEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // ============================================
  // 内部方法 - 每日免费
  // ============================================

  private checkAndResetDailyFree() {
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyFreeUsage.date !== today) {
      this.dailyFreeUsage = { date: today, usage: {} };
      this.saveDailyFree();
    }
  }

  private useDailyFree(type: BoosterType): boolean {
    this.checkAndResetDailyFree();

    const def = getBoosterDef(type);
    const used = this.dailyFreeUsage.usage[type] || 0;

    if (used >= def.dailyFreeCount) {
      return false;
    }

    this.dailyFreeUsage.usage[type] = used + 1;
    this.saveDailyFree();
    return true;
  }

  // ============================================
  // 内部方法 - 新手奖励
  // ============================================

  private initNewbieBonus() {
    // 检查是否已初始化
    const initialized = localStorage.getItem('lanternleaf_newbie_booster_init');
    if (initialized) return;

    // 发放新手道具
    for (const type of getAllBoosterTypes()) {
      const def = BOOSTER_DEFS[type];
      if (def.newbieBonus > 0) {
        this.addBooster(type, def.newbieBonus, 'newbie');
      }
    }

    localStorage.setItem('lanternleaf_newbie_booster_init', 'true');
  }

  /**
   * 更新已完成关卡数（外部调用）
   */
  updateCompletedLevels(count: number) {
    this.completedLevels = count;
  }

  /**
   * 检查是否在新手保护期
   */
  isInNewbiePeriod(): boolean {
    return this.completedLevels < this.newbieThreshold;
  }

  // ============================================
  // 内部方法 - 使用记录
  // ============================================

  private logUsage(type: BoosterType, levelIndex: number, source: 'inventory' | 'ad' | 'free' | 'purchase') {
    const record: BoosterUsageRecord = {
      type,
      timestamp: Date.now(),
      levelIndex,
      source
    };

    this.usageLog.push(record);

    // 只保留最近 100 条
    if (this.usageLog.length > 100) {
      this.usageLog = this.usageLog.slice(-100);
    }

    this.saveUsageLog();
  }

  /**
   * 获取使用统计
   */
  getUsageStats(): { [type: string]: number } {
    const stats: { [type: string]: number } = {};
    for (const record of this.usageLog) {
      stats[record.type] = (stats[record.type] || 0) + 1;
    }
    return stats;
  }

  // ============================================
  // 内部方法 - 持久化
  // ============================================

  private loadData() {
    this.loadInventory();
    this.loadDailyFree();
    this.loadUsageLog();
  }

  private loadInventory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_INVENTORY);
      if (data) {
        this.inventory = JSON.parse(data);
      }
    } catch {
      this.inventory = {};
    }
  }

  private saveInventory() {
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(this.inventory));
    } catch {
      console.warn('[BoosterManager] Failed to save inventory');
    }
  }

  private loadDailyFree() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_DAILY_FREE);
      if (data) {
        this.dailyFreeUsage = JSON.parse(data);
      }
    } catch {
      this.dailyFreeUsage = { date: '', usage: {} };
    }
    this.checkAndResetDailyFree();
  }

  private saveDailyFree() {
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_FREE, JSON.stringify(this.dailyFreeUsage));
    } catch {
      console.warn('[BoosterManager] Failed to save daily free usage');
    }
  }

  private loadUsageLog() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USAGE_LOG);
      if (data) {
        this.usageLog = JSON.parse(data);
      }
    } catch {
      this.usageLog = [];
    }
  }

  private saveUsageLog() {
    try {
      localStorage.setItem(STORAGE_KEY_USAGE_LOG, JSON.stringify(this.usageLog));
    } catch {
      console.warn('[BoosterManager] Failed to save usage log');
    }
  }

  // ============================================
  // 内部方法 - 事件
  // ============================================

  private emitEvent(event: BoosterEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

// ============================================
// 类型定义
// ============================================

/**
 * 道具事件
 */
export type BoosterEvent =
  | { type: 'booster_added'; boosterType: BoosterType; count: number; source: string; newTotal: number }
  | { type: 'booster_select_start'; boosterType: BoosterType; source: string }
  | { type: 'booster_select_cancel'; boosterType: BoosterType }
  | { type: 'booster_used'; boosterType: BoosterType; source: string; target?: Vec2 | number | string };

// ============================================
// 便捷函数
// ============================================

export function getBoosterManager(): BoosterManager | null {
  return BoosterManager.getInstance();
}
