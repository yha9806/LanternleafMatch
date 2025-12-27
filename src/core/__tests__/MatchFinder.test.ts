import { describe, it, expect } from 'vitest';
import { MatchFinder } from '../MatchFinder';
import type { Board, BoardCell, TileType } from '../../types';

describe('MatchFinder', () => {
  const finder = new MatchFinder();

  // 辅助函数：创建简单棋盘
  function createBoard(pattern: string[][]): Board {
    return pattern.map(row =>
      row.map(type => ({
        tile: type ? { type: type as TileType, isSpecial: false } : null,
        blocker: null,
      }))
    );
  }

  describe('findAllMatches', () => {
    it('应该找到水平三连', () => {
      const board = createBoard([
        ['leaf', 'leaf', 'leaf', 'star', 'fish', 'bone'],
        ['star', 'fish', 'bone', 'acorn', 'leaf', 'star'],
        ['fish', 'bone', 'acorn', 'leaf', 'star', 'fish'],
        ['bone', 'acorn', 'leaf', 'star', 'fish', 'bone'],
        ['acorn', 'leaf', 'star', 'fish', 'bone', 'acorn'],
        ['leaf', 'star', 'fish', 'bone', 'acorn', 'leaf'],
      ]);

      const matches = finder.findAllMatches(board);
      expect(matches.length).toBe(1);
      expect(matches[0].type).toBe('leaf');
      expect(matches[0].length).toBe(3);
    });

    it('应该找到垂直三连', () => {
      const board = createBoard([
        ['leaf', 'star', 'fish', 'bone', 'acorn', 'star'],
        ['leaf', 'fish', 'bone', 'acorn', 'star', 'fish'],
        ['leaf', 'bone', 'acorn', 'star', 'fish', 'bone'],
        ['star', 'acorn', 'star', 'fish', 'bone', 'acorn'],
        ['fish', 'star', 'fish', 'bone', 'acorn', 'star'],
        ['bone', 'fish', 'bone', 'acorn', 'star', 'fish'],
      ]);

      const matches = finder.findAllMatches(board);
      expect(matches.length).toBe(1);
      expect(matches[0].type).toBe('leaf');
      expect(matches[0].length).toBe(3);
    });

    it('应该找到四连并标记为特殊', () => {
      const board = createBoard([
        ['leaf', 'leaf', 'leaf', 'leaf', 'fish', 'bone'],
        ['star', 'fish', 'bone', 'acorn', 'star', 'fish'],
        ['fish', 'bone', 'acorn', 'star', 'fish', 'bone'],
        ['bone', 'acorn', 'star', 'fish', 'bone', 'acorn'],
        ['acorn', 'star', 'fish', 'bone', 'acorn', 'star'],
        ['star', 'fish', 'bone', 'acorn', 'star', 'fish'],
      ]);

      const matches = finder.findAllMatches(board);
      expect(matches.length).toBe(1);
      expect(matches[0].length).toBe(4);
      expect(matches[0].isSpecial).toBe(true);
    });

    it('应该找到五连并标记为炸弹', () => {
      const board = createBoard([
        ['leaf', 'leaf', 'leaf', 'leaf', 'leaf', 'bone'],
        ['star', 'fish', 'bone', 'acorn', 'star', 'fish'],
        ['fish', 'bone', 'acorn', 'star', 'fish', 'bone'],
        ['bone', 'acorn', 'star', 'fish', 'bone', 'acorn'],
        ['acorn', 'star', 'fish', 'bone', 'acorn', 'star'],
        ['star', 'fish', 'bone', 'acorn', 'star', 'fish'],
      ]);

      const matches = finder.findAllMatches(board);
      expect(matches.length).toBe(1);
      expect(matches[0].length).toBe(5);
      expect(matches[0].specialType).toBe('lantern');
    });

    it('无匹配时应返回空数组', () => {
      const board = createBoard([
        ['leaf', 'star', 'fish', 'bone', 'acorn', 'leaf'],
        ['star', 'fish', 'bone', 'acorn', 'leaf', 'star'],
        ['fish', 'bone', 'acorn', 'leaf', 'star', 'fish'],
        ['bone', 'acorn', 'leaf', 'star', 'fish', 'bone'],
        ['acorn', 'leaf', 'star', 'fish', 'bone', 'acorn'],
        ['leaf', 'star', 'fish', 'bone', 'acorn', 'leaf'],
      ]);

      const matches = finder.findAllMatches(board);
      expect(matches.length).toBe(0);
    });
  });

  describe('wouldSwapMatch', () => {
    it('有效交换应返回 true', () => {
      const board = createBoard([
        ['leaf', 'leaf', 'star', 'fish', 'bone', 'acorn'],
        ['star', 'fish', 'leaf', 'acorn', 'star', 'fish'],
        ['fish', 'bone', 'acorn', 'star', 'fish', 'bone'],
        ['bone', 'acorn', 'star', 'fish', 'bone', 'acorn'],
        ['acorn', 'star', 'fish', 'bone', 'acorn', 'star'],
        ['star', 'fish', 'bone', 'acorn', 'star', 'fish'],
      ]);

      // 交换 (0,2) 和 (1,2)，形成水平三连
      const result = finder.wouldSwapMatch(board, {
        from: { row: 0, col: 2 },
        to: { row: 1, col: 2 },
      });

      expect(result).toBe(true);
    });

    it('无效交换应返回 false', () => {
      const board = createBoard([
        ['leaf', 'star', 'fish', 'bone', 'acorn', 'leaf'],
        ['star', 'fish', 'bone', 'acorn', 'leaf', 'star'],
        ['fish', 'bone', 'acorn', 'leaf', 'star', 'fish'],
        ['bone', 'acorn', 'leaf', 'star', 'fish', 'bone'],
        ['acorn', 'leaf', 'star', 'fish', 'bone', 'acorn'],
        ['leaf', 'star', 'fish', 'bone', 'acorn', 'leaf'],
      ]);

      const result = finder.wouldSwapMatch(board, {
        from: { row: 0, col: 0 },
        to: { row: 0, col: 1 },
      });

      expect(result).toBe(false);
    });

    it('非相邻格子应返回 false', () => {
      const board = createBoard([
        ['leaf', 'leaf', 'leaf', 'star', 'fish', 'bone'],
        ['star', 'fish', 'bone', 'acorn', 'star', 'fish'],
        ['fish', 'bone', 'acorn', 'star', 'fish', 'bone'],
        ['bone', 'acorn', 'star', 'fish', 'bone', 'acorn'],
        ['acorn', 'star', 'fish', 'bone', 'acorn', 'star'],
        ['star', 'fish', 'bone', 'acorn', 'star', 'fish'],
      ]);

      const result = finder.wouldSwapMatch(board, {
        from: { row: 0, col: 0 },
        to: { row: 2, col: 2 },
      });

      expect(result).toBe(false);
    });
  });

  describe('hasValidMove', () => {
    it('有可行移动时应返回 true', () => {
      const board = createBoard([
        ['leaf', 'leaf', 'star', 'fish', 'bone', 'acorn'],
        ['star', 'fish', 'leaf', 'acorn', 'star', 'fish'],
        ['fish', 'bone', 'acorn', 'star', 'fish', 'bone'],
        ['bone', 'acorn', 'star', 'fish', 'bone', 'acorn'],
        ['acorn', 'star', 'fish', 'bone', 'acorn', 'star'],
        ['star', 'fish', 'bone', 'acorn', 'star', 'fish'],
      ]);

      expect(finder.hasValidMove(board)).toBe(true);
    });
  });
});
