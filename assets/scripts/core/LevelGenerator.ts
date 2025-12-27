// ============================================
// 关卡生成器
// ============================================

import type { ILevelGenerator, IBoardGenerator, IMossGenerator, IRNG } from './interfaces';
import type { LevelDef, LevelState, Goal, TileType, Cell, Board, BoardCell } from './types';
import { RNG, stableHash } from './RNG';
import { MossGenerator } from './MossGenerator';
import { MatchFinder } from './MatchFinder';

// 从 resources/configs/levels.json 加载
import levelsConfig from '../../resources/configs/levels.json';

const BOARD_SIZE = 6;
const TILE_TYPES: TileType[] = ['leaf', 'acorn', 'star', 'fish', 'bone'];

interface LevelConfigEntry {
  level: number;
  moves: number;
  goal: string;
  item?: string;
  count: number;
  pattern: string;
  density: number;
}

export class LevelGenerator implements ILevelGenerator {
  private mossGen = new MossGenerator();
  private matchFinder = new MatchFinder();

  generateLevel(levelIndex: number, playerId: string): LevelDef {
    const config = this.getLevelConfig(levelIndex);
    const seed = stableHash(playerId, levelIndex);
    const rng = new RNG(seed);

    // 构建目标
    const goals = this.buildGoals(config);

    // 计算 tile 权重
    const weights = this.calculateWeights(goals);

    // 生成苔藓
    const mossCells = this.mossGen.generateMossCells(
      config.pattern as any,
      config.density,
      rng
    );

    return {
      level_index: levelIndex,
      difficulty: levelIndex,
      seed,
      board_size: BOARD_SIZE,
      moves: config.moves,
      goals,
      blockers: {
        type: 'moss',
        pattern: config.pattern as any,
        density: config.density,
        cells: mossCells,
      },
      tile_weights: weights,
      guardrails: {
        shuffle_on_deadlock: true,
        prevent_initial_matches: true,
      },
    };
  }

  createLevelState(levelDef: LevelDef): LevelState {
    const rng = new RNG(levelDef.seed);
    const board = this.generateInitialBoard(levelDef, rng);

    return {
      levelDef,
      board,
      movesLeft: levelDef.moves,
      goals: JSON.parse(JSON.stringify(levelDef.goals)), // deep clone
      isCompleted: false,
      isFailed: false,
      cascadeCount: 0,
      shuffleCount: 0,
    };
  }

  // --- 私有方法 ---

  private getLevelConfig(levelIndex: number): LevelConfigEntry {
    const entry = levelsConfig.levels.find(l => l.level === levelIndex);
    if (entry) {
      return entry as LevelConfigEntry;
    }

    // 超过 50 关：使用程序生成无限关卡
    return this.generateInfiniteLevel(levelIndex);
  }

  /**
   * 无限关卡生成算法
   * - 基于种子的确定性随机（同关卡每次进入相同）
   * - 难度逐步提升，最高2倍基准难度
   * - 波动周期让难度有起伏
   * - 每25关一个Boss关卡
   */
  private generateInfiniteLevel(levelIndex: number): LevelConfigEntry {
    // 使用关卡号作为种子，保证每次生成相同的关卡
    const seed = levelIndex * 31337;
    const rng = new RNG(seed);

    // 计算难度系数 (50关后逐渐增加，最终趋于稳定)
    const difficultyOffset = levelIndex - 50;
    const difficultyFactor = Math.min(1 + difficultyOffset * 0.02, 2.0); // 最高2倍难度

    // 波动周期：每10关一个小周期，有时简单有时难
    const waveFactor = 0.8 + 0.4 * Math.sin(levelIndex * 0.3);

    // 步数：基础5步，根据难度和波动调整 (4-8步)
    const baseMovesVariation = rng.randInt(-1, 2);
    const moves = Math.max(4, Math.min(8, 5 + baseMovesVariation + Math.floor((1 - waveFactor) * 2)));

    // 目标类型：交替收集和清苔藓
    let goal: string;
    let item: string | undefined;
    let count: number;

    const goalRoll = rng.random();
    if (goalRoll < 0.5) {
      goal = 'collect';
      item = TILE_TYPES[rng.randInt(0, TILE_TYPES.length - 1)];
      // 收集数量：基础20，根据难度增加
      count = Math.floor(20 + difficultyOffset * 0.3 * waveFactor);
      count = Math.min(count, 35); // 上限35
    } else {
      goal = 'clear_moss';
      item = undefined;
      count = 0; // clear_moss 模式下清除所有苔藓
    }

    // 苔藓 pattern 随机选择
    const patterns = ['corners', 'edge_ring', 'center_blob', 'diagonal', 'stripes_h', 'stripes_v', 'scattered'];
    const pattern = patterns[rng.randInt(0, patterns.length - 1)];

    // 苔藓密度：基础0.6，根据难度增加，有波动
    let density = 0.6 + difficultyOffset * 0.01 * waveFactor;
    density = Math.min(density, 0.95); // 上限95%

    // Boss 关卡（每25关一个）
    const isBossLevel = levelIndex % 25 === 0;
    if (isBossLevel) {
      // Boss关：更难
      if (goal === 'collect') {
        count = Math.min(count + 5, 35);
      }
      density = Math.min(density + 0.1, 0.98);
    }

    return {
      level: levelIndex,
      moves,
      goal,
      item,
      count,
      pattern,
      density,
    };
  }

  private buildGoals(config: LevelConfigEntry): Goal[] {
    switch (config.goal) {
      case 'collect':
        return [{
          type: 'collect',
          item: config.item as TileType,
          count: config.count,
          current: 0,
        }];

      case 'clear_moss':
        return [{
          type: 'clear_moss',
          count: 0, // 0 = 清除全部
          current: 0,
        }];

      case 'combo':
        return [{
          type: 'combo',
          collect: {
            type: 'collect',
            item: config.item as TileType,
            count: config.count,
            current: 0,
          },
          clearMoss: {
            type: 'clear_moss',
            count: 0,
            current: 0,
          },
        }];

      default:
        return [{
          type: 'collect',
          item: 'leaf',
          count: 8,
          current: 0,
        }];
    }
  }

  private calculateWeights(goals: Goal[]): Record<TileType, number> {
    const weights: Record<TileType, number> = {
      leaf: 1.0,
      acorn: 1.0,
      star: 1.0,
      fish: 1.0,
      bone: 1.0,
    };

    for (const goal of goals) {
      if (goal.type === 'collect') {
        weights[goal.item] = 1.08;
      } else if (goal.type === 'combo') {
        weights[goal.collect.item] = 1.05;
      }
    }

    return weights;
  }

  private generateInitialBoard(levelDef: LevelDef, rng: IRNG): Board {
    const MAX_RETRIES = 100;

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      const board = this.createBoard(levelDef, rng);

      // 移除初始匹配
      this.removeInitialMatches(board, levelDef.tile_weights, rng);

      // 检查是否有有效移动
      if (this.matchFinder.hasValidMove(board)) {
        return board;
      }
    }

    // 兜底：强制创建有效移动
    const board = this.createBoard(levelDef, rng);
    this.forceValidMove(board, rng);
    return board;
  }

  private createBoard(levelDef: LevelDef, rng: IRNG): Board {
    const board: Board = [];
    const mossSet = new Set(
      levelDef.blockers.cells.map(c => `${c.row},${c.col}`)
    );

    for (let r = 0; r < BOARD_SIZE; r++) {
      const row: BoardCell[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile = this.randomTile(levelDef.tile_weights, rng);
        const hasMoss = mossSet.has(`${r},${c}`);

        row.push({
          tile,
          blocker: hasMoss ? { type: 'moss', layer: 1 } : null,
        });
      }
      board.push(row);
    }

    return board;
  }

  private randomTile(weights: Record<TileType, number>, rng: IRNG): { type: TileType; isSpecial: boolean } {
    const items = TILE_TYPES;
    const w = items.map(t => weights[t] || 1.0);
    const type = rng.weightedChoice(items, w);
    return { type, isSpecial: false };
  }

  private removeInitialMatches(board: Board, weights: Record<TileType, number>, rng: IRNG): void {
    let matches = this.matchFinder.findAllMatches(board);
    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (matches.length > 0 && iterations < MAX_ITERATIONS) {
      for (const match of matches) {
        // 替换匹配中的一个格子
        const cell = match.cells[Math.floor(match.cells.length / 2)];
        const oldType = board[cell.row][cell.col].tile?.type;

        // 选择不同类型
        const otherTypes = TILE_TYPES.filter(t => t !== oldType);
        const otherWeights = otherTypes.map(t => weights[t] || 1.0);
        const newType = rng.weightedChoice(otherTypes, otherWeights);

        board[cell.row][cell.col].tile = { type: newType, isSpecial: false };
      }

      matches = this.matchFinder.findAllMatches(board);
      iterations++;
    }
  }

  private forceValidMove(board: Board, rng: IRNG): void {
    // 简单策略：在相邻两格放相同类型，形成可交换消除
    const r = rng.randInt(0, BOARD_SIZE - 2);
    const c = rng.randInt(0, BOARD_SIZE - 2);
    const type = TILE_TYPES[rng.randInt(0, TILE_TYPES.length - 1)];

    // 水平放置三个相同（中间一个等待交换）
    board[r][c].tile = { type, isSpecial: false };
    board[r][c + 1].tile = { type, isSpecial: false };
    // 让 (r+1, c+1) 也是相同类型，这样交换 (r,c+1) 和 (r+1,c+1) 能形成消除
    board[r + 1][c + 1].tile = { type, isSpecial: false };
  }
}
