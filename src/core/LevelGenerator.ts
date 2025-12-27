// ============================================
// 关卡生成器
// ============================================

import type { ILevelGenerator, IBoardGenerator, IMossGenerator, IRNG } from './interfaces';
import type { LevelDef, LevelState, Goal, TileType, Cell, Board, BoardCell } from '../types';
import { RNG, stableHash } from './RNG';
import { MossGenerator } from './MossGenerator';
import { MatchFinder } from './MatchFinder';

// 从 config/levels.json 加载
import levelsConfig from '../../config/levels.json';

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

    // 超过 50 关：基于最后一关参数 + 难度递增
    const lastEntry = levelsConfig.levels[levelsConfig.levels.length - 1] as LevelConfigEntry;
    return {
      ...lastEntry,
      level: levelIndex,
      count: Math.min(lastEntry.count + Math.floor((levelIndex - 50) / 5), 20),
      density: Math.min(lastEntry.density + (levelIndex - 50) * 0.005, 0.35),
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
