// ============================================
// 消除检测器
// ============================================

import type { IMatchFinder } from './interfaces';
import type { Board, Cell, Match, SwapAction, TileType } from '../types';

const BOARD_SIZE = 6;

export class MatchFinder implements IMatchFinder {

  /**
   * 查找所有匹配（3连及以上）
   */
  findAllMatches(board: Board): Match[] {
    const matches: Match[] = [];
    const visited = new Set<string>();

    // 水平扫描
    for (let r = 0; r < BOARD_SIZE; r++) {
      let c = 0;
      while (c < BOARD_SIZE) {
        const tile = board[r][c].tile;
        if (!tile) { c++; continue; }

        const type = tile.type;
        let len = 1;

        while (c + len < BOARD_SIZE) {
          const next = board[r][c + len].tile;
          if (next && next.type === type) {
            len++;
          } else {
            break;
          }
        }

        if (len >= 3) {
          const cells: Cell[] = [];
          for (let i = 0; i < len; i++) {
            const cell = {row: r, col: c + i};
            cells.push(cell);
            visited.add(cellKey(cell));
          }
          matches.push(this.createMatch(cells, type, len, true)); // horizontal
        }

        c += len;
      }
    }

    // 垂直扫描
    for (let c = 0; c < BOARD_SIZE; c++) {
      let r = 0;
      while (r < BOARD_SIZE) {
        const tile = board[r][c].tile;
        if (!tile) { r++; continue; }

        const type = tile.type;
        let len = 1;

        while (r + len < BOARD_SIZE) {
          const next = board[r + len][c].tile;
          if (next && next.type === type) {
            len++;
          } else {
            break;
          }
        }

        if (len >= 3) {
          const cells: Cell[] = [];
          for (let i = 0; i < len; i++) {
            cells.push({row: r + i, col: c});
          }
          matches.push(this.createMatch(cells, type, len, false)); // vertical
        }

        r += len;
      }
    }

    return this.mergeOverlappingMatches(matches);
  }

  /**
   * 检查交换后是否能形成消除
   */
  wouldSwapMatch(board: Board, swap: SwapAction): boolean {
    // 检查相邻
    if (!this.isAdjacent(swap.from, swap.to)) {
      return false;
    }

    // 模拟交换
    const testBoard = this.cloneBoard(board);
    this.swapTiles(testBoard, swap.from, swap.to);

    // 只检查交换涉及的两个位置
    return (
      this.hasMatchAt(testBoard, swap.from) ||
      this.hasMatchAt(testBoard, swap.to)
    );
  }

  /**
   * 检查棋盘是否有至少一个有效移动
   */
  hasValidMove(board: Board): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        // 向右交换
        if (c < BOARD_SIZE - 1) {
          if (this.wouldSwapMatch(board, {
            from: {row: r, col: c},
            to: {row: r, col: c + 1}
          })) {
            return true;
          }
        }
        // 向下交换
        if (r < BOARD_SIZE - 1) {
          if (this.wouldSwapMatch(board, {
            from: {row: r, col: c},
            to: {row: r + 1, col: c}
          })) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * 获取所有可行的交换操作
   */
  getValidMoves(board: Board): SwapAction[] {
    const moves: SwapAction[] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        // 向右
        if (c < BOARD_SIZE - 1) {
          const swap: SwapAction = {
            from: {row: r, col: c},
            to: {row: r, col: c + 1}
          };
          if (this.wouldSwapMatch(board, swap)) {
            moves.push(swap);
          }
        }
        // 向下
        if (r < BOARD_SIZE - 1) {
          const swap: SwapAction = {
            from: {row: r, col: c},
            to: {row: r + 1, col: c}
          };
          if (this.wouldSwapMatch(board, swap)) {
            moves.push(swap);
          }
        }
      }
    }

    return moves;
  }

  // --- 私有方法 ---

  private createMatch(cells: Cell[], type: TileType, length: number, isHorizontal: boolean): Match {
    let specialType: 'whirl_h' | 'whirl_v' | 'lantern' | undefined;
    if (length >= 5) {
      specialType = 'lantern';
    } else if (length === 4) {
      specialType = isHorizontal ? 'whirl_h' : 'whirl_v';
    }

    return {
      cells,
      type,
      length,
      isHorizontal,
      isSpecial: length >= 4,
      specialType,
    };
  }

  private isAdjacent(a: Cell, b: Cell): boolean {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  private cloneBoard(board: Board): Board {
    return board.map(row => row.map(cell => ({
      tile: cell.tile ? {...cell.tile} : null,
      blocker: cell.blocker ? {...cell.blocker} : null,
    })));
  }

  private swapTiles(board: Board, a: Cell, b: Cell): void {
    const temp = board[a.row][a.col].tile;
    board[a.row][a.col].tile = board[b.row][b.col].tile;
    board[b.row][b.col].tile = temp;
  }

  private hasMatchAt(board: Board, cell: Cell): boolean {
    const tile = board[cell.row][cell.col].tile;
    if (!tile) return false;

    const type = tile.type;

    // 水平检查
    let hCount = 1;
    for (let c = cell.col - 1; c >= 0; c--) {
      if (board[cell.row][c].tile?.type === type) hCount++;
      else break;
    }
    for (let c = cell.col + 1; c < BOARD_SIZE; c++) {
      if (board[cell.row][c].tile?.type === type) hCount++;
      else break;
    }
    if (hCount >= 3) return true;

    // 垂直检查
    let vCount = 1;
    for (let r = cell.row - 1; r >= 0; r--) {
      if (board[r][cell.col].tile?.type === type) vCount++;
      else break;
    }
    for (let r = cell.row + 1; r < BOARD_SIZE; r++) {
      if (board[r][cell.col].tile?.type === type) vCount++;
      else break;
    }
    if (vCount >= 3) return true;

    return false;
  }

  /**
   * 合并重叠的匹配（L形、T形等）
   */
  private mergeOverlappingMatches(matches: Match[]): Match[] {
    // MVP: 暂不合并，后续可优化
    return matches;
  }
}

function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}
