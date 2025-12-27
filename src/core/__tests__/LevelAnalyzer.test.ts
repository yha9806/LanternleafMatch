import { describe, it, expect, beforeEach } from 'vitest';
import { LevelAnalyzer, LevelPlayData } from '../LevelAnalyzer';

describe('LevelAnalyzer', () => {
  let analyzer: LevelAnalyzer;

  beforeEach(() => {
    analyzer = new LevelAnalyzer();
  });

  // 辅助函数：创建测试数据
  function createPlayData(overrides: Partial<LevelPlayData> = {}): LevelPlayData {
    return {
      level: 1,
      playerId: 'player_1',
      result: 'win',
      movesUsed: 10,
      movesTotal: 14,
      goalProgress: 8,
      goalTotal: 8,
      duration: 60,
      cascadeCount: 5,
      shuffleCount: 0,
      specialsCreated: 2,
      specialsTriggered: 1,
      retryCount: 0,
      timestamp: Date.now(),
      ...overrides,
    };
  }

  describe('addPlayData', () => {
    it('should add single play data', () => {
      analyzer.addPlayData(createPlayData());
      expect(analyzer.getDataCount()).toBe(1);
    });

    it('should add multiple play data', () => {
      analyzer.addPlayData([
        createPlayData({ level: 1 }),
        createPlayData({ level: 2 }),
        createPlayData({ level: 3 }),
      ]);
      expect(analyzer.getDataCount()).toBe(3);
    });
  });

  describe('clearData', () => {
    it('should clear all data', () => {
      analyzer.addPlayData(createPlayData());
      analyzer.clearData();
      expect(analyzer.getDataCount()).toBe(0);
    });
  });

  describe('calculateLevelStats', () => {
    beforeEach(() => {
      // 添加关卡 1 的数据：10 胜 5 败
      for (let i = 0; i < 10; i++) {
        analyzer.addPlayData(createPlayData({ level: 1, result: 'win', playerId: `p${i}` }));
      }
      for (let i = 0; i < 5; i++) {
        analyzer.addPlayData(createPlayData({
          level: 1,
          result: 'lose',
          playerId: `p${10 + i}`,
          goalProgress: 5,
        }));
      }
    });

    it('should calculate win rate correctly', () => {
      const report = analyzer.generateReport(1, 1);
      const stats = report.levelStats[0];

      expect(stats.winRate).toBeCloseTo(10 / 15, 2);
      expect(stats.wins).toBe(10);
      expect(stats.losses).toBe(5);
    });

    it('should calculate attempts correctly', () => {
      const report = analyzer.generateReport(1, 1);
      expect(report.levelStats[0].attempts).toBe(15);
    });

    it('should calculate averages correctly', () => {
      const report = analyzer.generateReport(1, 1);
      const stats = report.levelStats[0];

      expect(stats.avgMovesUsed).toBe(10);
      expect(stats.avgDuration).toBe(60);
    });
  });

  describe('detectDifficultySpikes', () => {
    it('should detect win rate drop', () => {
      // 关卡 1: 高胜率
      for (let i = 0; i < 20; i++) {
        analyzer.addPlayData(createPlayData({ level: 1, result: 'win', playerId: `p${i}` }));
      }

      // 关卡 2: 低胜率 (明显下降)
      for (let i = 0; i < 20; i++) {
        analyzer.addPlayData(createPlayData({
          level: 2,
          result: i < 6 ? 'win' : 'lose',
          playerId: `p${i}`,
          goalProgress: 5,
        }));
      }

      const report = analyzer.generateReport(1, 2);

      expect(report.difficultySpikes.length).toBe(1);
      expect(report.difficultySpikes[0].level).toBe(2);
      expect(report.difficultySpikes[0].drop).toBeGreaterThan(0.5);
    });

    it('should categorize spike severity', () => {
      // 创建大幅下降
      for (let i = 0; i < 20; i++) {
        analyzer.addPlayData(createPlayData({ level: 1, result: 'win', playerId: `p${i}` }));
      }
      for (let i = 0; i < 20; i++) {
        analyzer.addPlayData(createPlayData({
          level: 2,
          result: i < 4 ? 'win' : 'lose',
          playerId: `p${i}`,
        }));
      }

      const report = analyzer.generateReport(1, 2);
      const spike = report.difficultySpikes[0];

      expect(['high', 'critical']).toContain(spike.severity);
    });
  });

  describe('detectBalanceIssues', () => {
    it('should detect too hard level', () => {
      // 添加低胜率数据
      for (let i = 0; i < 20; i++) {
        analyzer.addPlayData(createPlayData({
          level: 25,
          result: i < 4 ? 'win' : 'lose',
          playerId: `p${i}`,
          goalProgress: 5,
        }));
      }

      const report = analyzer.generateReport(25, 25);
      const issues = report.balanceIssues.filter(i => i.issueType === 'too_hard');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect too easy level', () => {
      // 添加高胜率数据 (非新手关卡)
      for (let i = 0; i < 20; i++) {
        analyzer.addPlayData(createPlayData({
          level: 30,
          result: 'win',
          playerId: `p${i}`,
        }));
      }

      const report = analyzer.generateReport(30, 30);
      const issues = report.balanceIssues.filter(i => i.issueType === 'too_easy');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect high quit rate', () => {
      // 添加高退出率数据
      for (let i = 0; i < 20; i++) {
        analyzer.addPlayData(createPlayData({
          level: 15,
          result: i < 4 ? 'quit' : 'win',
          playerId: `p${i}`,
        }));
      }

      const report = analyzer.generateReport(15, 15);
      const issues = report.balanceIssues.filter(i => i.issueType === 'high_quit_rate');

      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('calculatePhaseStats', () => {
    beforeEach(() => {
      // 为每个阶段添加数据
      const phases = [
        { range: [1, 10], winRate: 0.95 },
        { range: [11, 25], winRate: 0.85 },
        { range: [26, 40], winRate: 0.70 },
      ];

      for (const phase of phases) {
        for (let level = phase.range[0]; level <= phase.range[1]; level++) {
          for (let i = 0; i < 10; i++) {
            analyzer.addPlayData(createPlayData({
              level,
              result: Math.random() < phase.winRate ? 'win' : 'lose',
              playerId: `p${level}_${i}`,
            }));
          }
        }
      }
    });

    it('should calculate phase statistics', () => {
      const report = analyzer.generateReport(1, 40);

      expect(report.phaseStats.length).toBeGreaterThan(0);

      const beginnerPhase = report.phaseStats.find(p => p.phase === '新手期');
      expect(beginnerPhase).toBeDefined();
      expect(beginnerPhase!.avgWinRate).toBeGreaterThan(0.8);
    });
  });

  describe('generateReport', () => {
    it('should generate complete report', () => {
      // 添加一些数据
      for (let level = 1; level <= 10; level++) {
        for (let i = 0; i < 15; i++) {
          analyzer.addPlayData(createPlayData({
            level,
            result: Math.random() < 0.7 ? 'win' : 'lose',
            playerId: `p${level}_${i}`,
          }));
        }
      }

      const report = analyzer.generateReport(1, 10);

      expect(report.generatedAt).toBeDefined();
      expect(report.levelRange).toEqual([1, 10]);
      expect(report.totalPlays).toBe(150);
      expect(report.levelStats.length).toBe(10);
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('analyzeSingleLevel', () => {
    it('should return null for level with no data', () => {
      const stats = analyzer.analyzeSingleLevel(1);
      expect(stats).toBeNull();
    });

    it('should return stats for level with data', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.addPlayData(createPlayData({ level: 5, playerId: `p${i}` }));
      }

      const stats = analyzer.analyzeSingleLevel(5);
      expect(stats).not.toBeNull();
      expect(stats!.level).toBe(5);
      expect(stats!.attempts).toBe(10);
    });
  });

  describe('getProblematicLevels', () => {
    it('should return levels sorted by frustration index', () => {
      // 添加一些问题关卡
      for (let i = 0; i < 15; i++) {
        analyzer.addPlayData(createPlayData({
          level: 10,
          result: 'lose',
          playerId: `p${i}`,
          retryCount: 3,
          goalProgress: 3,
        }));
      }

      for (let i = 0; i < 15; i++) {
        analyzer.addPlayData(createPlayData({
          level: 5,
          result: 'win',
          playerId: `p${i}`,
        }));
      }

      const problematic = analyzer.getProblematicLevels(5);

      expect(problematic.length).toBeGreaterThan(0);
      expect(problematic[0].level).toBe(10); // 最高挫败指数
    });
  });
});
