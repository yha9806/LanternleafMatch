import { describe, it, expect, beforeEach } from 'vitest';
import { DynamicDifficulty, PlaySession } from '../DynamicDifficulty';
import { LevelGenerator } from '../LevelGenerator';

describe('DynamicDifficulty', () => {
  let dda: DynamicDifficulty;
  let generator: LevelGenerator;

  beforeEach(() => {
    dda = new DynamicDifficulty();
    generator = new LevelGenerator();
  });

  // 辅助函数：创建测试会话
  function createSession(overrides: Partial<PlaySession> = {}): PlaySession {
    return {
      level: 1,
      result: 'win',
      movesUsed: 10,
      movesTotal: 14,
      goalProgress: 8,
      goalTotal: 8,
      specialsUsed: 2,
      cascades: 5,
      duration: 60,
      retries: 0,
      ...overrides,
    };
  }

  describe('getPlayerProfile', () => {
    it('should create default profile for new player', () => {
      const profile = dda.getPlayerProfile('new_player');

      expect(profile.playerId).toBe('new_player');
      expect(profile.skillLevel).toBe(0.5);
      expect(profile.recentWinRate).toBe(0.5);
      expect(profile.frustrationScore).toBe(0);
    });

    it('should return same profile for same player', () => {
      const profile1 = dda.getPlayerProfile('player_1');
      const profile2 = dda.getPlayerProfile('player_1');

      expect(profile1).toBe(profile2);
    });
  });

  describe('updatePlayerProfile', () => {
    it('should update profile after game session', () => {
      dda.updatePlayerProfile('player_1', createSession({ result: 'win' }));
      dda.updatePlayerProfile('player_1', createSession({ result: 'win' }));
      dda.updatePlayerProfile('player_1', createSession({ result: 'lose' }));

      const profile = dda.getPlayerProfile('player_1');

      expect(profile.recentWinRate).toBeCloseTo(2/3, 2);
    });

    it('should increase frustration after consecutive losses', () => {
      // 连续失败
      for (let i = 0; i < 5; i++) {
        dda.updatePlayerProfile('frustrated_player', createSession({
          result: 'lose',
          goalProgress: 4,
          retries: 2,
        }));
      }

      const profile = dda.getPlayerProfile('frustrated_player');

      expect(profile.frustrationScore).toBeGreaterThan(0.3);
    });

    it('should calculate skill level based on performance', () => {
      // 高技能玩家：高胜率、高效率、使用特殊块
      for (let i = 0; i < 10; i++) {
        dda.updatePlayerProfile('skilled_player', createSession({
          result: 'win',
          movesUsed: 8,
          goalProgress: 10,
          specialsUsed: 3,
          cascades: 8,
        }));
      }

      const profile = dda.getPlayerProfile('skilled_player');

      expect(profile.skillLevel).toBeGreaterThan(0.6);
    });
  });

  describe('calculateModifier', () => {
    it('should return neutral modifier when disabled', () => {
      dda.setEnabled(false);

      const modifier = dda.calculateModifier('player_1', 1);

      expect(modifier.movesBonus).toBe(0);
      expect(modifier.goalReduction).toBe(0);
      expect(modifier.densityReduction).toBe(0);
    });

    it('should provide bonus for new players', () => {
      // 新玩家（少于 20 局）
      for (let i = 0; i < 5; i++) {
        dda.updatePlayerProfile('new_player', createSession());
      }

      const modifier = dda.calculateModifier('new_player', 10);

      expect(modifier.movesBonus).toBeGreaterThan(0);
      expect(modifier.goalWeightBoost).toBeGreaterThan(1.0);
    });

    it('should reduce difficulty for frustrated players', () => {
      // 模拟挫败玩家
      for (let i = 0; i < 30; i++) {
        dda.updatePlayerProfile('frustrated', createSession({
          result: 'lose',
          goalProgress: 3,
          retries: 3,
        }));
      }

      const modifier = dda.calculateModifier('frustrated', 20);

      expect(modifier.movesBonus).toBeGreaterThan(0);
      expect(modifier.goalReduction).toBeGreaterThan(0);
    });
  });

  describe('applyModifier', () => {
    it('should apply moves bonus', () => {
      const levelDef = generator.generateLevel(10, 'test');
      const originalMoves = levelDef.moves;

      const modifier = {
        movesBonus: 2,
        goalReduction: 0,
        densityReduction: 0,
        goalWeightBoost: 1.0,
      };

      const modified = dda.applyModifier(levelDef, modifier);

      expect(modified.moves).toBe(originalMoves + 2);
    });

    it('should apply goal reduction', () => {
      const levelDef = generator.generateLevel(10, 'test');

      const modifier = {
        movesBonus: 0,
        goalReduction: 0.1, // 10% reduction
        densityReduction: 0,
        goalWeightBoost: 1.0,
      };

      const modified = dda.applyModifier(levelDef, modifier);

      const originalGoal = levelDef.goals.find(g => g.type === 'collect');
      const modifiedGoal = modified.goals.find(g => g.type === 'collect');

      if (originalGoal && modifiedGoal) {
        expect(modifiedGoal.count).toBeLessThan(originalGoal.count);
      }
    });

    it('should apply density reduction', () => {
      const levelDef = generator.generateLevel(25, 'test');
      const originalDensity = levelDef.blockers.density;

      const modifier = {
        movesBonus: 0,
        goalReduction: 0,
        densityReduction: 0.2,
        goalWeightBoost: 1.0,
      };

      const modified = dda.applyModifier(levelDef, modifier);

      expect(modified.blockers.density).toBeLessThan(originalDensity);
    });

    it('should respect bounds', () => {
      const levelDef = generator.generateLevel(10, 'test');

      const modifier = {
        movesBonus: 10, // 过大
        goalReduction: 0.5,
        densityReduction: 0.5,
        goalWeightBoost: 1.0,
      };

      const modified = dda.applyModifier(levelDef, modifier);

      expect(modified.moves).toBeLessThanOrEqual(15);
      expect(modified.blockers.density).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportProfile / importProfile', () => {
    it('should export and import profile', () => {
      for (let i = 0; i < 10; i++) {
        dda.updatePlayerProfile('player_1', createSession({ result: 'win' }));
      }

      const exported = dda.exportProfile('player_1');
      expect(exported).not.toBeNull();

      // 创建新的 DDA 实例
      const newDDA = new DynamicDifficulty();
      newDDA.importProfile(exported!);

      const imported = newDDA.getPlayerProfile('player_1');
      expect(imported.recentWinRate).toBe(exported!.recentWinRate);
    });
  });

  describe('clearPlayerData', () => {
    it('should clear player data', () => {
      dda.updatePlayerProfile('player_1', createSession());
      dda.clearPlayerData('player_1');

      const profile = dda.getPlayerProfile('player_1');

      // 应该是新的默认 profile
      expect(profile.recentWinRate).toBe(0.5);
    });
  });

  describe('getAdjustmentStats', () => {
    it('should return adjustment statistics', () => {
      // 添加不同类型的玩家
      for (let i = 0; i < 5; i++) {
        dda.updatePlayerProfile(`new_${i}`, createSession());
      }

      for (let i = 0; i < 30; i++) {
        dda.updatePlayerProfile('frustrated', createSession({
          result: 'lose',
          retries: 3,
        }));
      }

      const stats = dda.getAdjustmentStats();

      expect(stats.totalPlayers).toBe(6);
      expect(stats.newPlayers).toBe(5); // new_0 到 new_4 是新玩家，frustrated 有 30 局不是
      expect(stats.frustatedPlayers).toBeGreaterThanOrEqual(1); // frustrated 玩家应该被检测
    });
  });

  describe('config', () => {
    it('should update config', () => {
      dda.updateConfig({ maxMovesBonus: 5 });

      const config = dda.getConfig();

      expect(config.maxMovesBonus).toBe(5);
    });

    it('should enable/disable DDA', () => {
      dda.setEnabled(false);
      expect(dda.getConfig().enabled).toBe(false);

      dda.setEnabled(true);
      expect(dda.getConfig().enabled).toBe(true);
    });
  });
});
