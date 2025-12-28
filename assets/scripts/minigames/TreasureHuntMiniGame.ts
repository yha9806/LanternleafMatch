/**
 * TreasureHuntMiniGame - 寻宝迷你游戏
 * 5x5 网格挖掘宝藏，限制铲子次数
 */

// ============================================
// 类型定义
// ============================================

export type CellContent = 'empty' | 'coins_small' | 'coins_medium' | 'coins_large' | 'gems' | 'booster' | 'treasure';

export interface TreasureCell {
  row: number;
  col: number;
  content: CellContent;
  revealed: boolean;
  hint?: 'near' | 'far' | 'none';
}

export interface TreasureMap {
  grid: TreasureCell[][];
  treasurePosition: { row: number; col: number };
  totalCoins: number;
  totalGems: number;
  boosters: string[];
}

export interface TreasureHuntConfig {
  gridSize: number;
  shovels: number;
  maxAdShovels: number;
  rewards: {
    coins_small: TreasureReward;
    coins_medium: TreasureReward;
    coins_large: TreasureReward;
    gems: TreasureReward;
    booster: TreasureReward;
    treasure: TreasureReward;
    empty: TreasureReward;
  };
}

export interface TreasureReward {
  coins?: number;
  gems?: number;
  booster?: string;
}

export interface TreasureHuntResult {
  found: boolean;
  totalCoins: number;
  totalGems: number;
  boosters: string[];
  shovelsUsed: number;
  cellsRevealed: number;
}

export type TreasureHuntState = 'idle' | 'playing' | 'found' | 'exhausted';

export interface TreasureHuntEvent {
  type: 'start' | 'dig' | 'hint' | 'ad_shovel' | 'complete';
  state: TreasureHuntState;
  cell?: TreasureCell;
  shovelsRemaining?: number;
  result?: TreasureHuntResult;
}

export type HintType = 'direction' | 'distance' | 'area';

// ============================================
// 常量
// ============================================

const DEFAULT_CONFIG: TreasureHuntConfig = {
  gridSize: 5,
  shovels: 5,
  maxAdShovels: 3,
  rewards: {
    coins_small: { coins: 20 },
    coins_medium: { coins: 50 },
    coins_large: { coins: 100 },
    gems: { gems: 1 },
    booster: { booster: 'random' },
    treasure: { coins: 200, gems: 3 },
    empty: {},
  },
};

const CONTENT_DISTRIBUTION: Array<{ content: CellContent; weight: number }> = [
  { content: 'empty', weight: 40 },
  { content: 'coins_small', weight: 25 },
  { content: 'coins_medium', weight: 15 },
  { content: 'coins_large', weight: 8 },
  { content: 'gems', weight: 7 },
  { content: 'booster', weight: 5 },
];

const BOOSTERS = ['rocket', 'bomb', 'rainbow', 'shuffle'];

// ============================================
// TreasureHuntMiniGame 类
// ============================================

export class TreasureHuntMiniGame {
  private config: TreasureHuntConfig;
  private map: TreasureMap;
  private state: TreasureHuntState = 'idle';
  private shovelsRemaining: number;
  private adShovelsUsed: number = 0;
  private collectedRewards: TreasureHuntResult;
  private listeners: Array<(event: TreasureHuntEvent) => void> = [];

  constructor(config?: Partial<TreasureHuntConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.shovelsRemaining = this.config.shovels;
    this.map = this.generateMap();
    this.collectedRewards = {
      found: false,
      totalCoins: 0,
      totalGems: 0,
      boosters: [],
      shovelsUsed: 0,
      cellsRevealed: 0,
    };
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 获取地图（隐藏未挖掘内容）
   */
  getVisibleMap(): TreasureCell[][] {
    return this.map.grid.map((row) =>
      row.map((cell) => ({
        ...cell,
        content: cell.revealed ? cell.content : 'empty',
      }))
    );
  }

  /**
   * 获取完整地图（调试用）
   */
  getFullMap(): TreasureMap {
    return this.map;
  }

  /**
   * 获取当前状态
   */
  getState(): TreasureHuntState {
    return this.state;
  }

  /**
   * 获取剩余铲子数
   */
  getShovelsRemaining(): number {
    return this.shovelsRemaining;
  }

  /**
   * 获取可用广告铲子数
   */
  getAdShovelsAvailable(): number {
    return this.config.maxAdShovels - this.adShovelsUsed;
  }

  /**
   * 获取已收集奖励
   */
  getCollectedRewards(): TreasureHuntResult {
    return { ...this.collectedRewards };
  }

  /**
   * 开始游戏
   */
  start(): void {
    if (this.state !== 'idle') return;

    this.state = 'playing';
    this.emitEvent({
      type: 'start',
      state: this.state,
      shovelsRemaining: this.shovelsRemaining,
    });
  }

  /**
   * 挖掘指定格子
   */
  dig(row: number, col: number): TreasureCell | null {
    if (this.state !== 'playing') return null;
    if (this.shovelsRemaining <= 0) return null;

    const cell = this.map.grid[row]?.[col];
    if (!cell || cell.revealed) return null;

    // 消耗铲子
    this.shovelsRemaining--;
    cell.revealed = true;
    this.collectedRewards.shovelsUsed++;
    this.collectedRewards.cellsRevealed++;

    // 收集奖励
    this.collectReward(cell);

    // 检查是否找到宝藏
    if (cell.content === 'treasure') {
      this.state = 'found';
      this.collectedRewards.found = true;
      this.emitEvent({
        type: 'complete',
        state: this.state,
        cell,
        result: this.collectedRewards,
      });
      return cell;
    }

    // 检查是否铲子用尽
    if (this.shovelsRemaining <= 0 && this.adShovelsUsed >= this.config.maxAdShovels) {
      this.state = 'exhausted';
      this.emitEvent({
        type: 'complete',
        state: this.state,
        cell,
        result: this.collectedRewards,
      });
      return cell;
    }

    this.emitEvent({
      type: 'dig',
      state: this.state,
      cell,
      shovelsRemaining: this.shovelsRemaining,
    });

    return cell;
  }

  /**
   * 通过广告获取额外铲子
   */
  addShovelFromAd(): boolean {
    if (this.state !== 'playing') return false;
    if (this.adShovelsUsed >= this.config.maxAdShovels) return false;

    this.shovelsRemaining++;
    this.adShovelsUsed++;

    this.emitEvent({
      type: 'ad_shovel',
      state: this.state,
      shovelsRemaining: this.shovelsRemaining,
    });

    return true;
  }

  /**
   * 获取提示
   */
  getHint(type: HintType): string | { row: number; col: number }[] | null {
    if (this.state !== 'playing') return null;

    const { row: tRow, col: tCol } = this.map.treasurePosition;

    switch (type) {
      case 'direction':
        return this.getDirectionHint(tRow, tCol);

      case 'distance':
        return this.getDistanceHint(tRow, tCol);

      case 'area':
        return this.getAreaHint(tRow, tCol);

      default:
        return null;
    }
  }

  /**
   * 为格子设置热度提示
   */
  updateCellHints(): void {
    const { row: tRow, col: tCol } = this.map.treasurePosition;

    for (let r = 0; r < this.config.gridSize; r++) {
      for (let c = 0; c < this.config.gridSize; c++) {
        const cell = this.map.grid[r][c];
        if (!cell.revealed) {
          const distance = Math.abs(r - tRow) + Math.abs(c - tCol);
          if (distance <= 1) {
            cell.hint = 'near';
          } else if (distance <= 2) {
            cell.hint = 'far';
          } else {
            cell.hint = 'none';
          }
        }
      }
    }

    this.emitEvent({
      type: 'hint',
      state: this.state,
      shovelsRemaining: this.shovelsRemaining,
    });
  }

  /**
   * 销毁游戏
   */
  destroy(): void {
    this.listeners = [];
  }

  // ============================================
  // 事件系统
  // ============================================

  /**
   * 监听游戏事件
   */
  onEvent(listener: (event: TreasureHuntEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emitEvent(event: TreasureHuntEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[TreasureHuntMiniGame] Listener error:', e);
      }
    }
  }

  // ============================================
  // 内部方法
  // ============================================

  private generateMap(): TreasureMap {
    const { gridSize } = this.config;
    const grid: TreasureCell[][] = [];

    // 初始化空网格
    for (let r = 0; r < gridSize; r++) {
      grid[r] = [];
      for (let c = 0; c < gridSize; c++) {
        grid[r][c] = {
          row: r,
          col: c,
          content: 'empty',
          revealed: false,
        };
      }
    }

    // 随机放置宝藏
    const treasureRow = Math.floor(Math.random() * gridSize);
    const treasureCol = Math.floor(Math.random() * gridSize);
    grid[treasureRow][treasureCol].content = 'treasure';

    // 填充其他格子
    let totalCoins = 0;
    let totalGems = 0;
    const boosters: string[] = [];

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (r === treasureRow && c === treasureCol) continue;

        const content = this.weightedRandom(CONTENT_DISTRIBUTION);
        grid[r][c].content = content;

        // 统计潜在奖励
        const reward = this.config.rewards[content];
        if (reward.coins) totalCoins += reward.coins;
        if (reward.gems) totalGems += reward.gems;
        if (content === 'booster') {
          boosters.push(this.randomBooster());
        }
      }
    }

    // 加上宝藏奖励
    totalCoins += this.config.rewards.treasure.coins || 0;
    totalGems += this.config.rewards.treasure.gems || 0;

    return {
      grid,
      treasurePosition: { row: treasureRow, col: treasureCol },
      totalCoins,
      totalGems,
      boosters,
    };
  }

  private weightedRandom(items: Array<{ content: CellContent; weight: number }>): CellContent {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.content;
      }
    }

    return items[0].content;
  }

  private randomBooster(): string {
    return BOOSTERS[Math.floor(Math.random() * BOOSTERS.length)];
  }

  private collectReward(cell: TreasureCell): void {
    const reward = this.config.rewards[cell.content];

    if (reward.coins) {
      this.collectedRewards.totalCoins += reward.coins;
    }

    if (reward.gems) {
      this.collectedRewards.totalGems += reward.gems;
    }

    if (cell.content === 'booster' || cell.content === 'treasure') {
      const booster = this.randomBooster();
      this.collectedRewards.boosters.push(booster);
    }
  }

  private getDirectionHint(tRow: number, tCol: number): string {
    // 找到最近的已揭示格子来计算方向
    let refRow = Math.floor(this.config.gridSize / 2);
    let refCol = Math.floor(this.config.gridSize / 2);

    // 使用最后挖掘的格子作为参考
    for (let r = 0; r < this.config.gridSize; r++) {
      for (let c = 0; c < this.config.gridSize; c++) {
        if (this.map.grid[r][c].revealed) {
          refRow = r;
          refCol = c;
        }
      }
    }

    const directions: string[] = [];

    if (tRow < refRow) directions.push('↑');
    else if (tRow > refRow) directions.push('↓');

    if (tCol < refCol) directions.push('←');
    else if (tCol > refCol) directions.push('→');

    if (directions.length === 0) return '🎯'; // 就在附近

    return directions.join('');
  }

  private getDistanceHint(tRow: number, tCol: number): string {
    // 计算到所有已揭示格子的最近距离
    let minDistance = Infinity;

    for (let r = 0; r < this.config.gridSize; r++) {
      for (let c = 0; c < this.config.gridSize; c++) {
        if (this.map.grid[r][c].revealed) {
          const d = Math.abs(r - tRow) + Math.abs(c - tCol);
          minDistance = Math.min(minDistance, d);
        }
      }
    }

    if (minDistance === Infinity) {
      minDistance = Math.abs(2 - tRow) + Math.abs(2 - tCol); // 从中心计算
    }

    if (minDistance <= 1) return '🔥 非常近！';
    if (minDistance <= 2) return '🌡️ 很近';
    if (minDistance <= 3) return '💨 有点远';
    return '❄️ 很远';
  }

  private getAreaHint(tRow: number, tCol: number): Array<{ row: number; col: number }> {
    // 返回宝藏所在的 2x2 区域
    const startRow = tRow === this.config.gridSize - 1 ? tRow - 1 : tRow;
    const startCol = tCol === this.config.gridSize - 1 ? tCol - 1 : tCol;

    const area: Array<{ row: number; col: number }> = [];
    for (let r = startRow; r <= startRow + 1; r++) {
      for (let c = startCol; c <= startCol + 1; c++) {
        area.push({ row: r, col: c });
      }
    }

    return area;
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建寻宝游戏实例
 */
export function createTreasureHuntMiniGame(config?: Partial<TreasureHuntConfig>): TreasureHuntMiniGame {
  return new TreasureHuntMiniGame(config);
}

/**
 * 根据玩家等级获取配置
 */
export function getTreasureHuntConfigForLevel(playerLevel: number): Partial<TreasureHuntConfig> {
  if (playerLevel < 10) {
    return { shovels: 7, maxAdShovels: 2 }; // 新手更多铲子
  }
  if (playerLevel < 25) {
    return { shovels: 5, maxAdShovels: 3 };
  }
  return { shovels: 4, maxAdShovels: 3 }; // 高等级更有挑战
}
