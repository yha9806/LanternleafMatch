// ============================================
// 难度评估系统
// 基于关卡参数估算难度分数
// ============================================

import type { LevelDef, TileType } from '../types';

// ============================================
// 类型定义
// ============================================

export interface DifficultyFactors {
  movePressure: number;      // 步数压力 (0-1)
  boardComplexity: number;   // 棋盘复杂度 (0-1)
  goalDifficulty: number;    // 目标难度 (0-1)
  cascadePotential: number;  // 连消潜力 (0-1, 高=容易)
  specialReliability: number; // 特殊块依赖度 (0-1, 高=难)
}

export interface DifficultyBreakdown {
  score: number;             // 总分 (1-10)
  factors: DifficultyFactors;
  phase: DifficultyPhase;
  warnings: string[];
}

export interface DifficultyPhase {
  name: string;
  levelRange: [number, number];
  targetWinRate: { min: number; max: number };
  targetDifficulty: number;
}

// ============================================
// 常量
// ============================================

const BOARD_SIZE = 6;
const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;

// 难度因子权重
const FACTOR_WEIGHTS = {
  movePressure: 0.35,
  boardComplexity: 0.25,
  goalDifficulty: 0.20,
  cascadePotential: 0.10,  // 反向：低连消潜力 = 高难度
  specialReliability: 0.10,
};

// 目标类型基础难度
const GOAL_TYPE_DIFFICULTY: Record<string, number> = {
  collect: 0.4,
  clear_moss: 0.6,
  combo: 0.7,
};

// Pattern 难度系数
const PATTERN_DIFFICULTY: Record<string, number> = {
  none: 0,
  edge_ring: 0.15,
  corners: 0.20,
  diagonal: 0.30,
  center_blob: 0.35,
  center_cross: 0.40,
  stripes_h: 0.30,
  stripes_v: 0.30,
  scattered: 0.50,
};

// 难度阶段定义
export const DIFFICULTY_PHASES: DifficultyPhase[] = [
  {
    name: '新手期',
    levelRange: [1, 10],
    targetWinRate: { min: 0.95, max: 1.0 },
    targetDifficulty: 2,
  },
  {
    name: '成长期',
    levelRange: [11, 25],
    targetWinRate: { min: 0.80, max: 0.95 },
    targetDifficulty: 4,
  },
  {
    name: '挑战期',
    levelRange: [26, 40],
    targetWinRate: { min: 0.60, max: 0.85 },
    targetDifficulty: 6,
  },
  {
    name: '大师期',
    levelRange: [41, 50],
    targetWinRate: { min: 0.45, max: 0.70 },
    targetDifficulty: 8,
  },
  {
    name: '无限期',
    levelRange: [51, Infinity],
    targetWinRate: { min: 0.30, max: 0.60 },
    targetDifficulty: 9,
  },
];

// ============================================
// DifficultyEstimator 类
// ============================================

export class DifficultyEstimator {
  /**
   * 估算关卡难度 (1-10 分)
   */
  estimate(levelDef: LevelDef): number {
    const breakdown = this.analyzeLevel(levelDef);
    return breakdown.score;
  }

  /**
   * 详细难度分析
   */
  analyzeLevel(levelDef: LevelDef): DifficultyBreakdown {
    const factors = this.calculateFactors(levelDef);
    const levelIndex = levelDef.level_index;
    const phase = this.getPhase(levelIndex);
    const warnings: string[] = [];

    // 加权计算
    const rawScore =
      factors.movePressure * FACTOR_WEIGHTS.movePressure +
      factors.boardComplexity * FACTOR_WEIGHTS.boardComplexity +
      factors.goalDifficulty * FACTOR_WEIGHTS.goalDifficulty +
      (1 - factors.cascadePotential) * FACTOR_WEIGHTS.cascadePotential +
      factors.specialReliability * FACTOR_WEIGHTS.specialReliability;

    // 归一化到 1-10
    const score = Math.min(10, Math.max(1, rawScore * 10));

    // 检查异常
    if (Math.abs(score - phase.targetDifficulty) > 2) {
      warnings.push(`难度评分 ${score.toFixed(1)} 偏离目标 ${phase.targetDifficulty}`);
    }

    if (factors.movePressure > 0.8) {
      warnings.push('步数压力过大，建议增加步数');
    }

    if (factors.boardComplexity > 0.7 && levelIndex < 20) {
      warnings.push('早期关卡棋盘复杂度过高');
    }

    return {
      score: Math.round(score * 10) / 10,
      factors,
      phase,
      warnings,
    };
  }

  /**
   * 计算难度因子
   */
  calculateFactors(levelDef: LevelDef): DifficultyFactors {
    return {
      movePressure: this.calcMovePressure(levelDef),
      boardComplexity: this.calcBoardComplexity(levelDef),
      goalDifficulty: this.calcGoalDifficulty(levelDef),
      cascadePotential: this.calcCascadePotential(levelDef),
      specialReliability: this.calcSpecialReliability(levelDef),
    };
  }

  /**
   * 获取关卡所属难度阶段
   */
  getPhase(levelIndex: number): DifficultyPhase {
    for (const phase of DIFFICULTY_PHASES) {
      if (levelIndex >= phase.levelRange[0] && levelIndex <= phase.levelRange[1]) {
        return phase;
      }
    }
    return DIFFICULTY_PHASES[DIFFICULTY_PHASES.length - 1];
  }

  /**
   * 检查关卡是否在目标难度范围内
   */
  isInTargetRange(levelDef: LevelDef, tolerance: number = 1.5): boolean {
    const score = this.estimate(levelDef);
    const phase = this.getPhase(levelDef.level_index);
    return Math.abs(score - phase.targetDifficulty) <= tolerance;
  }

  // ============================================
  // 难度因子计算
  // ============================================

  /**
   * 步数压力计算
   * 公式：(目标数量 / 步数) / 基准效率
   * 基准效率 = 3.0 (平均每步消除3个目标物)
   */
  private calcMovePressure(levelDef: LevelDef): number {
    const BASE_EFFICIENCY = 3.0;

    let totalTarget = 0;

    for (const goal of levelDef.goals) {
      if (goal.type === 'collect') {
        totalTarget += goal.count;
      } else if (goal.type === 'clear_moss') {
        // 苔藓数量由 blockers 决定
        totalTarget += levelDef.blockers.cells.length;
      } else if (goal.type === 'combo') {
        // combo 同时包含收集和清苔藓
        totalTarget += goal.collect?.count || 0;
        totalTarget += goal.clearMoss?.count || levelDef.blockers.cells.length;
      }
    }

    if (levelDef.moves <= 0) return 1.0;

    const pressure = (totalTarget / levelDef.moves) / BASE_EFFICIENCY;
    return Math.min(1, Math.max(0, pressure));
  }

  /**
   * 棋盘复杂度计算
   * 基于苔藓密度和分布模式
   */
  private calcBoardComplexity(levelDef: LevelDef): number {
    const density = levelDef.blockers.density;
    const patternBonus = PATTERN_DIFFICULTY[levelDef.blockers.pattern] || 0;

    // 检查苔藓分布的集中度
    const clusterPenalty = this.calcClusterPenalty(levelDef.blockers.cells);

    const complexity = density + patternBonus + clusterPenalty * 0.1;
    return Math.min(1, Math.max(0, complexity));
  }

  /**
   * 计算苔藓集中度惩罚
   * 苔藓越集中，清除越困难
   */
  private calcClusterPenalty(cells: Array<{ row: number; col: number }>): number {
    if (cells.length < 2) return 0;

    // 计算中心点
    const centerR = cells.reduce((sum, c) => sum + c.row, 0) / cells.length;
    const centerC = cells.reduce((sum, c) => sum + c.col, 0) / cells.length;

    // 计算平均距离
    const avgDist = cells.reduce((sum, c) => {
      return sum + Math.sqrt(Math.pow(c.row - centerR, 2) + Math.pow(c.col - centerC, 2));
    }, 0) / cells.length;

    // 距离越小 = 越集中 = 惩罚越高
    const maxDist = BOARD_SIZE * Math.sqrt(2) / 2;
    return 1 - avgDist / maxDist;
  }

  /**
   * 目标难度计算
   * 不同目标类型有不同的基础难度
   */
  private calcGoalDifficulty(levelDef: LevelDef): number {
    let totalDifficulty = 0;
    let goalCount = 0;

    for (const goal of levelDef.goals) {
      if (goal.type === 'collect') {
        // 收集目标：基础难度 + 物品稀有度
        const baseD = GOAL_TYPE_DIFFICULTY.collect;
        const rarityBonus = this.calcItemRarity(goal.item, levelDef.tile_weights);
        totalDifficulty += baseD + rarityBonus * 0.2;
        goalCount++;
      } else if (goal.type === 'clear_moss') {
        totalDifficulty += GOAL_TYPE_DIFFICULTY.clear_moss;
        goalCount++;
      } else if (goal.type === 'combo') {
        totalDifficulty += GOAL_TYPE_DIFFICULTY.combo;
        goalCount++;
      }
    }

    return goalCount > 0 ? totalDifficulty / goalCount : 0.5;
  }

  /**
   * 计算物品稀有度
   * 权重越低 = 越稀有 = 越难收集
   */
  private calcItemRarity(item: TileType, weights: Record<TileType, number>): number {
    const itemWeight = weights[item] || 1.0;
    const avgWeight = Object.values(weights).reduce((a, b) => a + b, 0) / 5;

    // 权重低于平均值 = 稀有
    return Math.max(0, avgWeight - itemWeight) / avgWeight;
  }

  /**
   * 连消潜力计算
   * 基于棋盘开放度估算（苔藓越少、分布越分散 = 连消潜力越高）
   */
  private calcCascadePotential(levelDef: LevelDef): number {
    // 开放格子比例
    const blockedCells = levelDef.blockers.cells.length;
    const openRatio = 1 - blockedCells / TOTAL_CELLS;

    // Pattern 影响连消（集中型 pattern 限制连消）
    const patternPenalty = PATTERN_DIFFICULTY[levelDef.blockers.pattern] || 0;

    return Math.max(0, Math.min(1, openRatio - patternPenalty * 0.3));
  }

  /**
   * 特殊块依赖度计算
   * 估算玩家是否需要特殊块才能通关
   */
  private calcSpecialReliability(levelDef: LevelDef): number {
    // 高目标数量 + 少步数 = 需要特殊块
    const targetPerMove = this.calcMovePressure(levelDef);

    // 如果每步需要消除 > 3.5 个，则依赖特殊块
    if (targetPerMove > 0.85) return 0.9;
    if (targetPerMove > 0.7) return 0.6;
    if (targetPerMove > 0.5) return 0.3;
    return 0.1;
  }

  // ============================================
  // 工具方法
  // ============================================

  /**
   * 批量评估关卡列表
   */
  evaluateAll(levels: LevelDef[]): Map<number, DifficultyBreakdown> {
    const results = new Map<number, DifficultyBreakdown>();
    for (const levelDef of levels) {
      const breakdown = this.analyzeLevel(levelDef);
      results.set(levelDef.level_index, breakdown);
    }
    return results;
  }

  /**
   * 生成难度曲线报告
   */
  generateReport(levels: LevelDef[]): {
    summary: { avgDifficulty: number; stdDev: number; warnings: number };
    byPhase: Record<string, { count: number; avgDifficulty: number }>;
    outliers: Array<{ level: number; score: number; expected: number }>;
  } {
    const breakdowns = levels.map(l => this.analyzeLevel(l));
    const scores = breakdowns.map(b => b.score);

    // 统计摘要
    const avgDifficulty = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgDifficulty, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const warnings = breakdowns.reduce((sum, b) => sum + b.warnings.length, 0);

    // 按阶段统计
    const byPhase: Record<string, { count: number; avgDifficulty: number }> = {};
    for (const phase of DIFFICULTY_PHASES) {
      const phaseBreakdowns = breakdowns.filter(
        b => levels.find(l => l.level === b.phase.levelRange[0])?.level! >= phase.levelRange[0] &&
             levels.find(l => l.level === b.phase.levelRange[0])?.level! <= phase.levelRange[1]
      );
      if (phaseBreakdowns.length > 0) {
        byPhase[phase.name] = {
          count: phaseBreakdowns.length,
          avgDifficulty: phaseBreakdowns.reduce((sum, b) => sum + b.score, 0) / phaseBreakdowns.length,
        };
      }
    }

    // 异常值检测
    const outliers: Array<{ level: number; score: number; expected: number }> = [];
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const breakdown = breakdowns[i];
      const expected = breakdown.phase.targetDifficulty;

      if (Math.abs(breakdown.score - expected) > 2) {
        outliers.push({
          level: level.level,
          score: breakdown.score,
          expected,
        });
      }
    }

    return {
      summary: {
        avgDifficulty: Math.round(avgDifficulty * 10) / 10,
        stdDev: Math.round(stdDev * 100) / 100,
        warnings,
      },
      byPhase,
      outliers,
    };
  }
}
