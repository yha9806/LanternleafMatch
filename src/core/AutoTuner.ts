// ============================================
// 自动调优系统
// 基于分析结果生成参数调整建议
// ============================================

import type { LevelDef, TileType } from '../types';
import { LevelStats, BalanceIssue, DifficultySpike } from './LevelAnalyzer';
import { BALANCE_CONSTANTS, calculateMoves, calculateGoalCount, calculateDensity } from './BalanceFormulas';
import { LevelValidator, ValidationResult } from './LevelValidator';
import { LevelGenerator } from './LevelGenerator';

// ============================================
// 类型定义
// ============================================

export interface TuningRecommendation {
  level: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  currentParams: LevelParams;
  suggestedParams: LevelParams;
  changes: ParamChange[];
  expectedImprovement: {
    winRateDelta: number;
    confidenceLevel: number;
  };
  reasoning: string;
}

export interface LevelParams {
  moves: number;
  goalCount: number;
  density: number;
  pattern: string;
  goalType: string;
}

export interface ParamChange {
  param: keyof LevelParams;
  oldValue: number | string;
  newValue: number | string;
  reason: string;
}

export interface TuningConfig {
  // 目标胜率范围
  targetWinRate: { min: number; max: number };

  // 调整幅度限制
  maxMovesChange: number;
  maxGoalChange: number;
  maxDensityChange: number;

  // 验证配置
  validationIterations: number;
  validationTimeout: number;

  // 是否自动应用
  autoApply: boolean;
}

export interface TuningResult {
  recommendations: TuningRecommendation[];
  summary: {
    totalLevels: number;
    levelsNeedingTuning: number;
    criticalIssues: number;
    estimatedImpact: string;
  };
}

// ============================================
// 默认配置
// ============================================

const DEFAULT_TUNING_CONFIG: TuningConfig = {
  targetWinRate: { min: 0.50, max: 0.80 },
  maxMovesChange: 2,
  maxGoalChange: 3,
  maxDensityChange: 0.05,
  validationIterations: 50,
  validationTimeout: 5000,
  autoApply: false,
};

// 阶段特定目标
const PHASE_TARGETS: Record<string, { min: number; max: number }> = {
  '新手期': { min: 0.90, max: 1.0 },
  '成长期': { min: 0.75, max: 0.90 },
  '挑战期': { min: 0.55, max: 0.75 },
  '大师期': { min: 0.40, max: 0.65 },
  '无限期': { min: 0.30, max: 0.55 },
};

// ============================================
// AutoTuner 类
// ============================================

export class AutoTuner {
  private validator = new LevelValidator();
  private generator = new LevelGenerator();
  private config: TuningConfig;

  constructor(config: Partial<TuningConfig> = {}) {
    this.config = { ...DEFAULT_TUNING_CONFIG, ...config };
  }

  /**
   * 基于关卡统计生成调优建议
   */
  generateRecommendations(
    levelStats: LevelStats[],
    currentLevelDefs: Map<number, LevelDef>
  ): TuningResult {
    const recommendations: TuningRecommendation[] = [];

    for (const stats of levelStats) {
      // 跳过样本量不足的关卡
      if (stats.attempts < 20) continue;

      const levelDef = currentLevelDefs.get(stats.level);
      if (!levelDef) continue;

      const target = this.getTargetWinRate(stats.level);

      // 检查是否需要调优
      if (stats.winRate >= target.min && stats.winRate <= target.max) {
        continue; // 在目标范围内，无需调整
      }

      const recommendation = this.createRecommendation(stats, levelDef, target);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // 按优先级排序
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
      recommendations,
      summary: {
        totalLevels: levelStats.length,
        levelsNeedingTuning: recommendations.length,
        criticalIssues: recommendations.filter(r => r.priority === 'critical').length,
        estimatedImpact: this.estimateOverallImpact(recommendations),
      },
    };
  }

  /**
   * 为单个关卡创建调优建议
   */
  private createRecommendation(
    stats: LevelStats,
    levelDef: LevelDef,
    target: { min: number; max: number }
  ): TuningRecommendation | null {
    const currentParams = this.extractParams(levelDef);
    const changes: ParamChange[] = [];

    // 确定问题类型和严重程度
    const isTooHard = stats.winRate < target.min;
    const isTooEasy = stats.winRate > target.max;

    const gap = isTooHard
      ? target.min - stats.winRate
      : stats.winRate - target.max;

    const priority = this.determinePriority(gap, stats);

    // 计算建议参数
    const suggestedParams = { ...currentParams };

    if (isTooHard) {
      // 太难：增加步数、减少目标、降低密度
      const movesIncrease = Math.min(
        this.config.maxMovesChange,
        Math.ceil(gap * 10)
      );
      if (movesIncrease > 0 && suggestedParams.moves < BALANCE_CONSTANTS.MOVES_MAX) {
        suggestedParams.moves = Math.min(
          BALANCE_CONSTANTS.MOVES_MAX,
          suggestedParams.moves + movesIncrease
        );
        changes.push({
          param: 'moves',
          oldValue: currentParams.moves,
          newValue: suggestedParams.moves,
          reason: `胜率低于目标 ${(gap * 100).toFixed(1)}%`,
        });
      }

      // 如果步数调整不够，减少密度
      if (gap > 0.15 && suggestedParams.density > 0.05) {
        const densityDecrease = Math.min(
          this.config.maxDensityChange,
          gap * 0.2
        );
        suggestedParams.density = Math.max(0, suggestedParams.density - densityDecrease);
        changes.push({
          param: 'density',
          oldValue: currentParams.density,
          newValue: suggestedParams.density,
          reason: '降低苔藓密度以增加操作空间',
        });
      }
    } else if (isTooEasy) {
      // 太简单：减少步数、增加目标、提高密度
      const movesDecrease = Math.min(
        this.config.maxMovesChange,
        Math.ceil(gap * 8)
      );
      if (movesDecrease > 0 && suggestedParams.moves > BALANCE_CONSTANTS.MOVES_MIN) {
        suggestedParams.moves = Math.max(
          BALANCE_CONSTANTS.MOVES_MIN,
          suggestedParams.moves - movesDecrease
        );
        changes.push({
          param: 'moves',
          oldValue: currentParams.moves,
          newValue: suggestedParams.moves,
          reason: `胜率高于目标 ${(gap * 100).toFixed(1)}%`,
        });
      }

      // 如果步数调整不够，增加密度
      if (gap > 0.10 && suggestedParams.density < BALANCE_CONSTANTS.DENSITY_CAP) {
        const densityIncrease = Math.min(
          this.config.maxDensityChange,
          gap * 0.15
        );
        suggestedParams.density = Math.min(
          BALANCE_CONSTANTS.DENSITY_CAP,
          suggestedParams.density + densityIncrease
        );
        changes.push({
          param: 'density',
          oldValue: currentParams.density,
          newValue: suggestedParams.density,
          reason: '增加苔藓密度以提升挑战',
        });
      }
    }

    if (changes.length === 0) {
      return null;
    }

    // 估算改进效果
    const expectedImprovement = this.estimateImprovement(
      currentParams,
      suggestedParams,
      stats.winRate,
      target
    );

    return {
      level: stats.level,
      priority,
      currentParams,
      suggestedParams,
      changes,
      expectedImprovement,
      reasoning: this.generateReasoning(stats, changes, isTooHard),
    };
  }

  /**
   * 验证调优建议
   */
  async validateRecommendation(
    recommendation: TuningRecommendation,
    originalLevelDef: LevelDef
  ): Promise<{
    isValid: boolean;
    newValidation: ValidationResult;
    improvement: number;
  }> {
    // 创建修改后的关卡定义
    const modifiedDef = this.applyParamsToLevelDef(
      originalLevelDef,
      recommendation.suggestedParams
    );

    // 验证修改后的关卡
    const newValidation = this.validator.validate(modifiedDef, {
      iterations: this.config.validationIterations,
      strategies: ['mixed'],
      timeoutMs: this.config.validationTimeout,
    });

    const target = this.getTargetWinRate(recommendation.level);
    const isValid = newValidation.winRate >= target.min && newValidation.winRate <= target.max;

    // 计算实际改进
    const originalValidation = this.validator.quickValidate(originalLevelDef, 30);
    const improvement = newValidation.winRate - originalValidation.winRate;

    return {
      isValid,
      newValidation,
      improvement,
    };
  }

  /**
   * 批量验证所有建议
   */
  async validateAllRecommendations(
    recommendations: TuningRecommendation[],
    levelDefs: Map<number, LevelDef>
  ): Promise<Map<number, { isValid: boolean; improvement: number }>> {
    const results = new Map<number, { isValid: boolean; improvement: number }>();

    for (const rec of recommendations) {
      const levelDef = levelDefs.get(rec.level);
      if (!levelDef) continue;

      const validation = await this.validateRecommendation(rec, levelDef);
      results.set(rec.level, {
        isValid: validation.isValid,
        improvement: validation.improvement,
      });
    }

    return results;
  }

  /**
   * 生成调优脚本（用于批量应用）
   */
  generateTuningScript(recommendations: TuningRecommendation[]): string {
    const lines: string[] = [
      '// 自动生成的调优脚本',
      `// 生成时间: ${new Date().toISOString()}`,
      `// 涉及关卡数: ${recommendations.length}`,
      '',
      'const tuningChanges = [',
    ];

    for (const rec of recommendations) {
      lines.push(`  {`);
      lines.push(`    level: ${rec.level},`);
      lines.push(`    priority: '${rec.priority}',`);
      lines.push(`    changes: {`);

      for (const change of rec.changes) {
        const value = typeof change.newValue === 'string'
          ? `'${change.newValue}'`
          : change.newValue;
        lines.push(`      ${change.param}: ${value}, // was: ${change.oldValue}`);
      }

      lines.push(`    },`);
      lines.push(`    reasoning: '${rec.reasoning.replace(/'/g, "\\'")}',`);
      lines.push(`  },`);
    }

    lines.push('];');
    lines.push('');
    lines.push('export default tuningChanges;');

    return lines.join('\n');
  }

  // ============================================
  // 辅助方法
  // ============================================

  private getTargetWinRate(level: number): { min: number; max: number } {
    const phase = this.getPhase(level);
    return PHASE_TARGETS[phase] || this.config.targetWinRate;
  }

  private getPhase(level: number): string {
    if (level <= 10) return '新手期';
    if (level <= 25) return '成长期';
    if (level <= 40) return '挑战期';
    if (level <= 50) return '大师期';
    return '无限期';
  }

  private extractParams(levelDef: LevelDef): LevelParams {
    const goal = levelDef.goals[0];
    return {
      moves: levelDef.moves,
      goalCount: goal?.type === 'collect' ? goal.count : 0,
      density: levelDef.blockers.density,
      pattern: levelDef.blockers.pattern,
      goalType: goal?.type || 'collect',
    };
  }

  private applyParamsToLevelDef(levelDef: LevelDef, params: LevelParams): LevelDef {
    return {
      ...levelDef,
      moves: params.moves,
      blockers: {
        ...levelDef.blockers,
        density: params.density,
      },
      goals: levelDef.goals.map(goal => {
        if (goal.type === 'collect') {
          return { ...goal, count: params.goalCount };
        }
        return goal;
      }),
    };
  }

  private determinePriority(gap: number, stats: LevelStats): TuningRecommendation['priority'] {
    // 基于差距和挫败指数
    if (gap > 0.25 || stats.frustrationIndex > 0.8) return 'critical';
    if (gap > 0.15 || stats.frustrationIndex > 0.6) return 'high';
    if (gap > 0.10) return 'medium';
    return 'low';
  }

  private estimateImprovement(
    current: LevelParams,
    suggested: LevelParams,
    currentWinRate: number,
    target: { min: number; max: number }
  ): { winRateDelta: number; confidenceLevel: number } {
    // 简单估算：每增加1步约提升5%胜率
    const movesDelta = suggested.moves - current.moves;
    const densityDelta = current.density - suggested.density;

    const estimatedDelta = movesDelta * 0.05 + densityDelta * 0.3;

    // 置信度基于变化幅度
    const totalChange = Math.abs(movesDelta) + Math.abs(densityDelta) * 10;
    const confidenceLevel = Math.max(0.3, 1 - totalChange * 0.1);

    return {
      winRateDelta: estimatedDelta,
      confidenceLevel,
    };
  }

  private generateReasoning(
    stats: LevelStats,
    changes: ParamChange[],
    isTooHard: boolean
  ): string {
    const parts: string[] = [];

    if (isTooHard) {
      parts.push(`当前胜率 ${(stats.winRate * 100).toFixed(1)}% 低于目标`);

      if (stats.avgMovesRemaining < 0.5) {
        parts.push('平均剩余步数接近0');
      }
      if (stats.frustrationIndex > 0.5) {
        parts.push('挫败指数较高');
      }
    } else {
      parts.push(`当前胜率 ${(stats.winRate * 100).toFixed(1)}% 高于目标`);

      if (stats.avgMovesRemaining > 3) {
        parts.push(`平均剩余 ${stats.avgMovesRemaining.toFixed(1)} 步`);
      }
    }

    return parts.join('，');
  }

  private estimateOverallImpact(recommendations: TuningRecommendation[]): string {
    if (recommendations.length === 0) return '无需调整';

    const critical = recommendations.filter(r => r.priority === 'critical').length;
    const high = recommendations.filter(r => r.priority === 'high').length;

    if (critical > 0) {
      return `${critical} 个关键问题需立即处理`;
    }
    if (high > 0) {
      return `${high} 个高优先级问题`;
    }
    return `${recommendations.length} 个优化建议`;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TuningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): TuningConfig {
    return { ...this.config };
  }
}
