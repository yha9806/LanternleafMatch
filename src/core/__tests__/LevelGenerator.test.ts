import { describe, it, expect } from 'vitest';
import { LevelGenerator } from '../LevelGenerator';
import { MatchFinder } from '../MatchFinder';

describe('LevelGenerator', () => {
  const generator = new LevelGenerator();
  const matchFinder = new MatchFinder();

  describe('generateLevel', () => {
    it('应该生成有效的关卡定义', () => {
      const level = generator.generateLevel(1, 'test');

      expect(level.level_index).toBe(1);
      expect(level.board_size).toBe(6);
      expect(level.moves).toBeGreaterThan(0);
      expect(level.goals.length).toBeGreaterThan(0);
    });

    it('应该生成可复现的关卡（相同 seed）', () => {
      const level1 = generator.generateLevel(17, 'player-a');
      const level2 = generator.generateLevel(17, 'player-a');

      expect(level1.seed).toBe(level2.seed);
      expect(level1.blockers.cells).toEqual(level2.blockers.cells);
    });

    it('不同玩家应该有不同的 seed', () => {
      const level1 = generator.generateLevel(17, 'player-a');
      const level2 = generator.generateLevel(17, 'player-b');

      expect(level1.seed).not.toBe(level2.seed);
    });
  });

  describe('createLevelState', () => {
    it('应该创建无初始匹配的棋盘', () => {
      for (let levelIndex = 1; levelIndex <= 50; levelIndex += 10) {
        const levelDef = generator.generateLevel(levelIndex, 'test');
        const state = generator.createLevelState(levelDef);

        const matches = matchFinder.findAllMatches(state.board);
        expect(matches.length).toBe(0);
      }
    });

    it('应该创建有至少一个有效移动的棋盘', () => {
      for (let levelIndex = 1; levelIndex <= 50; levelIndex += 10) {
        const levelDef = generator.generateLevel(levelIndex, 'test');
        const state = generator.createLevelState(levelDef);

        const hasMove = matchFinder.hasValidMove(state.board);
        expect(hasMove).toBe(true);
      }
    });

    it('苔藓格子应该正确放置', () => {
      const levelDef = generator.generateLevel(17, 'test'); // combo 关卡，有苔藓
      const state = generator.createLevelState(levelDef);

      for (const cell of levelDef.blockers.cells) {
        const boardCell = state.board[cell.row][cell.col];
        expect(boardCell.blocker).not.toBeNull();
        expect(boardCell.blocker?.type).toBe('moss');
      }
    });
  });

  describe('难度曲线', () => {
    it('步数应该随关卡递减', () => {
      const early = generator.generateLevel(5, 'test');
      const mid = generator.generateLevel(25, 'test');
      const late = generator.generateLevel(45, 'test');

      expect(early.moves).toBeGreaterThanOrEqual(mid.moves);
      expect(mid.moves).toBeGreaterThanOrEqual(late.moves);
    });

    it('苔藓密度应该随关卡递增', () => {
      const early = generator.generateLevel(5, 'test');
      const mid = generator.generateLevel(25, 'test');
      const late = generator.generateLevel(45, 'test');

      expect(early.blockers.density).toBeLessThanOrEqual(mid.blockers.density);
      expect(mid.blockers.density).toBeLessThanOrEqual(late.blockers.density);
    });
  });
});
