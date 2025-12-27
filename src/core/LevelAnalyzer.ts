// ============================================
// 关卡数据分析器
// 基于玩家数据分析关卡表现、检测异常
// ============================================

import type { TileType } from '../types';

// ============================================
// 类型定义
// ============================================

export interface LevelPlayData {
  level: number;
  playerId: string;
  result: 'win' | 'lose' | 'quit';
  movesUsed: number;
  movesTotal: number;
  goalProgress: number;
  goalTotal: number;
  duration: number;
  cascadeCount: number;
  shuffleCount: number;
  specialsCreated: number;
  specialsTriggered: number;
  retryCount: number;
  timestamp: number;
}

export interface LevelStats {
  level: number;
  attempts: number;
  wins: number;
  losses: number;
  quits: number;
  winRate: number;
  avgMovesUsed: number;
  avgMovesRemaining: number;
  avgDuration: number;
  avgCascades: number;
  avgSpecials: number;
  avgRetries: number;
  completionRate: number;      // goalProgress / goalTotal
  efficiency: number;          // goalProgress / movesUsed
  frustrationIndex: number;    // 挫败指数
}

export interface DifficultySpike {
  level: number;
  winRate: number;
  prevWinRate: number;
  drop: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

export interface BalanceIssue {
  level: number;
  issueType: 'too_easy' | 'too_hard' | 'high_variance' | 'high_quit_rate' | 'low_engagement';
  severity: 'low' | 'medium' | 'high';
  metric: string;
  currentValue: number;
  expectedRange: { min: number; max: number };
  suggestion: string;
}

export interface AnalysisReport {
  generatedAt: string;
  levelRange: [number, number];
  totalPlays: number;
  uniquePlayers: number;
  overallWinRate: number;

  // 各关卡统计
  levelStats: LevelStats[];

  // 问题检测
  difficultySpikes: DifficultySpike[];
  balanceIssues: BalanceIssue[];

  // 分阶段统计
  phaseStats: {
    phase: string;
    levelRange: [number, number];
    avgWinRate: number;
    targetWinRate: { min: number; max: number };
    isInRange: boolean;
  }[];

  // 建议
  recommendations: string[];
}

// ============================================
// 阈值配置
// ============================================

const THRESHOLDS = {
  // 难度突变检测
  SPIKE_DROP_LOW: 0.10,      // 10% 下降
  SPIKE_DROP_MEDIUM: 0.15,   // 15% 下降
  SPIKE_DROP_HIGH: 0.20,     // 20% 下降
  SPIKE_DROP_CRITICAL: 0.25, // 25% 下降

  // 胜率范围
  WIN_RATE_TOO_EASY: 0.95,
  WIN_RATE_TOO_HARD: 0.30,

  // 退出率
  QUIT_RATE_HIGH: 0.15,

  // 方差
  HIGH_VARIANCE_THRESHOLD: 0.20,

  // 参与度
  LOW_ENGAGEMENT_DURATION: 30, // 秒

  // 挫败指数
  FRUSTRATION_HIGH: 0.7,
};

// 难度阶段期望胜率
const PHASE_WIN_RATES: Record<string, { min: number; max: number }> = {
  '新手期': { min: 0.95, max: 1.0 },
  '成长期': { min: 0.80, max: 0.95 },
  '挑战期': { min: 0.60, max: 0.85 },
  '大师期': { min: 0.45, max: 0.70 },
  '无限期': { min: 0.30, max: 0.60 },
};

// ============================================
// LevelAnalyzer 类
// ============================================

export class LevelAnalyzer {
  private playData: LevelPlayData[] = [];

  /**
   * 添加游戏数据
   */
  addPlayData(data: LevelPlayData | LevelPlayData[]): void {
    if (Array.isArray(data)) {
      this.playData.push(...data);
    } else {
      this.playData.push(data);
    }
  }

  /**
   * 清空数据
   */
  clearData(): void {
    this.playData = [];
  }

  /**
   * 获取数据量
   */
  getDataCount(): number {
    return this.playData.length;
  }

  /**
   * 生成完整分析报告
   */
  generateReport(startLevel: number = 1, endLevel: number = 50): AnalysisReport {
    const filteredData = this.playData.filter(
      d => d.level >= startLevel && d.level <= endLevel
    );

    const levelStats = this.calculateLevelStats(filteredData, startLevel, endLevel);
    const difficultySpikes = this.detectDifficultySpikes(levelStats);
    const balanceIssues = this.detectBalanceIssues(levelStats);
    const phaseStats = this.calculatePhaseStats(levelStats);
    const recommendations = this.generateRecommendations(difficultySpikes, balanceIssues);

    const uniquePlayers = new Set(filteredData.map(d => d.playerId)).size;
    const wins = filteredData.filter(d => d.result === 'win').length;

    return {
      generatedAt: new Date().toISOString(),
      levelRange: [startLevel, endLevel],
      totalPlays: filteredData.length,
      uniquePlayers,
      overallWinRate: filteredData.length > 0 ? wins / filteredData.length : 0,
      levelStats,
      difficultySpikes,
      balanceIssues,
      phaseStats,
      recommendations,
    };
  }

  /**
   * 计算各关卡统计
   */
  calculateLevelStats(data: LevelPlayData[], startLevel: number, endLevel: number): LevelStats[] {
    const stats: LevelStats[] = [];

    for (let level = startLevel; level <= endLevel; level++) {
      const levelData = data.filter(d => d.level === level);

      if (levelData.length === 0) {
        stats.push(this.createEmptyStats(level));
        continue;
      }

      const wins = levelData.filter(d => d.result === 'win');
      const losses = levelData.filter(d => d.result === 'lose');
      const quits = levelData.filter(d => d.result === 'quit');

      const avgMovesUsed = this.avg(levelData.map(d => d.movesUsed));
      const avgMovesRemaining = wins.length > 0
        ? this.avg(wins.map(d => d.movesTotal - d.movesUsed))
        : 0;

      const avgGoalProgress = this.avg(levelData.map(d => d.goalProgress));
      const avgGoalTotal = this.avg(levelData.map(d => d.goalTotal));

      // 挫败指数：失败率 * 平均重试次数 * (1 - 完成度)
      const frustrationIndex = this.calculateFrustrationIndex(levelData);

      stats.push({
        level,
        attempts: levelData.length,
        wins: wins.length,
        losses: losses.length,
        quits: quits.length,
        winRate: wins.length / levelData.length,
        avgMovesUsed,
        avgMovesRemaining,
        avgDuration: this.avg(levelData.map(d => d.duration)),
        avgCascades: this.avg(levelData.map(d => d.cascadeCount)),
        avgSpecials: this.avg(levelData.map(d => d.specialsTriggered)),
        avgRetries: this.avg(levelData.map(d => d.retryCount)),
        completionRate: avgGoalTotal > 0 ? avgGoalProgress / avgGoalTotal : 0,
        efficiency: avgMovesUsed > 0 ? avgGoalProgress / avgMovesUsed : 0,
        frustrationIndex,
      });
    }

    return stats;
  }

  /**
   * 检测难度突变
   */
  detectDifficultySpikes(levelStats: LevelStats[]): DifficultySpike[] {
    const spikes: DifficultySpike[] = [];

    for (let i = 1; i < levelStats.length; i++) {
      const prev = levelStats[i - 1];
      const curr = levelStats[i];

      // 跳过样本量太小的关卡
      if (curr.attempts < 10 || prev.attempts < 10) continue;

      const drop = prev.winRate - curr.winRate;

      if (drop >= THRESHOLDS.SPIKE_DROP_LOW) {
        let severity: DifficultySpike['severity'] = 'low';
        if (drop >= THRESHOLDS.SPIKE_DROP_CRITICAL) severity = 'critical';
        else if (drop >= THRESHOLDS.SPIKE_DROP_HIGH) severity = 'high';
        else if (drop >= THRESHOLDS.SPIKE_DROP_MEDIUM) severity = 'medium';

        spikes.push({
          level: curr.level,
          winRate: curr.winRate,
          prevWinRate: prev.winRate,
          drop,
          severity,
          suggestion: this.getSpikesuggestion(curr, drop),
        });
      }
    }

    return spikes;
  }

  /**
   * 检测平衡问题
   */
  detectBalanceIssues(levelStats: LevelStats[]): BalanceIssue[] {
    const issues: BalanceIssue[] = [];

    for (const stats of levelStats) {
      // 跳过样本量太小的关卡
      if (stats.attempts < 10) continue;

      const phase = this.getPhase(stats.level);
      const expectedRange = PHASE_WIN_RATES[phase] || { min: 0.3, max: 0.7 };

      // 太简单
      if (stats.winRate > THRESHOLDS.WIN_RATE_TOO_EASY && stats.level > 10) {
        issues.push({
          level: stats.level,
          issueType: 'too_easy',
          severity: 'medium',
          metric: 'winRate',
          currentValue: stats.winRate,
          expectedRange,
          suggestion: `关卡 ${stats.level} 胜率过高 (${(stats.winRate * 100).toFixed(1)}%)，建议减少步数或增加目标`,
        });
      }

      // 太难
      if (stats.winRate < THRESHOLDS.WIN_RATE_TOO_HARD) {
        issues.push({
          level: stats.level,
          issueType: 'too_hard',
          severity: 'high',
          metric: 'winRate',
          currentValue: stats.winRate,
          expectedRange,
          suggestion: `关卡 ${stats.level} 胜率过低 (${(stats.winRate * 100).toFixed(1)}%)，建议增加步数或降低苔藓密度`,
        });
      }

      // 高退出率
      const quitRate = stats.quits / stats.attempts;
      if (quitRate > THRESHOLDS.QUIT_RATE_HIGH) {
        issues.push({
          level: stats.level,
          issueType: 'high_quit_rate',
          severity: 'high',
          metric: 'quitRate',
          currentValue: quitRate,
          expectedRange: { min: 0, max: THRESHOLDS.QUIT_RATE_HIGH },
          suggestion: `关卡 ${stats.level} 退出率高 (${(quitRate * 100).toFixed(1)}%)，玩家可能感到挫败`,
        });
      }

      // 低参与度
      if (stats.avgDuration < THRESHOLDS.LOW_ENGAGEMENT_DURATION && stats.winRate < 0.5) {
        issues.push({
          level: stats.level,
          issueType: 'low_engagement',
          severity: 'medium',
          metric: 'avgDuration',
          currentValue: stats.avgDuration,
          expectedRange: { min: THRESHOLDS.LOW_ENGAGEMENT_DURATION, max: 300 },
          suggestion: `关卡 ${stats.level} 平均游戏时长短 (${stats.avgDuration.toFixed(1)}s)，玩家可能快速放弃`,
        });
      }

      // 高挫败指数
      if (stats.frustrationIndex > THRESHOLDS.FRUSTRATION_HIGH) {
        issues.push({
          level: stats.level,
          issueType: 'too_hard',
          severity: 'high',
          metric: 'frustrationIndex',
          currentValue: stats.frustrationIndex,
          expectedRange: { min: 0, max: THRESHOLDS.FRUSTRATION_HIGH },
          suggestion: `关卡 ${stats.level} 挫败指数高 (${stats.frustrationIndex.toFixed(2)})，需要降低难度`,
        });
      }
    }

    return issues;
  }

  /**
   * 计算阶段统计
   */
  calculatePhaseStats(levelStats: LevelStats[]): AnalysisReport['phaseStats'] {
    const phases = [
      { name: '新手期', range: [1, 10] as [number, number] },
      { name: '成长期', range: [11, 25] as [number, number] },
      { name: '挑战期', range: [26, 40] as [number, number] },
      { name: '大师期', range: [41, 50] as [number, number] },
      { name: '无限期', range: [51, 999] as [number, number] },
    ];

    return phases.map(phase => {
      const phaseStats = levelStats.filter(
        s => s.level >= phase.range[0] && s.level <= phase.range[1]
      );

      const totalAttempts = phaseStats.reduce((sum, s) => sum + s.attempts, 0);
      const totalWins = phaseStats.reduce((sum, s) => sum + s.wins, 0);
      const avgWinRate = totalAttempts > 0 ? totalWins / totalAttempts : 0;

      const target = PHASE_WIN_RATES[phase.name] || { min: 0.3, max: 0.7 };

      return {
        phase: phase.name,
        levelRange: phase.range,
        avgWinRate,
        targetWinRate: target,
        isInRange: avgWinRate >= target.min && avgWinRate <= target.max,
      };
    });
  }

  /**
   * 生成建议
   */
  generateRecommendations(
    spikes: DifficultySpike[],
    issues: BalanceIssue[]
  ): string[] {
    const recommendations: string[] = [];

    // 关键难度突变
    const criticalSpikes = spikes.filter(s => s.severity === 'critical' || s.severity === 'high');
    if (criticalSpikes.length > 0) {
      const levels = criticalSpikes.map(s => s.level).join(', ');
      recommendations.push(`优先修复关卡 ${levels} 的难度突变问题`);
    }

    // 高严重性问题
    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      const tooHard = highIssues.filter(i => i.issueType === 'too_hard');
      if (tooHard.length > 0) {
        recommendations.push(`${tooHard.length} 个关卡难度过高，建议调整参数`);
      }

      const highQuit = highIssues.filter(i => i.issueType === 'high_quit_rate');
      if (highQuit.length > 0) {
        recommendations.push(`${highQuit.length} 个关卡退出率过高，需要分析原因`);
      }
    }

    // 太简单的关卡
    const tooEasy = issues.filter(i => i.issueType === 'too_easy');
    if (tooEasy.length > 3) {
      recommendations.push(`${tooEasy.length} 个关卡过于简单，考虑增加挑战性`);
    }

    if (recommendations.length === 0) {
      recommendations.push('整体平衡良好，暂无重大问题');
    }

    return recommendations;
  }

  // ============================================
  // 辅助方法
  // ============================================

  private createEmptyStats(level: number): LevelStats {
    return {
      level,
      attempts: 0,
      wins: 0,
      losses: 0,
      quits: 0,
      winRate: 0,
      avgMovesUsed: 0,
      avgMovesRemaining: 0,
      avgDuration: 0,
      avgCascades: 0,
      avgSpecials: 0,
      avgRetries: 0,
      completionRate: 0,
      efficiency: 0,
      frustrationIndex: 0,
    };
  }

  private calculateFrustrationIndex(data: LevelPlayData[]): number {
    if (data.length === 0) return 0;

    const lossRate = data.filter(d => d.result === 'lose').length / data.length;
    const avgRetries = this.avg(data.map(d => d.retryCount));
    const avgCompletion = this.avg(data.map(d => d.goalProgress / d.goalTotal));

    // 挫败指数 = 失败率 * (1 + log(重试次数+1)) * (1 - 平均完成度)
    return lossRate * (1 + Math.log(avgRetries + 1)) * (1 - avgCompletion);
  }

  private getSpikesuggestion(stats: LevelStats, drop: number): string {
    if (stats.avgMovesRemaining < 1) {
      return '步数可能不足，建议增加 1-2 步';
    }
    if (stats.avgCascades < 2) {
      return '连消机会少，检查棋盘布局';
    }
    if (stats.avgSpecials < 1) {
      return '特殊块使用率低，可能需要更多步数形成 4 连';
    }
    return `胜率下降 ${(drop * 100).toFixed(1)}%，建议检查关卡参数`;
  }

  private getPhase(level: number): string {
    if (level <= 10) return '新手期';
    if (level <= 25) return '成长期';
    if (level <= 40) return '挑战期';
    if (level <= 50) return '大师期';
    return '无限期';
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * 快速分析单个关卡
   */
  analyzeSingleLevel(level: number): LevelStats | null {
    const levelData = this.playData.filter(d => d.level === level);
    if (levelData.length === 0) return null;

    const stats = this.calculateLevelStats(levelData, level, level);
    return stats[0] || null;
  }

  /**
   * 获取问题最严重的关卡
   */
  getProblematicLevels(limit: number = 5): LevelStats[] {
    const stats = this.calculateLevelStats(
      this.playData,
      Math.min(...this.playData.map(d => d.level)),
      Math.max(...this.playData.map(d => d.level))
    );

    // 按挫败指数排序
    return stats
      .filter(s => s.attempts >= 10)
      .sort((a, b) => b.frustrationIndex - a.frustrationIndex)
      .slice(0, limit);
  }
}
