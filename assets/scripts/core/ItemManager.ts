/**
 * 道具管理器
 *
 * 管理玩家道具库存、使用限制、冷却时间和奖励发放。
 */

import type {
  ItemType,
  PlayerInventory,
  ItemUsageLimits,
  ItemRewardConfig,
  StarMilestone,
  ItemLevelState,
} from './types';

const STORAGE_KEY = 'lanternleaf_inventory';
const MILESTONES_KEY = 'lanternleaf_claimed_milestones';

/** 默认道具库存（新玩家） */
const DEFAULT_INVENTORY: PlayerInventory = {
  hint: 3,
  shuffle: 2,
  hammer: 1,
  row_clear: 0,
  col_clear: 0,
  bomb: 0,
};

/** 道具使用限制配置 */
const USAGE_LIMITS: ItemUsageLimits = {
  perLevel: {
    hint: -1,      // 无限制
    shuffle: 2,
    hammer: 3,
    row_clear: 1,
    col_clear: 1,
    bomb: 1,
  },
  cooldown: {
    hint: 3000,     // 3秒
    shuffle: 5000,  // 5秒
    hammer: 0,
    row_clear: 0,
    col_clear: 0,
    bomb: 0,
  },
};

/** 通关奖励配置 */
const REWARD_CONFIG: ItemRewardConfig = {
  levelClear: { hint: 1 },
  threeStarClear: { shuffle: 1 },
  bossLevelClear: { hammer: 1 },
};

/** 星级里程碑奖励 */
const STAR_MILESTONES: StarMilestone[] = [
  { stars: 15, rewards: { row_clear: 1 }, unlocks: ['row_clear'] },
  { stars: 30, rewards: { col_clear: 1 }, unlocks: ['col_clear'] },
  { stars: 50, rewards: { bomb: 1 }, unlocks: ['bomb'] },
  { stars: 75, rewards: { hint: 3, shuffle: 2 } },
  { stars: 100, rewards: { hammer: 2, bomb: 1 } },
  { stars: 150, rewards: { hint: 2, shuffle: 2, hammer: 2, row_clear: 2, col_clear: 2, bomb: 2 } },
];

/** 道具解锁条件（星数要求） */
const UNLOCK_REQUIREMENTS: Partial<Record<ItemType, number>> = {
  row_clear: 15,
  col_clear: 30,
  bomb: 50,
};

/**
 * 道具管理器
 */
export class ItemManager {
  private static _instance: ItemManager | null = null;

  private _inventory: PlayerInventory;
  private _claimedMilestones: Set<number>;
  private _levelState: ItemLevelState;
  private _initialized: boolean = false;
  private _listeners: Set<(inventory: PlayerInventory) => void> = new Set();

  private constructor() {
    this._inventory = { ...DEFAULT_INVENTORY };
    this._claimedMilestones = new Set();
    this._levelState = this._createEmptyLevelState();
  }

  static get instance(): ItemManager {
    if (!ItemManager._instance) {
      ItemManager._instance = new ItemManager();
    }
    return ItemManager._instance;
  }

  /**
   * 初始化，从存储加载数据
   */
  async init(): Promise<void> {
    if (this._initialized) return;

    try {
      // 加载库存
      const inventoryStr = localStorage.getItem(STORAGE_KEY);
      if (inventoryStr) {
        const data = JSON.parse(inventoryStr);
        this._inventory = { ...DEFAULT_INVENTORY, ...data };
      }

      // 加载已领取的里程碑
      const milestonesStr = localStorage.getItem(MILESTONES_KEY);
      if (milestonesStr) {
        const data = JSON.parse(milestonesStr);
        this._claimedMilestones = new Set(data);
      }
    } catch (error) {
      console.error('[ItemManager] 加载数据失败:', error);
    }

    this._initialized = true;
    console.log('[ItemManager] 初始化完成:', this._inventory);
  }

  // ==================== 库存管理 ====================

  /**
   * 获取道具数量
   */
  getItemCount(itemType: ItemType): number {
    return this._inventory[itemType] || 0;
  }

  /**
   * 获取完整库存（只读副本）
   */
  getInventory(): Readonly<PlayerInventory> {
    return { ...this._inventory };
  }

  /**
   * 添加道具
   */
  addItem(itemType: ItemType, count: number = 1): void {
    this._inventory[itemType] = (this._inventory[itemType] || 0) + count;
    this._save();
    this._notifyListeners();
    console.log(`[ItemManager] 添加道具: ${itemType} +${count}, 当前: ${this._inventory[itemType]}`);
  }

  /**
   * 批量添加道具
   */
  addItems(items: Partial<PlayerInventory>): void {
    for (const [itemType, count] of Object.entries(items)) {
      if (count && count > 0) {
        this._inventory[itemType as ItemType] += count;
      }
    }
    this._save();
    this._notifyListeners();
  }

  /**
   * 消耗道具
   */
  consumeItem(itemType: ItemType): boolean {
    if (this._inventory[itemType] <= 0) {
      console.warn(`[ItemManager] 道具不足: ${itemType}`);
      return false;
    }
    this._inventory[itemType]--;
    this._save();
    this._notifyListeners();
    return true;
  }

  // ==================== 使用限制 ====================

  /**
   * 检查道具是否可用
   */
  canUseItem(itemType: ItemType): { canUse: boolean; reason?: string } {
    // 检查库存
    if (this._inventory[itemType] <= 0) {
      return { canUse: false, reason: '道具数量不足' };
    }

    // 检查每关使用次数
    const perLevelLimit = USAGE_LIMITS.perLevel[itemType];
    if (perLevelLimit > 0) {
      const usedCount = this._levelState.usageCount[itemType] || 0;
      if (usedCount >= perLevelLimit) {
        return { canUse: false, reason: `本关已使用${perLevelLimit}次` };
      }
    }

    // 检查冷却时间
    const cooldown = USAGE_LIMITS.cooldown[itemType];
    if (cooldown > 0) {
      const lastUsed = this._levelState.lastUsedTime[itemType] || 0;
      const elapsed = Date.now() - lastUsed;
      if (elapsed < cooldown) {
        const remaining = Math.ceil((cooldown - elapsed) / 1000);
        return { canUse: false, reason: `冷却中 ${remaining}秒` };
      }
    }

    return { canUse: true };
  }

  /**
   * 获取道具冷却剩余时间（毫秒）
   */
  getCooldownRemaining(itemType: ItemType): number {
    const cooldown = USAGE_LIMITS.cooldown[itemType];
    if (cooldown <= 0) return 0;

    const lastUsed = this._levelState.lastUsedTime[itemType] || 0;
    const elapsed = Date.now() - lastUsed;
    return Math.max(0, cooldown - elapsed);
  }

  /**
   * 使用道具（消耗+记录）
   */
  useItem(itemType: ItemType): boolean {
    const { canUse, reason } = this.canUseItem(itemType);
    if (!canUse) {
      console.warn(`[ItemManager] 无法使用道具 ${itemType}: ${reason}`);
      return false;
    }

    // 消耗道具
    if (!this.consumeItem(itemType)) {
      return false;
    }

    // 记录使用
    this._levelState.usageCount[itemType] = (this._levelState.usageCount[itemType] || 0) + 1;
    this._levelState.lastUsedTime[itemType] = Date.now();

    console.log(`[ItemManager] 使用道具: ${itemType}`);
    return true;
  }

  /**
   * 重置关卡内状态（开始新关卡时调用）
   */
  resetLevelState(): void {
    this._levelState = this._createEmptyLevelState();
    console.log('[ItemManager] 关卡状态已重置');
  }

  // ==================== 道具解锁 ====================

  /**
   * 检查道具是否已解锁
   */
  isItemUnlocked(itemType: ItemType, totalStars: number): boolean {
    const requirement = UNLOCK_REQUIREMENTS[itemType];
    if (requirement === undefined) {
      return true; // 无解锁条件，默认解锁
    }
    return totalStars >= requirement;
  }

  /**
   * 获取道具解锁所需星数
   */
  getUnlockRequirement(itemType: ItemType): number | undefined {
    return UNLOCK_REQUIREMENTS[itemType];
  }

  // ==================== 奖励系统 ====================

  /**
   * 发放通关奖励
   */
  grantLevelClearReward(stars: number, isBossLevel: boolean): Partial<PlayerInventory> {
    const rewards: Partial<PlayerInventory> = { ...REWARD_CONFIG.levelClear };

    // 3星额外奖励
    if (stars >= 3) {
      for (const [item, count] of Object.entries(REWARD_CONFIG.threeStarClear)) {
        rewards[item as ItemType] = (rewards[item as ItemType] || 0) + (count || 0);
      }
    }

    // Boss关额外奖励
    if (isBossLevel) {
      for (const [item, count] of Object.entries(REWARD_CONFIG.bossLevelClear)) {
        rewards[item as ItemType] = (rewards[item as ItemType] || 0) + (count || 0);
      }
    }

    this.addItems(rewards);
    return rewards;
  }

  /**
   * 检查并发放星级里程碑奖励
   */
  checkAndGrantMilestoneRewards(totalStars: number): StarMilestone[] {
    const grantedMilestones: StarMilestone[] = [];

    for (const milestone of STAR_MILESTONES) {
      if (totalStars >= milestone.stars && !this._claimedMilestones.has(milestone.stars)) {
        // 标记为已领取
        this._claimedMilestones.add(milestone.stars);

        // 发放奖励
        this.addItems(milestone.rewards);

        grantedMilestones.push(milestone);
        console.log(`[ItemManager] 达成里程碑 ${milestone.stars} 星，发放奖励:`, milestone.rewards);
      }
    }

    if (grantedMilestones.length > 0) {
      this._saveMilestones();
    }

    return grantedMilestones;
  }

  /**
   * 获取所有里程碑配置
   */
  getMilestones(): StarMilestone[] {
    return [...STAR_MILESTONES];
  }

  /**
   * 检查里程碑是否已领取
   */
  isMilestoneClaimed(stars: number): boolean {
    return this._claimedMilestones.has(stars);
  }

  // ==================== 监听器 ====================

  addListener(listener: (inventory: PlayerInventory) => void): void {
    this._listeners.add(listener);
  }

  removeListener(listener: (inventory: PlayerInventory) => void): void {
    this._listeners.delete(listener);
  }

  private _notifyListeners(): void {
    this._listeners.forEach((listener) => {
      try {
        listener(this._inventory);
      } catch (error) {
        console.error('[ItemManager] 监听器执行错误:', error);
      }
    });
  }

  // ==================== 私有方法 ====================

  private _createEmptyLevelState(): ItemLevelState {
    return {
      usageCount: {
        hint: 0,
        shuffle: 0,
        hammer: 0,
        row_clear: 0,
        col_clear: 0,
        bomb: 0,
      },
      lastUsedTime: {
        hint: 0,
        shuffle: 0,
        hammer: 0,
        row_clear: 0,
        col_clear: 0,
        bomb: 0,
      },
    };
  }

  private _save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._inventory));
    } catch (error) {
      console.error('[ItemManager] 保存库存失败:', error);
    }
  }

  private _saveMilestones(): void {
    try {
      localStorage.setItem(MILESTONES_KEY, JSON.stringify([...this._claimedMilestones]));
    } catch (error) {
      console.error('[ItemManager] 保存里程碑失败:', error);
    }
  }

  /**
   * 重置所有数据（用于调试或重置进度）
   */
  reset(): void {
    this._inventory = { ...DEFAULT_INVENTORY };
    this._claimedMilestones.clear();
    this._levelState = this._createEmptyLevelState();
    this._save();
    this._saveMilestones();
    this._notifyListeners();
    console.log('[ItemManager] 数据已重置');
  }
}

/** 便捷访问 */
export const itemManager = ItemManager.instance;

export default ItemManager;
