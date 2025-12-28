/**
 * PreBoosterManager - 预置道具管理器
 * 管理关卡开始前的道具选择、放置和费用计算
 */

import { getWinStreakManager, PreBoosterReward } from './WinStreakManager';
import { playerProgress } from './PlayerProgress';

// ============================================
// 类型定义
// ============================================

export type PreBoosterType =
  | 'extra_moves_3'
  | 'extra_moves_5'
  | 'rocket'
  | 'bomb'
  | 'rainbow'
  | 'shuffle';

export interface PreBoosterDef {
  type: PreBoosterType;
  name: string;
  description: string;
  icon: string;
  cost: {
    coins?: number;
    gems?: number;
  };
  placement: 'board' | 'inventory' | 'none';
  maxPerLevel: number;
  unlockLevel: number;
}

export interface SelectedBooster {
  type: PreBoosterType;
  count: number;
  source: 'purchased' | 'streak' | 'ad' | 'free';
}

export interface BoardPlacement {
  boosterType: PreBoosterType;
  position: { row: number; col: number };
  tileType: string;
}

export interface PreBoosterSelection {
  boosters: SelectedBooster[];
  totalCost: { coins: number; gems: number };
  streakBoosters: PreBoosterReward[];
}

// ============================================
// 常量
// ============================================

const STORAGE_KEY = 'lanternleaf_pre_booster_history';
const BOARD_SIZE = 6;

export const PRE_BOOSTER_DEFS: Record<PreBoosterType, PreBoosterDef> = {
  extra_moves_3: {
    type: 'extra_moves_3',
    name: '+3 步',
    description: '关卡开始时获得额外3步',
    icon: '➕',
    cost: { coins: 50 },
    placement: 'none',
    maxPerLevel: 1,
    unlockLevel: 1,
  },
  extra_moves_5: {
    type: 'extra_moves_5',
    name: '+5 步',
    description: '关卡开始时获得额外5步',
    icon: '➕➕',
    cost: { coins: 100, gems: 5 },
    placement: 'none',
    maxPerLevel: 1,
    unlockLevel: 5,
  },
  rocket: {
    type: 'rocket',
    name: '火箭',
    description: '开局在棋盘上放置一个火箭',
    icon: '🚀',
    cost: { coins: 80, gems: 3 },
    placement: 'board',
    maxPerLevel: 2,
    unlockLevel: 3,
  },
  bomb: {
    type: 'bomb',
    name: '炸弹',
    description: '开局在棋盘上放置一个炸弹',
    icon: '💣',
    cost: { coins: 120, gems: 5 },
    placement: 'board',
    maxPerLevel: 2,
    unlockLevel: 8,
  },
  rainbow: {
    type: 'rainbow',
    name: '彩虹',
    description: '开局在棋盘上放置一个彩虹球',
    icon: '🌈',
    cost: { gems: 8 },
    placement: 'board',
    maxPerLevel: 1,
    unlockLevel: 15,
  },
  shuffle: {
    type: 'shuffle',
    name: '洗牌',
    description: '关卡中获得一次免费洗牌',
    icon: '🔀',
    cost: { coins: 60 },
    placement: 'inventory',
    maxPerLevel: 1,
    unlockLevel: 1,
  },
};

// ============================================
// PreBoosterManager 类
// ============================================

export class PreBoosterManager {
  private currentSelection: SelectedBooster[] = [];
  private failureCount: number = 0;
  private lastLevelIndex: number = 0;
  private listeners: Array<(selection: PreBoosterSelection) => void> = [];

  // ============================================
  // 公共 API - 查询
  // ============================================

  /**
   * 获取可用的预置道具列表
   */
  getAvailableBoosters(levelIndex: number): PreBoosterDef[] {
    return Object.values(PRE_BOOSTER_DEFS).filter(
      (def) => levelIndex >= def.unlockLevel
    );
  }

  /**
   * 获取道具定义
   */
  getBoosterDef(type: PreBoosterType): PreBoosterDef {
    return PRE_BOOSTER_DEFS[type];
  }

  /**
   * 获取当前选择
   */
  getCurrentSelection(): PreBoosterSelection {
    const streakManager = getWinStreakManager();
    const streakBoosters = streakManager.getPreBoosters();

    return {
      boosters: [...this.currentSelection],
      totalCost: this.calculateTotalCost(),
      streakBoosters,
    };
  }

  /**
   * 获取连胜赠送的道具
   */
  getStreakBoosters(): PreBoosterReward[] {
    return getWinStreakManager().getPreBoosters();
  }

  /**
   * 获取智能推荐（失败后）
   */
  getRecommendation(levelIndex: number): {
    boosters: PreBoosterType[];
    originalCost: { coins: number; gems: number };
    discountedCost: { coins: number; gems: number };
    discountPercent: number;
  } | null {
    // 只有失败2次以上才推荐
    if (this.failureCount < 2 || this.lastLevelIndex !== levelIndex) {
      return null;
    }

    // 推荐组合：火箭 + 额外3步
    const recommended: PreBoosterType[] = ['rocket', 'extra_moves_3'];
    const available = this.getAvailableBoosters(levelIndex);

    // 过滤掉未解锁的
    const validRecommended = recommended.filter((type) =>
      available.some((def) => def.type === type)
    );

    if (validRecommended.length === 0) return null;

    let originalCoins = 0;
    let originalGems = 0;

    for (const type of validRecommended) {
      const def = PRE_BOOSTER_DEFS[type];
      originalCoins += def.cost.coins || 0;
      originalGems += def.cost.gems || 0;
    }

    const discountPercent = 25;
    const discountedCoins = Math.floor(originalCoins * (1 - discountPercent / 100));
    const discountedGems = Math.floor(originalGems * (1 - discountPercent / 100));

    return {
      boosters: validRecommended,
      originalCost: { coins: originalCoins, gems: originalGems },
      discountedCost: { coins: discountedCoins, gems: discountedGems },
      discountPercent,
    };
  }

  // ============================================
  // 公共 API - 操作
  // ============================================

  /**
   * 添加道具到选择
   */
  addBooster(type: PreBoosterType): boolean {
    const def = PRE_BOOSTER_DEFS[type];
    if (!def) return false;

    // 检查数量限制
    const existing = this.currentSelection.find((b) => b.type === type);
    if (existing && existing.count >= def.maxPerLevel) {
      return false;
    }

    if (existing) {
      existing.count++;
    } else {
      this.currentSelection.push({
        type,
        count: 1,
        source: 'purchased',
      });
    }

    this.notifyListeners();
    return true;
  }

  /**
   * 从选择中移除道具
   */
  removeBooster(type: PreBoosterType): boolean {
    const index = this.currentSelection.findIndex((b) => b.type === type);
    if (index === -1) return false;

    const existing = this.currentSelection[index];
    if (existing.count > 1) {
      existing.count--;
    } else {
      this.currentSelection.splice(index, 1);
    }

    this.notifyListeners();
    return true;
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    this.currentSelection = [];
    this.notifyListeners();
  }

  /**
   * 应用推荐组合
   */
  applyRecommendation(levelIndex: number): boolean {
    const recommendation = this.getRecommendation(levelIndex);
    if (!recommendation) return false;

    this.clearSelection();
    for (const type of recommendation.boosters) {
      this.addBooster(type);
    }

    return true;
  }

  /**
   * 确认购买并开始关卡
   * @returns 棋盘放置列表，失败返回 null
   */
  confirmAndStart(levelIndex: number, useDiscount: boolean = false): BoardPlacement[] | null {
    const cost = useDiscount
      ? this.getRecommendation(levelIndex)?.discountedCost || this.calculateTotalCost()
      : this.calculateTotalCost();

    // 尝试扣费
    if (cost.coins > 0) {
      if (!playerProgress.spendCoins(cost.coins)) {
        return null;
      }
    }
    if (cost.gems > 0) {
      if (!playerProgress.spendGems(cost.gems)) {
        // 回滚金币
        if (cost.coins > 0) {
          playerProgress.addCoins(cost.coins);
        }
        return null;
      }
    }

    // 生成放置
    const placements = this.generatePlacements();

    // 记录使用历史
    this.saveUsageHistory(levelIndex, this.currentSelection);

    // 重置失败计数
    this.failureCount = 0;
    this.lastLevelIndex = levelIndex;

    // 清空选择
    this.currentSelection = [];
    this.notifyListeners();

    return placements;
  }

  /**
   * 记录关卡失败（用于智能推荐）
   */
  onLevelFail(levelIndex: number): void {
    if (this.lastLevelIndex === levelIndex) {
      this.failureCount++;
    } else {
      this.failureCount = 1;
      this.lastLevelIndex = levelIndex;
    }
  }

  /**
   * 记录关卡成功
   */
  onLevelWin(levelIndex: number): void {
    this.failureCount = 0;
    this.lastLevelIndex = levelIndex;
  }

  // ============================================
  // 事件系统
  // ============================================

  /**
   * 监听选择变更
   */
  onSelectionChange(listener: (selection: PreBoosterSelection) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    const selection = this.getCurrentSelection();
    for (const listener of this.listeners) {
      try {
        listener(selection);
      } catch (e) {
        console.error('[PreBoosterManager] Listener error:', e);
      }
    }
  }

  // ============================================
  // 内部方法
  // ============================================

  private calculateTotalCost(): { coins: number; gems: number } {
    let coins = 0;
    let gems = 0;

    for (const selected of this.currentSelection) {
      if (selected.source !== 'purchased') continue;

      const def = PRE_BOOSTER_DEFS[selected.type];
      coins += (def.cost.coins || 0) * selected.count;
      gems += (def.cost.gems || 0) * selected.count;
    }

    return { coins, gems };
  }

  private generatePlacements(): BoardPlacement[] {
    const placements: BoardPlacement[] = [];
    const usedPositions = new Set<string>();
    const tileTypes = ['leaf', 'acorn', 'star', 'fish', 'bone'];

    // 先放置连胜奖励的道具
    const streakBoosters = this.getStreakBoosters();
    for (const reward of streakBoosters) {
      for (let i = 0; i < reward.count; i++) {
        const pos = this.findRandomPosition(usedPositions, reward.type === 'super_rainbow');
        if (pos) {
          usedPositions.add(`${pos.row},${pos.col}`);
          placements.push({
            boosterType: reward.type as PreBoosterType,
            position: pos,
            tileType: tileTypes[Math.floor(Math.random() * tileTypes.length)],
          });
        }
      }
    }

    // 再放置购买的道具
    for (const selected of this.currentSelection) {
      const def = PRE_BOOSTER_DEFS[selected.type];
      if (def.placement !== 'board') continue;

      for (let i = 0; i < selected.count; i++) {
        const pos = this.findRandomPosition(usedPositions, false);
        if (pos) {
          usedPositions.add(`${pos.row},${pos.col}`);
          placements.push({
            boosterType: selected.type,
            position: pos,
            tileType: tileTypes[Math.floor(Math.random() * tileTypes.length)],
          });
        }
      }
    }

    return placements;
  }

  private findRandomPosition(
    usedPositions: Set<string>,
    preferCenter: boolean
  ): { row: number; col: number } | null {
    if (preferCenter) {
      // 超级彩虹优先放中心
      const centerPositions = [
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
      ];
      for (const pos of centerPositions) {
        const key = `${pos.row},${pos.col}`;
        if (!usedPositions.has(key)) {
          return pos;
        }
      }
    }

    // 随机位置
    const available: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const key = `${row},${col}`;
        if (!usedPositions.has(key)) {
          available.push({ row, col });
        }
      }
    }

    if (available.length === 0) return null;

    return available[Math.floor(Math.random() * available.length)];
  }

  private saveUsageHistory(levelIndex: number, boosters: SelectedBooster[]): void {
    try {
      const history = this.loadUsageHistory();
      history.push({
        levelIndex,
        boosters: boosters.map((b) => ({ type: b.type, count: b.count })),
        timestamp: Date.now(),
      });

      // 只保留最近 50 条
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('[PreBoosterManager] Failed to save history:', e);
    }
  }

  private loadUsageHistory(): Array<{
    levelIndex: number;
    boosters: Array<{ type: string; count: number }>;
    timestamp: number;
  }> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[PreBoosterManager] Failed to load history:', e);
    }
    return [];
  }
}

// ============================================
// 单例
// ============================================

let _instance: PreBoosterManager | null = null;

export function getPreBoosterManager(): PreBoosterManager {
  if (!_instance) {
    _instance = new PreBoosterManager();
  }
  return _instance;
}

export function resetPreBoosterManager(): void {
  _instance = null;
}
