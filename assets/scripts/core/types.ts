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
// - whirl (旋风): 4连生成，清除一行或一列
// - lantern (灯笼): 5连生成，清除周围 3x3
export type SpecialType = 'whirl_h' | 'whirl_v' | 'lantern';

export interface Tile {
  type: TileType;
  isSpecial: boolean;
  specialType?: SpecialType;
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
