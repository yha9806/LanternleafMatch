// ============================================
// 消除执行器
// 职责：执行消除、处理苔藓、生成特殊块、下落填充
// ============================================

import type { IMatchResolver, IRNG } from './interfaces';
import type {
  Board, BoardCell, Cell, Match, MatchResult, Tile, TileType, SpecialType
} from './types';
import { MatchFinder } from './MatchFinder';

const BOARD_SIZE = 6;
const TILE_TYPES: TileType[] = ['leaf', 'acorn', 'star', 'fish', 'bone'];

export class MatchResolver implements IMatchResolver {
  private matchFinder = new MatchFinder();

  /**
   * 执行消除：移除匹配的格子，处理苔藓，生成特殊块
   */
  resolveMatches(board: Board, matches: Match[]): MatchResult {
    const clearedMoss: Cell[] = [];
    const collectedTiles: Record<TileType, number> = {
      leaf: 0, acorn: 0, star: 0, fish: 0, bone: 0
    };
    const clearedCells = new Set<string>();

    // 1. 处理每个匹配
    for (const match of matches) {
      // 记录收集的 tile 类型
      collectedTiles[match.type] += match.cells.length;

      // 确定特殊块生成位置（匹配中心）
      const specialCell = match.cells[Math.floor(match.cells.length / 2)];

      for (const cell of match.cells) {
        const key = cellKey(cell);
        if (clearedCells.has(key)) continue;
        clearedCells.add(key);

        const boardCell = board[cell.row][cell.col];

        // 处理苔藓（消除发生在苔藓上时清除苔藓）
        if (boardCell.blocker?.type === 'moss') {
          boardCell.blocker.layer -= 1;
          if (boardCell.blocker.layer <= 0) {
            boardCell.blocker = null;
            clearedMoss.push(cell);
          }
        }

        // 清除 tile
        boardCell.tile = null;
      }

      // 2. 生成特殊块（4连/5连）
      if (match.length >= 4) {
        const specialType = this.determineSpecialType(match);
        board[specialCell.row][specialCell.col].tile = {
          type: match.type,
          isSpecial: true,
          specialType,
        };
      }
    }

    return {
      matches,
      clearedMoss,
      collectedTiles,
      cascadeIndex: 0,
    };
  }

  /**
   * 触发特殊块效果
   */
  triggerSpecialTile(board: Board, cell: Cell): Cell[] {
    const tile = board[cell.row][cell.col].tile;
    if (!tile?.isSpecial) return [];

    const affectedCells: Cell[] = [];

    switch (tile.specialType) {
      case 'whirl_h': // 清除整行
        for (let c = 0; c < BOARD_SIZE; c++) {
          affectedCells.push({ row: cell.row, col: c });
        }
        break;

      case 'whirl_v': // 清除整列
        for (let r = 0; r < BOARD_SIZE; r++) {
          affectedCells.push({ row: r, col: cell.col });
        }
        break;

      case 'lantern': // 清除 3x3
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
        boardCell.blocker.layer -= 1;
        if (boardCell.blocker.layer <= 0) {
          boardCell.blocker = null;
        }
      }
      boardCell.tile = null;
    }

    return affectedCells;
  }

  /**
   * 处理下落：格子下落填补空位
   */
  applyGravity(board: Board): Board {
    for (let c = 0; c < BOARD_SIZE; c++) {
      // 从底部向上扫描
      let writeRow = BOARD_SIZE - 1;

      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        if (board[r][c].tile !== null) {
          if (r !== writeRow) {
            // 移动 tile 到空位
            board[writeRow][c].tile = board[r][c].tile;
            board[r][c].tile = null;
          }
          writeRow--;
        }
      }
    }
    return board;
  }

  /**
   * 填充空位：从顶部生成新格子
   */
  fillEmptyCells(board: Board, weights: Record<TileType, number>, rng: IRNG): Board {
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (board[r][c].tile === null) {
          board[r][c].tile = this.randomTile(weights, rng);
        }
      }
    }
    return board;
  }

  /**
   * 完整的消除-下落-填充循环（可能多次连消）
   */
  resolveUntilStable(
    board: Board,
    weights: Record<TileType, number>,
    rng: IRNG
  ): { board: Board; results: MatchResult[] } {
    const results: MatchResult[] = [];
    let cascadeIndex = 0;
    const MAX_CASCADES = 50; // 防止无限循环

    while (cascadeIndex < MAX_CASCADES) {
      const matches = this.matchFinder.findAllMatches(board);
      if (matches.length === 0) break;

      // 执行消除
      const result = this.resolveMatches(board, matches);
      result.cascadeIndex = cascadeIndex;
      results.push(result);

      // 处理特殊块连锁
      this.processSpecialChain(board);

      // 下落
      this.applyGravity(board);

      // 填充
      this.fillEmptyCells(board, weights, rng);

      cascadeIndex++;
    }

    return { board, results };
  }

  // --- 私有方法 ---

  private determineSpecialType(match: Match): SpecialType {
    if (match.length >= 5) {
      return 'lantern'; // 5连 = 灯笼（炸弹）
    }
    // 4连 = 旋风（根据方向决定清除行或列）
    return match.isHorizontal ? 'whirl_h' : 'whirl_v';
  }

  private processSpecialChain(board: Board): void {
    // 查找被消除位置的相邻特殊块
    // MVP: 简化处理，不做复杂连锁
    // 后续可扩展：特殊块互相触发
  }

  private randomTile(weights: Record<TileType, number>, rng: IRNG): Tile {
    const items = TILE_TYPES;
    const w = items.map(t => weights[t] || 1.0);
    const type = rng.weightedChoice(items, w);
    return { type, isSpecial: false };
  }
}

function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}
