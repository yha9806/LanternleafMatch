// ============================================
// 灯笼叶子消消乐 - 核心类型定义
// ============================================

// --- 基础类型 ---
export type TileType = 'leaf' | 'acorn' | 'star' | 'fish' | 'bone';
export type BlockerType = 'moss';
export type GoalType = 'collect' | 'clear_moss' | 'combo';
export type PatternType =
  | 'none'
  | 'edge_ring'
  | 'corners'
  | 'diagonal'
  | 'center_blob'
  | 'center_cross'
  | 'stripes_h'
  | 'stripes_v'
  | 'scattered';

export interface Cell {
  row: number;  // 0-5
  col: number;  // 0-5
}

// --- 棋盘格子 ---
// 特殊块类型（匹配 UI Kit 素材命名）
// - whirl_h (旋风): 水平4连生成，清除一行
// - whirl_v (旋风): 垂直4连生成，清除一列
// - lantern (灯笼): 5连生成，清除周围 3x3
// - rainbow (彩虹): T型/L型消除生成，消除全部同色
// - wildcard (百搭): 连消奖励/随机生成，与任意颜色匹配
// - multiplier (倍数): 随机生成(2%)，收集数×2
// - frozen (冰冻): 随机生成(1.5%)，需消除2次
// - bomb_timer (定时炸弹): 高难度关卡，N步内必须消除
export type SpecialType =
  | 'whirl_h'
  | 'whirl_v'
  | 'lantern'
  | 'rainbow'
  | 'wildcard'
  | 'multiplier'
  | 'frozen'
  | 'bomb_timer';

// 匹配形状类型
export type MatchShape = 'linear' | 'T' | 'L';

export interface Tile {
  type: TileType;
  isSpecial: boolean;
  specialType?: SpecialType;
  // 扩展属性
  frozenLayers?: number;      // 冰冻层数（默认2）
  multiplierValue?: number;   // 倍数值（默认2）
  bombTimer?: number;         // 炸弹倒计时
  isWildcard?: boolean;       // 是否为百搭块
}

export interface Blocker {
  type: BlockerType;
  layer: number;  // 1 = 单层苔藓
}

export interface BoardCell {
  tile: Tile | null;
  blocker: Blocker | null;
}

export type Board = BoardCell[][];  // 6x6

// --- 关卡目标 ---
export interface GoalCollect {
  type: 'collect';
  item: TileType;
  count: number;
  current: number;
}

export interface GoalClearMoss {
  type: 'clear_moss';
  count: number;    // 0 = 清除全部
  current: number;
}

export interface GoalCombo {
  type: 'combo';
  collect: GoalCollect;
  clearMoss: GoalClearMoss;
}

export type Goal = GoalCollect | GoalClearMoss | GoalCombo;

// --- 关卡定义 ---
export interface LevelDef {
  level_index: number;
  difficulty: number;
  seed: number;
  board_size: 6;
  moves: number;
  goals: Goal[];
  blockers: {
    type: 'moss';
    pattern: PatternType;
    density: number;
    cells: Cell[];
  };
  tile_weights: Record<TileType, number>;
  guardrails: {
    shuffle_on_deadlock: boolean;
    prevent_initial_matches: boolean;
  };
}

// --- 关卡状态 ---
export interface LevelState {
  levelDef: LevelDef;
  board: Board;
  movesLeft: number;
  goals: Goal[];
  isCompleted: boolean;
  isFailed: boolean;
  cascadeCount: number;
  shuffleCount: number;
}

// --- 消除结果 ---
export interface Match {
  cells: Cell[];
  type: TileType;
  length: number;
  isHorizontal: boolean;  // 用于决定生成 whirl_h 还是 whirl_v
  isSpecial: boolean;
  specialType?: SpecialType;
  shape?: MatchShape;           // 匹配形状
  intersectionCell?: Cell;      // T/L型交叉点
}

export interface MatchResult {
  matches: Match[];
  clearedMoss: Cell[];
  collectedTiles: Record<TileType, number>;
  cascadeIndex: number;
}

// --- 交换操作 ---
export interface SwapAction {
  from: Cell;
  to: Cell;
}

// --- 体力系统 ---
export interface EnergyState {
  current: number;
  max: number;
  lastRegenTimestamp: number;
  adCountHourly: number;
  adCountDaily: number;
  hourlyResetTimestamp: number;
  dailyResetTimestamp: number;
}

// --- 玩家状态 ---
export interface PlayerState {
  playerId: string;
  currentLevel: number;
  highestLevel: number;
  energy: EnergyState;
  totalCollected: Record<TileType, number>;
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    adPersonalization: boolean;
  };
}

// --- 道具系统 ---
export type ItemType = 'hint' | 'shuffle' | 'hammer' | 'row_clear' | 'col_clear' | 'bomb';

export interface PlayerInventory {
  hint: number;
  shuffle: number;
  hammer: number;
  row_clear: number;
  col_clear: number;
  bomb: number;
}

export interface ItemUsageLimits {
  perLevel: Record<ItemType, number>;  // 每关使用次数限制，-1表示无限制
  cooldown: Record<ItemType, number>;  // 冷却时间（毫秒）
}

export interface ItemRewardConfig {
  levelClear: Partial<PlayerInventory>;        // 通关奖励
  threeStarClear: Partial<PlayerInventory>;    // 3星通关额外奖励
  bossLevelClear: Partial<PlayerInventory>;    // Boss关通关额外奖励
}

export interface StarMilestone {
  stars: number;
  rewards: Partial<PlayerInventory>;
  unlocks?: ItemType[];  // 解锁的道具类型
}

export interface ItemLevelState {
  usageCount: Record<ItemType, number>;  // 本关已使用次数
  lastUsedTime: Record<ItemType, number>; // 上次使用时间戳（用于冷却）
}

// --- 事件（用于埋点）---
export type GameEvent =
  | { type: 'level_start'; level: number; energy_before: number }
  | { type: 'level_end'; level: number; result: 'win' | 'lose'; moves_left: number; cascades: number }
  | { type: 'energy_gate_show'; energy: number; next_regen_seconds: number }
  | { type: 'rewarded_request' }
  | { type: 'rewarded_show' }
  | { type: 'rewarded_success' }
  | { type: 'rewarded_fail'; reason: string }
  | { type: 'shuffle_triggered'; count: number }
  | { type: 'session_start' }
  | { type: 'session_end'; duration_seconds: number };
