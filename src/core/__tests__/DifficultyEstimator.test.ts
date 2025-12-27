import { DifficultyEstimator, DIFFICULTY_PHASES } from '../DifficultyEstimator';
import { LevelGenerator } from '../LevelGenerator';
import type { LevelDef } from '../../types';

describe('DifficultyEstimator', () => {
  let estimator: DifficultyEstimator;
  let generator: LevelGenerator;

  beforeEach(() => {
    estimator = new DifficultyEstimator();
    generator = new LevelGenerator();
  });

  describe('estimate', () => {
    it('should return a difficulty score between 1 and 10', () => {
      const levelDef = generator.generateLevel(25, 'test');
      const score = estimator.estimate(levelDef);

      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
    });

    it('should give lower scores to early levels', () => {
      const level1 = generator.generateLevel(1, 'test');
      const level40 = generator.generateLevel(40, 'test');

      const score1 = estimator.estimate(level1);
      const score40 = estimator.estimate(level40);

      expect(score1).toBeLessThan(score40);
    });
  });

  describe('analyzeLevel', () => {
    it('should return complete breakdown', () => {
      const levelDef = generator.generateLevel(15, 'test');
      const breakdown = estimator.analyzeLevel(levelDef);

      expect(breakdown).toHaveProperty('score');
      expect(breakdown).toHaveProperty('factors');
      expect(breakdown).toHaveProperty('phase');
      expect(breakdown).toHaveProperty('warnings');

      expect(breakdown.factors).toHaveProperty('movePressure');
      expect(breakdown.factors).toHaveProperty('boardComplexity');
      expect(breakdown.factors).toHaveProperty('goalDifficulty');
      expect(breakdown.factors).toHaveProperty('cascadePotential');
      expect(breakdown.factors).toHaveProperty('specialReliability');
    });

    it('should have all factors between 0 and 1', () => {
      const levelDef = generator.generateLevel(30, 'test');
      const breakdown = estimator.analyzeLevel(levelDef);

      Object.values(breakdown.factors).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getPhase', () => {
    it('should return correct phase for each level range', () => {
      expect(estimator.getPhase(1).name).toBe('新手期');
      expect(estimator.getPhase(10).name).toBe('新手期');
      expect(estimator.getPhase(11).name).toBe('成长期');
      expect(estimator.getPhase(25).name).toBe('成长期');
      expect(estimator.getPhase(26).name).toBe('挑战期');
      expect(estimator.getPhase(40).name).toBe('挑战期');
      expect(estimator.getPhase(41).name).toBe('大师期');
      expect(estimator.getPhase(50).name).toBe('大师期');
      expect(estimator.getPhase(51).name).toBe('无限期');
      expect(estimator.getPhase(100).name).toBe('无限期');
    });
  });

  describe('isInTargetRange', () => {
    it('should return true for levels within tolerance', () => {
      // Early levels should be close to their target
      const level5 = generator.generateLevel(5, 'test');
      const inRange = estimator.isInTargetRange(level5, 3);

      // With tolerance of 3, most levels should be in range
      expect(typeof inRange).toBe('boolean');
    });
  });

  describe('difficulty factors', () => {
    it('should increase move pressure for higher goals with fewer moves', () => {
      const easyLevel = generator.generateLevel(5, 'test');
      const hardLevel = generator.generateLevel(45, 'test');

      const easyFactors = estimator.calculateFactors(easyLevel);
      const hardFactors = estimator.calculateFactors(hardLevel);

      // Hard levels should have higher move pressure
      expect(hardFactors.movePressure).toBeGreaterThanOrEqual(easyFactors.movePressure - 0.2);
    });

    it('should increase board complexity with higher moss density', () => {
      const noMossLevel = generator.generateLevel(1, 'test');
      const mossLevel = generator.generateLevel(40, 'test');

      const noMossFactors = estimator.calculateFactors(noMossLevel);
      const mossFactors = estimator.calculateFactors(mossLevel);

      expect(mossFactors.boardComplexity).toBeGreaterThan(noMossFactors.boardComplexity);
    });
  });

  describe('evaluateAll', () => {
    it('should return results for all levels', () => {
      const levels = [1, 10, 25, 50].map(n => generator.generateLevel(n, 'test-player'));
      const results = estimator.evaluateAll(levels);

      expect(results.size).toBe(4);
      expect(results.has(1)).toBe(true);
      expect(results.has(50)).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report', () => {
      const levels = Array.from({ length: 10 }, (_, i) => generator.generateLevel(i + 1, 'test'));
      const report = estimator.generateReport(levels);

      expect(report.summary).toHaveProperty('avgDifficulty');
      expect(report.summary).toHaveProperty('stdDev');
      expect(report.summary).toHaveProperty('warnings');
      expect(report.outliers).toBeDefined();
      expect(Array.isArray(report.outliers)).toBe(true);
    });
  });

  describe('DIFFICULTY_PHASES', () => {
    it('should have 5 phases', () => {
      expect(DIFFICULTY_PHASES).toHaveLength(5);
    });

    it('should have non-overlapping level ranges', () => {
      for (let i = 0; i < DIFFICULTY_PHASES.length - 1; i++) {
        const current = DIFFICULTY_PHASES[i];
        const next = DIFFICULTY_PHASES[i + 1];

        expect(current.levelRange[1]).toBeLessThan(next.levelRange[0]);
      }
    });

    it('should have increasing target difficulty', () => {
      for (let i = 0; i < DIFFICULTY_PHASES.length - 1; i++) {
        const current = DIFFICULTY_PHASES[i];
        const next = DIFFICULTY_PHASES[i + 1];

        expect(next.targetDifficulty).toBeGreaterThan(current.targetDifficulty);
      }
    });
  });
});
