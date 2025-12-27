// ============================================
// 关卡可玩性验证器
// 使用蒙特卡洛模拟验证关卡是否可解
// ============================================

import type { Board, Cell, Goal, LevelDef, LevelState, Match, SwapAction, TileType, MatchResult } from '../types';
import type { IRNG } from './interfaces';
import { RNG } from './RNG';
import { MatchFinder } from './MatchFinder';
import { MatchResolver } from './MatchResolver';
import { LevelGenerator } from './LevelGenerator';
import { GoalTracker } from './GoalTracker';

// ============================================
// 类型定义
// ============================================

export type SimStrategy =
  | 'random'           // 随机选择有效移动
  | 'greedy_goal'      // 优先消除目标物
  | 'greedy_cascade'   // 优先触发连消
  | 'special_first'    // 优先使用特殊块
  | 'mixed';           // 混合策略（最接近真实玩家）

export interface SimulationConfig {
  iterations: number;       // 模拟次数（推荐 100-1000）
  strategies: SimStrategy[]; // 模拟策略池
  timeoutMs: number;        // 单次模拟超时
  verbose?: boolean;        // 是否输出详细日志
}

export interface SimulationRun {
  won: boolean;
  movesUsed: number;
  movesRemaining: number;
  deadlocks: number;
  specialsCreated: number;
  specialsTriggered: number;
  totalCascades: number;
  goalProgress: number;
  goalTotal: number;
}

export interface ValidationResult {
  isPlayable: boolean;           // 是否可玩（胜率 > 0）
  winRate: number;               // 模拟胜率 (0-1)
  avgMovesUsed: number;          // 平均使用步数
  avgMovesRemaining: number;     // 平均剩余步数（胜利时）
  difficultyScore: number;       // 难度评分 (1-10)
  minMovesToWin: number;         // 最少步数通关
  deadlockRate: number;          // 死局率（需要洗牌的比例）
  specialTileUsage: number;      // 特殊块使用率
  avgCascades: number;           // 平均连消次数
  confidence: number;            // 置信度（基于样本量）
}

export interface MovePreview {
  swap: SwapAction;
  matchCount: number;
  goalItemsCleared: number;
  mossCleared: number;
  expectedCascades: number;
  involvesSpecial: boolean;
  specialType?: string;
}

// ============================================
// 默认配置
// ============================================

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  iterations: 100,
  strategies: ['mixed'],
  timeoutMs: 10000,
  verbose: false,
};

const BOARD_SIZE = 6;
const TILE_TYPES: TileType[] = ['leaf', 'acorn', 'star', 'fish', 'bone'];

// ============================================
// LevelValidator 类
// ============================================

export class LevelValidator {
  private matchFinder = new MatchFinder();
  private matchResolver = new MatchResolver();
  private levelGenerator = new LevelGenerator();
  private goalTracker = new GoalTracker();

  /**
   * 验证关卡可玩性
   * @param levelDef 关卡定义
   * @param config 模拟配置
   * @returns 验证结果
   */
  validate(levelDef: LevelDef, config: SimulationConfig = DEFAULT_SIMULATION_CONFIG): ValidationResult {
    const results: SimulationRun[] = [];
    const startTime = Date.now();

    for (let i = 0; i < config.iterations; i++) {
      // 超时检查
      if (Date.now() - startTime > config.timeoutMs) {
        if (config.verbose) {
          console.warn(`Validation timeout after ${i} iterations`);
        }
        break;
      }

      // 随机选择策略
      const strategy = this.pickStrategy(config.strategies, i);

      // 运行单次模拟
      const run = this.simulateGame(levelDef, strategy, i);
      results.push(run);
    }

    return this.aggregateResults(results, levelDef);
  }

  /**
   * 快速验证（少量迭代，用于生成时筛选）
   */
  quickValidate(levelDef: LevelDef, iterations: number = 20): ValidationResult {
    return this.validate(levelDef, {
      iterations,
      strategies: ['mixed'],
      timeoutMs: 3000,
      verbose: false,
    });
  }

  /**
   * 单次游戏模拟
   */
  private simulateGame(levelDef: LevelDef, strategy: SimStrategy, runSeed: number): SimulationRun {
    // 创建独立的 RNG 实例
    const rng = new RNG(levelDef.seed + runSeed * 7919);

    // 创建关卡状态
    const state = this.createSimulationState(levelDef, rng);

    let deadlocks = 0;
    let specialsCreated = 0;
    let specialsTriggered = 0;
    let totalCascades = 0;
    const maxIterations = 200; // 防止无限循环
    let iterations = 0;

    while (state.movesLeft > 0 && !state.isCompleted && !state.isFailed && iterations < maxIterations) {
      iterations++;

      // 获取所有有效移动
      const validMoves = this.matchFinder.getValidMoves(state.board);

      if (validMoves.length === 0) {
        // 死局，需要洗牌
        deadlocks++;
        this.shuffleBoard(state, rng);

        // 洗牌后仍无解，失败
        if (!this.matchFinder.hasValidMove(state.board)) {
          state.isFailed = true;
          break;
        }
        continue;
      }

      // 根据策略选择移动
      const move = this.selectMove(validMoves, state, strategy, rng);

      // 执行移动
      const result = this.executeMove(state, move, rng);

      // 统计
      specialsCreated += result.specialsCreated;
      specialsTriggered += result.specialsTriggered;
      totalCascades += result.cascadeCount;

      // 更新目标进度
      this.updateGoals(state, result);

      // 检查胜利
      if (this.goalTracker.isAllCompleted(state.goals)) {
        state.isCompleted = true;
      }

      // 减少步数
      state.movesLeft--;

      // 检查失败
      if (state.movesLeft <= 0 && !state.isCompleted) {
        state.isFailed = true;
      }
    }

    // 计算目标进度
    const { progress, total } = this.calculateGoalProgress(state.goals);

    return {
      won: state.isCompleted,
      movesUsed: levelDef.moves - state.movesLeft,
      movesRemaining: state.movesLeft,
      deadlocks,
      specialsCreated,
      specialsTriggered,
      totalCascades,
      goalProgress: progress,
      goalTotal: total,
    };
  }

  /**
   * 创建模拟用的游戏状态
   */
  private createSimulationState(levelDef: LevelDef, rng: IRNG): LevelState {
    const board = this.createBoard(levelDef, rng);

    // 移除初始匹配
    this.removeInitialMatches(board, levelDef.tile_weights, rng);

    // 确保有有效移动
    if (!this.matchFinder.hasValidMove(board)) {
      this.forceValidMove(board, rng);
    }

    return {
      levelDef,
      board,
      movesLeft: levelDef.moves,
      goals: JSON.parse(JSON.stringify(levelDef.goals)),
      isCompleted: false,
      isFailed: false,
      cascadeCount: 0,
      shuffleCount: 0,
    };
  }

  /**
   * 创建棋盘
   */
  private createBoard(levelDef: LevelDef, rng: IRNG): Board {
    const board: Board = [];
    const mossSet = new Set(levelDef.blockers.cells.map(c => `${c.row},${c.col}`));

    for (let r = 0; r < BOARD_SIZE; r++) {
      const row = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile = this.randomTile(levelDef.tile_weights, rng);
        const hasMoss = mossSet.has(`${r},${c}`);
        row.push({
          tile,
          blocker: hasMoss ? { type: 'moss' as const, layer: 1 } : null,
        });
      }
      board.push(row);
    }

    return board;
  }

  /**
   * 选择移动策略
   */
  private selectMove(
    moves: SwapAction[],
    state: LevelState,
    strategy: SimStrategy,
    rng: IRNG
  ): SwapAction {
    if (moves.length === 0) {
      throw new Error('No valid moves available');
    }

    switch (strategy) {
      case 'random':
        return moves[rng.randInt(0, moves.length - 1)];

      case 'greedy_goal':
        return this.selectGreedyGoalMove(moves, state, rng);

      case 'greedy_cascade':
        return this.selectGreedyCascadeMove(moves, state, rng);

      case 'special_first':
        return this.selectSpecialFirstMove(moves, state, rng);

      case 'mixed':
      default:
        return this.selectMixedMove(moves, state, rng);
    }
  }

  /**
   * 贪心目标策略：优先消除目标物
   */
  private selectGreedyGoalMove(moves: SwapAction[], state: LevelState, rng: IRNG): SwapAction {
    const previews = moves.map(move => this.previewMove(move, state));

    // 按目标物消除数量排序
    previews.sort((a, b) => b.goalItemsCleared - a.goalItemsCleared);

    // 如果最高分相同，随机选择
    const best = previews[0];
    const ties = previews.filter(p => p.goalItemsCleared === best.goalItemsCleared);

    return ties[rng.randInt(0, ties.length - 1)].swap;
  }

  /**
   * 贪心连消策略：优先触发更多消除
   */
  private selectGreedyCascadeMove(moves: SwapAction[], state: LevelState, rng: IRNG): SwapAction {
    const previews = moves.map(move => this.previewMove(move, state));

    // 按预期连消次数排序
    previews.sort((a, b) => b.expectedCascades - a.expectedCascades);

    const best = previews[0];
    const ties = previews.filter(p => p.expectedCascades === best.expectedCascades);

    return ties[rng.randInt(0, ties.length - 1)].swap;
  }

  /**
   * 特殊块优先策略
   */
  private selectSpecialFirstMove(moves: SwapAction[], state: LevelState, rng: IRNG): SwapAction {
    const previews = moves.map(move => this.previewMove(move, state));

    // 优先选择涉及特殊块的移动
    const specialMoves = previews.filter(p => p.involvesSpecial);
    if (specialMoves.length > 0) {
      return specialMoves[rng.randInt(0, specialMoves.length - 1)].swap;
    }

    // 否则选择能生成特殊块的移动（4连以上）
    const createSpecialMoves = previews.filter(p => p.matchCount >= 4);
    if (createSpecialMoves.length > 0) {
      return createSpecialMoves[rng.randInt(0, createSpecialMoves.length - 1)].swap;
    }

    // 随机选择
    return moves[rng.randInt(0, moves.length - 1)];
  }

  /**
   * 混合策略：模拟真实玩家行为
   * 70% 贪心目标，20% 贪心连消，10% 随机
   */
  private selectMixedMove(moves: SwapAction[], state: LevelState, rng: IRNG): SwapAction {
    const roll = rng.random();

    if (roll < 0.7) {
      return this.selectGreedyGoalMove(moves, state, rng);
    } else if (roll < 0.9) {
      return this.selectGreedyCascadeMove(moves, state, rng);
    } else {
      return moves[rng.randInt(0, moves.length - 1)];
    }
  }

  /**
   * 预览移动效果（不实际执行）
   */
  private previewMove(swap: SwapAction, state: LevelState): MovePreview {
    // 克隆棋盘
    const testBoard = this.cloneBoard(state.board);

    // 检查是否涉及特殊块
    const fromTile = testBoard[swap.from.row][swap.from.col].tile;
    const toTile = testBoard[swap.to.row][swap.to.col].tile;
    const involvesSpecial = !!(fromTile?.isSpecial || toTile?.isSpecial);
    const specialType = fromTile?.specialType || toTile?.specialType;

    // 执行交换
    const temp = testBoard[swap.from.row][swap.from.col].tile;
    testBoard[swap.from.row][swap.from.col].tile = testBoard[swap.to.row][swap.to.col].tile;
    testBoard[swap.to.row][swap.to.col].tile = temp;

    // 检测匹配
    const matches = this.matchFinder.findAllMatches(testBoard);

    // 计算目标物消除数量
    let goalItemsCleared = 0;
    let mossCleared = 0;

    for (const goal of state.goals) {
      if (goal.type === 'collect') {
        for (const match of matches) {
          if (match.type === goal.item) {
            goalItemsCleared += match.cells.length;
          }
        }
      }
    }

    // 计算苔藓清除
    for (const match of matches) {
      for (const cell of match.cells) {
        if (testBoard[cell.row][cell.col].blocker?.type === 'moss') {
          mossCleared++;
        }
      }
    }

    // 估算连消次数（简单估算：匹配数量 / 2）
    const expectedCascades = Math.max(1, Math.floor(matches.length / 2));

    const totalMatchLength = matches.reduce((sum, m) => sum + m.cells.length, 0);

    return {
      swap,
      matchCount: totalMatchLength,
      goalItemsCleared,
      mossCleared,
      expectedCascades,
      involvesSpecial,
      specialType,
    };
  }

  /**
   * 执行移动
   */
  private executeMove(
    state: LevelState,
    swap: SwapAction,
    rng: IRNG
  ): { specialsCreated: number; specialsTriggered: number; cascadeCount: number; collected: Record<TileType, number>; mossCleared: number } {
    // 执行交换
    const temp = state.board[swap.from.row][swap.from.col].tile;
    state.board[swap.from.row][swap.from.col].tile = state.board[swap.to.row][swap.to.col].tile;
    state.board[swap.to.row][swap.to.col].tile = temp;

    let specialsCreated = 0;
    let specialsTriggered = 0;
    let cascadeCount = 0;
    const collected: Record<TileType, number> = { leaf: 0, acorn: 0, star: 0, fish: 0, bone: 0 };
    let mossCleared = 0;

    // 消除循环
    let maxCascades = 50;
    while (maxCascades-- > 0) {
      const matches = this.matchFinder.findAllMatches(state.board);
      if (matches.length === 0) break;

      cascadeCount++;

      // 处理每个匹配
      for (const match of matches) {
        // 统计收集
        collected[match.type] += match.cells.length;

        // 检查特殊块触发
        for (const cell of match.cells) {
          const tile = state.board[cell.row][cell.col].tile;
          if (tile?.isSpecial) {
            specialsTriggered++;
            this.triggerSpecialTile(state.board, cell);
          }

          // 处理苔藓
          const blocker = state.board[cell.row][cell.col].blocker;
          if (blocker?.type === 'moss') {
            blocker.layer--;
            if (blocker.layer <= 0) {
              state.board[cell.row][cell.col].blocker = null;
              mossCleared++;
            }
          }
        }

        // 清除匹配的格子
        const centerIdx = Math.floor(match.cells.length / 2);
        for (let i = 0; i < match.cells.length; i++) {
          const cell = match.cells[i];
          // 4连以上在中心位置生成特殊块
          if (match.length >= 4 && i === centerIdx) {
            specialsCreated++;
            state.board[cell.row][cell.col].tile = {
              type: match.type,
              isSpecial: true,
              specialType: match.length >= 5 ? 'lantern' : (match.isHorizontal ? 'whirl_h' : 'whirl_v'),
            };
          } else {
            state.board[cell.row][cell.col].tile = null;
          }
        }
      }

      // 下落
      this.applyGravity(state.board);

      // 填充
      this.fillEmpty(state.board, state.levelDef.tile_weights, rng);
    }

    return { specialsCreated, specialsTriggered, cascadeCount, collected, mossCleared };
  }

  /**
   * 触发特殊块效果
   */
  private triggerSpecialTile(board: Board, cell: Cell): void {
    const tile = board[cell.row][cell.col].tile;
    if (!tile?.isSpecial) return;

    const affectedCells: Cell[] = [];

    switch (tile.specialType) {
      case 'whirl_h':
        for (let c = 0; c < BOARD_SIZE; c++) {
          affectedCells.push({ row: cell.row, col: c });
        }
        break;

      case 'whirl_v':
        for (let r = 0; r < BOARD_SIZE; r++) {
          affectedCells.push({ row: r, col: cell.col });
        }
        break;

      case 'lantern':
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = cell.row + dr;
            const c = cell.col + dc;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
              affectedCells.push({ row: r, col: c });
            }
          }
        }
        break;
    }

    // 清除受影响的格子
    for (const c of affectedCells) {
      const boardCell = board[c.row][c.col];
      if (boardCell.blocker?.type === 'moss') {
        boardCell.blocker.layer--;
        if (boardCell.blocker.layer <= 0) {
          boardCell.blocker = null;
        }
      }
      boardCell.tile = null;
    }
  }

  /**
   * 应用重力（下落）
   */
  private applyGravity(board: Board): void {
    for (let c = 0; c < BOARD_SIZE; c++) {
      let writeRow = BOARD_SIZE - 1;
      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        if (board[r][c].tile !== null) {
          if (r !== writeRow) {
            board[writeRow][c].tile = board[r][c].tile;
            board[r][c].tile = null;
          }
          writeRow--;
        }
      }
    }
  }

  /**
   * 填充空位
   */
  private fillEmpty(board: Board, weights: Record<TileType, number>, rng: IRNG): void {
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (board[r][c].tile === null) {
          board[r][c].tile = this.randomTile(weights, rng);
        }
      }
    }
  }

  /**
   * 洗牌
   */
  private shuffleBoard(state: LevelState, rng: IRNG): void {
    const tiles = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (state.board[r][c].tile) {
          tiles.push(state.board[r][c].tile);
        }
      }
    }

    // Fisher-Yates 洗牌
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = rng.randInt(0, i);
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    // 放回棋盘
    let idx = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (state.board[r][c].tile) {
          state.board[r][c].tile = tiles[idx++];
        }
      }
    }

    // 移除初始匹配
    this.removeInitialMatches(state.board, state.levelDef.tile_weights, rng);

    state.shuffleCount++;
  }

  /**
   * 更新目标进度
   */
  private updateGoals(
    state: LevelState,
    result: { collected: Record<TileType, number>; mossCleared: number }
  ): void {
    for (const goal of state.goals) {
      if (goal.type === 'collect') {
        goal.current += result.collected[goal.item] || 0;
      } else if (goal.type === 'clear_moss') {
        goal.current += result.mossCleared;
      } else if (goal.type === 'combo') {
        goal.collect.current += result.collected[goal.collect.item] || 0;
        goal.clearMoss.current += result.mossCleared;
      }
    }
  }

  /**
   * 计算目标进度
   */
  private calculateGoalProgress(goals: Goal[]): { progress: number; total: number } {
    let progress = 0;
    let total = 0;

    for (const goal of goals) {
      if (goal.type === 'collect') {
        progress += Math.min(goal.current, goal.count);
        total += goal.count;
      } else if (goal.type === 'clear_moss') {
        progress += goal.current;
        total += goal.count || goal.current; // count=0 表示清除全部
      } else if (goal.type === 'combo') {
        progress += Math.min(goal.collect.current, goal.collect.count);
        total += goal.collect.count;
        progress += goal.clearMoss.current;
        total += goal.clearMoss.count || goal.clearMoss.current;
      }
    }

    return { progress, total: Math.max(total, 1) };
  }

  /**
   * 聚合模拟结果
   */
  private aggregateResults(results: SimulationRun[], levelDef: LevelDef): ValidationResult {
    if (results.length === 0) {
      return {
        isPlayable: false,
        winRate: 0,
        avgMovesUsed: 0,
        avgMovesRemaining: 0,
        difficultyScore: 10,
        minMovesToWin: Infinity,
        deadlockRate: 1,
        specialTileUsage: 0,
        avgCascades: 0,
        confidence: 0,
      };
    }

    const wins = results.filter(r => r.won);
    const winRate = wins.length / results.length;

    const avgMovesUsed = results.reduce((sum, r) => sum + r.movesUsed, 0) / results.length;
    const avgMovesRemaining = wins.length > 0
      ? wins.reduce((sum, r) => sum + r.movesRemaining, 0) / wins.length
      : 0;

    const minMovesToWin = wins.length > 0
      ? Math.min(...wins.map(r => r.movesUsed))
      : Infinity;

    const totalDeadlocks = results.reduce((sum, r) => sum + r.deadlocks, 0);
    const deadlockRate = totalDeadlocks / (results.length * levelDef.moves);

    const totalSpecials = results.reduce((sum, r) => sum + r.specialsTriggered, 0);
    const specialTileUsage = totalSpecials / results.length;

    const avgCascades = results.reduce((sum, r) => sum + r.totalCascades, 0) / results.length;

    // 难度评分：基于胜率和剩余步数
    // 胜率越低、剩余步数越少 = 难度越高
    const difficultyScore = this.calculateDifficultyScore(winRate, avgMovesRemaining, levelDef.moves);

    // 置信度：基于样本量
    const confidence = Math.min(1, results.length / 100);

    return {
      isPlayable: winRate > 0,
      winRate,
      avgMovesUsed,
      avgMovesRemaining,
      difficultyScore,
      minMovesToWin,
      deadlockRate,
      specialTileUsage,
      avgCascades,
      confidence,
    };
  }

  /**
   * 计算难度评分 (1-10)
   */
  private calculateDifficultyScore(winRate: number, avgRemaining: number, totalMoves: number): number {
    // 基于胜率的基础分 (0-7)
    const winRateScore = (1 - winRate) * 7;

    // 基于剩余步数比例的加分 (0-3)
    const remainingRatio = avgRemaining / totalMoves;
    const remainingScore = (1 - remainingRatio) * 3;

    const raw = winRateScore + remainingScore;
    return Math.min(10, Math.max(1, Math.round(raw * 10) / 10));
  }

  /**
   * 选择策略
   */
  private pickStrategy(strategies: SimStrategy[], index: number): SimStrategy {
    return strategies[index % strategies.length];
  }

  /**
   * 工具方法
   */
  private randomTile(weights: Record<TileType, number>, rng: IRNG): { type: TileType; isSpecial: boolean } {
    const items = TILE_TYPES;
    const w = items.map(t => weights[t] || 1.0);
    const totalWeight = w.reduce((sum, x) => sum + x, 0);
    let roll = rng.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      roll -= w[i];
      if (roll <= 0) {
        return { type: items[i], isSpecial: false };
      }
    }

    return { type: items[items.length - 1], isSpecial: false };
  }

  private cloneBoard(board: Board): Board {
    return board.map(row => row.map(cell => ({
      tile: cell.tile ? { ...cell.tile } : null,
      blocker: cell.blocker ? { ...cell.blocker } : null,
    })));
  }

  private removeInitialMatches(board: Board, weights: Record<TileType, number>, rng: IRNG): void {
    let matches = this.matchFinder.findAllMatches(board);
    let iterations = 0;
    const maxIterations = 1000;

    while (matches.length > 0 && iterations < maxIterations) {
      for (const match of matches) {
        const cell = match.cells[Math.floor(match.cells.length / 2)];
        const oldType = board[cell.row][cell.col].tile?.type;

        const otherTypes = TILE_TYPES.filter(t => t !== oldType);
        const newType = otherTypes[rng.randInt(0, otherTypes.length - 1)];

        board[cell.row][cell.col].tile = { type: newType, isSpecial: false };
      }

      matches = this.matchFinder.findAllMatches(board);
      iterations++;
    }
  }

  private forceValidMove(board: Board, rng: IRNG): void {
    const r = rng.randInt(0, BOARD_SIZE - 2);
    const c = rng.randInt(0, BOARD_SIZE - 2);
    const type = TILE_TYPES[rng.randInt(0, TILE_TYPES.length - 1)];

    board[r][c].tile = { type, isSpecial: false };
    board[r][c + 1].tile = { type, isSpecial: false };
    board[r + 1][c + 1].tile = { type, isSpecial: false };
  }
}
