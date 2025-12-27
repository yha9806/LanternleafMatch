import { LevelValidator, DEFAULT_SIMULATION_CONFIG } from '../LevelValidator';
import { LevelGenerator } from '../LevelGenerator';
import type { LevelDef } from '../../types';

describe('LevelValidator', () => {
  let validator: LevelValidator;
  let generator: LevelGenerator;

  beforeEach(() => {
    validator = new LevelValidator();
    generator = new LevelGenerator();
  });

  describe('validate', () => {
    it('should return validation result for a simple level', () => {
      const levelDef = generator.generateLevel(1, 'test');

      const result = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 20,
      });

      expect(result).toHaveProperty('isPlayable');
      expect(result).toHaveProperty('winRate');
      expect(result).toHaveProperty('avgMovesUsed');
      expect(result).toHaveProperty('difficultyScore');
      expect(result).toHaveProperty('confidence');
    });

    it('should have high win rate for early levels', () => {
      const levelDef = generator.generateLevel(1, 'test');

      const result = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 50,
      });

      expect(result.isPlayable).toBe(true);
      expect(result.winRate).toBeGreaterThan(0.5);
    });

    it('should calculate difficulty score between 1 and 10', () => {
      const levelDef = generator.generateLevel(25, 'test');

      const result = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 20,
      });

      expect(result.difficultyScore).toBeGreaterThanOrEqual(1);
      expect(result.difficultyScore).toBeLessThanOrEqual(10);
    });

    it('should track deadlock rate', () => {
      const levelDef = generator.generateLevel(30, 'test');

      const result = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 20,
      });

      expect(result.deadlockRate).toBeGreaterThanOrEqual(0);
      expect(result.deadlockRate).toBeLessThanOrEqual(1);
    });

    it('should calculate average cascades', () => {
      const levelDef = generator.generateLevel(10, 'test');

      const result = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 20,
      });

      expect(result.avgCascades).toBeGreaterThanOrEqual(0);
    });
  });

  describe('quickValidate', () => {
    it('should run faster with fewer iterations', () => {
      const levelDef = generator.generateLevel(1, 'test');

      const start = Date.now();
      const result = validator.quickValidate(levelDef, 10);
      const elapsed = Date.now() - start;

      expect(result.isPlayable).toBeDefined();
      expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('difficulty progression', () => {
    it('should generally increase difficulty for later levels', () => {
      const earlyLevel = generator.generateLevel(5, 'test');
      const lateLevel = generator.generateLevel(40, 'test');

      const earlyResult = validator.quickValidate(earlyLevel, 30);
      const lateResult = validator.quickValidate(lateLevel, 30);

      // Later levels should generally have lower win rates
      // (with some variance allowed due to random simulation)
      expect(lateResult.difficultyScore).toBeGreaterThanOrEqual(earlyResult.difficultyScore - 2);
    });
  });

  describe('special tile usage', () => {
    it('should track special tile usage', () => {
      const levelDef = generator.generateLevel(20, 'test');

      const result = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 30,
      });

      expect(result.specialTileUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('moves analysis', () => {
    it('should calculate average moves used and remaining', () => {
      const levelDef = generator.generateLevel(15, 'test');

      const result = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 30,
      });

      expect(result.avgMovesUsed).toBeGreaterThan(0);
      expect(result.avgMovesUsed).toBeLessThanOrEqual(levelDef.moves);

      // avgMovesRemaining should be >= 0 for winning games
      expect(result.avgMovesRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should track minimum moves to win', () => {
      const levelDef = generator.generateLevel(10, 'test');

      const result = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 50,
      });

      if (result.winRate > 0) {
        expect(result.minMovesToWin).toBeGreaterThan(0);
        expect(result.minMovesToWin).toBeLessThanOrEqual(levelDef.moves);
      }
    });
  });

  describe('confidence', () => {
    it('should increase confidence with more iterations', () => {
      const levelDef = generator.generateLevel(10, 'test');

      const result20 = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 20,
      });

      const result100 = validator.validate(levelDef, {
        ...DEFAULT_SIMULATION_CONFIG,
        iterations: 100,
      });

      expect(result100.confidence).toBeGreaterThanOrEqual(result20.confidence);
    });
  });
});
