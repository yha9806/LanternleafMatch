// ============================================
// 核心模块接口契约
// ============================================

import type {
  Board, Cell, Tile, TileType, Match, MatchResult,
  SwapAction, LevelDef, LevelState, EnergyState, Goal,
  PatternType
} from './types';

// ============================================
// 1. MatchFinder - 消除检测
// ============================================
export interface IMatchFinder {
  /**
   * 查找棋盘上所有可消除的匹配
   * @returns 所有匹配（3连及以上）
   */
  findAllMatches(board: Board): Match[];

  /**
   * 检查交换后是否能形成消除
   */
  wouldSwapMatch(board: Board, swap: SwapAction): boolean;

  /**
   * 检查棋盘是否有至少一个有效移动
   */
  hasValidMove(board: Board): boolean;

  /**
   * 获取所有可行的交换操作（用于提示）
   */
  getValidMoves(board: Board): SwapAction[];
}

// ============================================
// 2. MatchResolver - 消除执行与结算
// ============================================
export interface IMatchResolver {
  /**
   * 执行消除：移除匹配的格子，处理苔藓，生成特殊块
   * @returns 消除结果（收集数、清除的苔藓等）
   */
  resolveMatches(board: Board, matches: Match[]): MatchResult;

  /**
   * 处理下落：格子下落填补空位
   * @returns 新棋盘状态
   */
  applyGravity(board: Board): Board;

  /**
   * 填充空位：从顶部生成新格子
   */
  fillEmptyCells(board: Board, weights: Record<TileType, number>, rng: IRNG): Board;

  /**
   * 完整的消除-下落-填充循环（可能多次连消）
   */
  resolveUntilStable(
    board: Board,
    weights: Record<TileType, number>,
    rng: IRNG
  ): { board: Board; results: MatchResult[] };
}

// ============================================
// 3. BoardGenerator - 棋盘生成
// ============================================
export interface IBoardGenerator {
  /**
   * 生成初始棋盘
   * 保证：无初始三连、至少有一步可行
   */
  generateInitialBoard(
    size: 6,
    weights: Record<TileType, number>,
    mossCells: Cell[],
    rng: IRNG
  ): Board;

  /**
   * 洗牌（保持格子数量，打乱位置）
   * 保证：洗牌后至少有一步可行
   */
  shuffle(board: Board, rng: IRNG): Board;
}

// ============================================
// 4. MossGenerator - 苔藓生成
// ============================================
export interface IMossGenerator {
  /**
   * 根据 pattern 和 density 生成苔藓位置
   */
  generateMossCells(
    pattern: PatternType,
    density: number,
    rng: IRNG
  ): Cell[];

  /**
   * 获取 pattern 的 BaseMask
   */
  getBaseMask(pattern: PatternType): Cell[];
}

// ============================================
// 5. LevelGenerator - 关卡生成
// ============================================
export interface ILevelGenerator {
  /**
   * 根据关卡索引生成完整关卡定义
   */
  generateLevel(levelIndex: number, playerId: string): LevelDef;

  /**
   * 从关卡定义创建初始游戏状态
   */
  createLevelState(levelDef: LevelDef): LevelState;
}

// ============================================
// 6. GoalTracker - 目标追踪
// ============================================
export interface IGoalTracker {
  /**
   * 更新目标进度
   */
  updateProgress(goals: Goal[], result: MatchResult): Goal[];

  /**
   * 检查是否全部完成
   */
  isAllCompleted(goals: Goal[]): boolean;

  /**
   * 获取目标完成百分比
   */
  getProgress(goals: Goal[]): number;
}

// ============================================
// 7. EnergyManager - 体力管理
// ============================================
export interface IEnergyManager {
  /**
   * 获取当前体力（含离线回充计算）
   */
  getCurrentEnergy(state: EnergyState, now: number): EnergyState;

  /**
   * 消耗体力
   * @returns 是否成功（体力不足返回 false）
   */
  consumeEnergy(state: EnergyState): { success: boolean; newState: EnergyState };

  /**
   * 广告奖励体力
   * @returns 是否成功（达到频控上限返回 false）
   */
  rewardFromAd(state: EnergyState, now: number): { success: boolean; newState: EnergyState };

  /**
   * 获取下次回充的剩余秒数
   */
  getNextRegenSeconds(state: EnergyState, now: number): number;

  /**
   * 检查是否在新手保护期
   */
  isInNewbieProtection(currentLevel: number): boolean;
}

// ============================================
// 8. RNG - 可复现随机数生成器
// ============================================
export interface IRNG {
  /**
   * 生成 [0, 1) 的随机数
   */
  random(): number;

  /**
   * 生成 [min, max] 的整数
   */
  randInt(min: number, max: number): number;

  /**
   * 从数组中随机选择 k 个元素
   */
  sample<T>(array: T[], k: number): T[];

  /**
   * 打乱数组
   */
  shuffle<T>(array: T[]): T[];

  /**
   * 根据权重随机选择
   */
  weightedChoice<T>(items: T[], weights: number[]): T;
}

// ============================================
// 9. GameController - 游戏主控制器
// ============================================
export interface IGameController {
  /**
   * 开始关卡
   */
  startLevel(levelIndex: number): LevelState;

  /**
   * 执行交换
   * @returns 交换结果（是否有效、消除结果、是否胜利/失败）
   */
  executeSwap(swap: SwapAction): {
    valid: boolean;
    results: MatchResult[];
    state: LevelState;
  };

  /**
   * 暂停/恢复
   */
  pause(): void;
  resume(): void;

  /**
   * 重新开始当前关卡
   */
  restart(): LevelState;
}

// ============================================
// 10. EventBus - 事件总线（用于解耦）
// ============================================
export interface IEventBus {
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (data: unknown) => void): () => void;
  off(event: string, handler: (data: unknown) => void): void;
}
