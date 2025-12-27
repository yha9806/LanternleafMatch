// ============================================
// 数值平衡公式模块
// 核心数值计算公式
// ============================================

import type { TileType } from '../types';

// ============================================
// 平衡常量
// ============================================

export const BALANCE_CONSTANTS = {
  // 步数参数
  MOVES_BASE: 14,
  MOVES_DECAY: 0.08,
  MOVES_WAVE_AMPLITUDE: 1,
  MOVES_MIN: 4,
  MOVES_MAX: 15,

  // 目标数量参数
  GOAL_BASE: 8,
  GOAL_GROWTH: 0.15,
  GOAL_MIN: 6,
  GOAL_MAX: 35,

  // 苔藓密度参数
  DENSITY_BASE: 0,
  DENSITY_GROWTH: 0.006,
  DENSITY_CAP: 0.35,

  // 收益参数
  EXPECTED_PER_MOVE: 3.0,
  CASCADE_BONUS_MIN: 0.5,
  CASCADE_BONUS_MAX: 1.5,
  GOAL_WEIGHT_BOOST: 1.08,

  // 胜率参数
  WIN_RATE_VOLATILITY: 5.0,

  // Boss 关卡
  BOSS_LEVEL_INTERVAL: 25,
  BOSS_DIFFICULTY_MULTIPLIER: 1.3,
};

// 目标类型系数
const GOAL_TYPE_MULTIPLIER: Record<string, number> = {
  collect: 1.0,
  clear_moss: 0.8,
  combo: 0.9,
};

// 物品稀有度权重
const DEFAULT_TILE_WEIGHTS: Record<TileType, number> = {
  leaf: 1.0,
  acorn: 1.0,
  star: 0.9,
  fish: 0.8,
  bone: 0.8,
};

// ============================================
// 核心公式函数
// ============================================

/**
 * 计算关卡步数
 * 公式：floor(base - level * decay + sin(level * 0.3) * amplitude)
 *
 * @param level 关卡索引
 * @param config 可选配置覆盖
 * @returns 步数
 */
export function calculateMoves(
  level: number,
  config: Partial<typeof BALANCE_CONSTANTS> = {}
): number {
  const c = { ...BALANCE_CONSTANTS, ...config };

  const wave = Math.sin(level * 0.3);
  const raw = c.MOVES_BASE - level * c.MOVES_DECAY + wave * c.MOVES_WAVE_AMPLITUDE;

  return Math.floor(Math.max(c.MOVES_MIN, Math.min(c.MOVES_MAX, raw)));
}

/**
 * 计算目标数量
 * 公式：floor(base + level * growth * goalMultiplier)
 *
 * @param level 关卡索引
 * @param goalType 目标类型
 * @param config 可选配置覆盖
 * @returns 目标数量
 */
export function calculateGoalCount(
  level: number,
  goalType: string = 'collect',
  config: Partial<typeof BALANCE_CONSTANTS> = {}
): number {
  const c = { ...BALANCE_CONSTANTS, ...config };
  const multiplier = GOAL_TYPE_MULTIPLIER[goalType] || 1.0;

  const raw = c.GOAL_BASE + level * c.GOAL_GROWTH * multiplier;

  return Math.floor(Math.max(c.GOAL_MIN, Math.min(c.GOAL_MAX, raw)));
}

/**
 * 计算苔藓密度
 * 公式：min(base + level * growth, cap)
 *
 * @param level 关卡索引
 * @param config 可选配置覆盖
 * @returns 密度 (0-1)
 */
export function calculateDensity(
  level: number,
  config: Partial<typeof BALANCE_CONSTANTS> = {}
): number {
  const c = { ...BALANCE_CONSTANTS, ...config };

  const raw = c.DENSITY_BASE + level * c.DENSITY_GROWTH;

  return Math.min(raw, c.DENSITY_CAP);
}

/**
 * 预估胜率 (Sigmoid 函数)
 * 公式：sigmoid((moves * expectedPerMove - totalGoal) / volatility)
 *
 * @param moves 步数
 * @param totalGoal 总目标数量
 * @param config 可选配置覆盖
 * @returns 预估胜率 (0-1)
 */
export function estimateWinRate(
  moves: number,
  totalGoal: number,
  config: Partial<typeof BALANCE_CONSTANTS> = {}
): number {
  const c = { ...BALANCE_CONSTANTS, ...config };

  const expected = moves * c.EXPECTED_PER_MOVE * c.GOAL_WEIGHT_BOOST;
  const x = (expected - totalGoal) / c.WIN_RATE_VOLATILITY;

  return sigmoid(x);
}

/**
 * Sigmoid 函数
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// ============================================
// 关卡生成辅助函数
// ============================================

/**
 * 选择 Pattern 基于关卡索引
 */
export function selectPattern(level: number): string {
  const PATTERN_RANGES: Array<{ pattern: string; minLevel: number; maxLevel: number; weight: number }> = [
    { pattern: 'none', minLevel: 1, maxLevel: 8, weight: 1.0 },
    { pattern: 'edge_ring', minLevel: 5, maxLevel: 20, weight: 0.8 },
    { pattern: 'corners', minLevel: 8, maxLevel: 28, weight: 0.7 },
    { pattern: 'diagonal', minLevel: 12, maxLevel: 35, weight: 0.6 },
    { pattern: 'center_blob', minLevel: 15, maxLevel: 45, weight: 0.6 },
    { pattern: 'center_cross', minLevel: 18, maxLevel: 50, weight: 0.5 },
    { pattern: 'stripes_h', minLevel: 26, maxLevel: Infinity, weight: 0.5 },
    { pattern: 'stripes_v', minLevel: 26, maxLevel: Infinity, weight: 0.5 },
    { pattern: 'scattered', minLevel: 35, maxLevel: Infinity, weight: 0.6 },
  ];

  const available = PATTERN_RANGES.filter(
    p => level >= p.minLevel && level <= p.maxLevel
  );

  if (available.length === 0) {
    return 'scattered';
  }

  // 加权随机选择
  const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const p of available) {
    roll -= p.weight;
    if (roll <= 0) return p.pattern;
  }

  return available[available.length - 1].pattern;
}

/**
 * 选择目标类型基于关卡索引
 */
export function selectGoalType(level: number): 'collect' | 'clear_moss' | 'combo' {
  // 前 10 关主要是 collect
  if (level <= 10) {
    return Math.random() < 0.9 ? 'collect' : 'clear_moss';
  }

  // 10-25 关引入 clear_moss
  if (level <= 25) {
    const roll = Math.random();
    if (roll < 0.6) return 'collect';
    if (roll < 0.85) return 'clear_moss';
    return 'combo';
  }

  // 25-40 关混合
  if (level <= 40) {
    const roll = Math.random();
    if (roll < 0.5) return 'collect';
    if (roll < 0.75) return 'clear_moss';
    return 'combo';
  }

  // 40+ 关增加 combo
  const roll = Math.random();
  if (roll < 0.4) return 'collect';
  if (roll < 0.7) return 'clear_moss';
  return 'combo';
}

/**
 * 选择目标物品
 */
export function selectGoalItem(level: number): TileType {
  const items: TileType[] = ['leaf', 'acorn', 'star', 'fish', 'bone'];

  // 轮换机制，确保每种物品都有机会
  const cycle = (level - 1) % 5;
  return items[cycle];
}

/**
 * 计算物品权重
 * 目标物品权重略高（1.08x），增加其出现概率
 */
export function calculateTileWeights(
  goalItem: TileType | null,
  boostFactor: number = BALANCE_CONSTANTS.GOAL_WEIGHT_BOOST
): Record<TileType, number> {
  const weights = { ...DEFAULT_TILE_WEIGHTS };

  if (goalItem) {
    weights[goalItem] *= boostFactor;
  }

  return weights;
}

/**
 * 判断是否为 Boss 关卡
 */
export function isBossLevel(level: number): boolean {
  return level > 0 && level % BALANCE_CONSTANTS.BOSS_LEVEL_INTERVAL === 0;
}

/**
 * 应用 Boss 关卡难度加成
 */
export function applyBossModifier<T extends { moves: number; density: number; goalCount?: number }>(
  params: T
): T {
  return {
    ...params,
    moves: Math.max(BALANCE_CONSTANTS.MOVES_MIN, params.moves - 1),
    density: Math.min(BALANCE_CONSTANTS.DENSITY_CAP, params.density * BALANCE_CONSTANTS.BOSS_DIFFICULTY_MULTIPLIER),
  };
}

// ============================================
// 难度调整函数
// ============================================

/**
 * 根据验证结果调整参数
 */
export function adjustForWinRate(
  currentMoves: number,
  currentDensity: number,
  actualWinRate: number,
  targetWinRate: { min: number; max: number }
): { moves: number; density: number } {
  let moves = currentMoves;
  let density = currentDensity;

  if (actualWinRate < targetWinRate.min) {
    // 太难了，降低难度
    moves = Math.min(BALANCE_CONSTANTS.MOVES_MAX, moves + 1);
    density = Math.max(0, density * 0.9);
  } else if (actualWinRate > targetWinRate.max) {
    // 太简单了，增加难度
    moves = Math.max(BALANCE_CONSTANTS.MOVES_MIN, moves - 1);
    density = Math.min(BALANCE_CONSTANTS.DENSITY_CAP, density * 1.1);
  }

  return { moves, density };
}

/**
 * 生成关卡参数建议
 */
export function suggestLevelParams(level: number): {
  moves: number;
  goalCount: number;
  density: number;
  pattern: string;
  goalType: string;
  goalItem: TileType;
  estimatedWinRate: number;
} {
  const moves = calculateMoves(level);
  const goalType = selectGoalType(level);
  const goalCount = calculateGoalCount(level, goalType);
  const density = calculateDensity(level);
  const pattern = selectPattern(level);
  const goalItem = selectGoalItem(level);
  const estimatedWinRate = estimateWinRate(moves, goalCount);

  return {
    moves,
    goalCount,
    density,
    pattern,
    goalType,
    goalItem,
    estimatedWinRate,
  };
}

// ============================================
// 批量生成工具
// ============================================

/**
 * 批量生成关卡参数建议
 */
export function generateLevelSuggestions(
  startLevel: number,
  endLevel: number
): Array<ReturnType<typeof suggestLevelParams> & { level: number }> {
  const suggestions = [];

  for (let level = startLevel; level <= endLevel; level++) {
    const params = suggestLevelParams(level);

    // Boss 关卡特殊处理
    if (isBossLevel(level)) {
      const bossParams = applyBossModifier({ moves: params.moves, density: params.density });
      suggestions.push({
        level,
        ...params,
        ...bossParams,
        estimatedWinRate: estimateWinRate(bossParams.moves, params.goalCount),
      });
    } else {
      suggestions.push({ level, ...params });
    }
  }

  return suggestions;
}

/**
 * 验证关卡参数合理性
 */
export function validateLevelParams(params: {
  level: number;
  moves: number;
  goalCount: number;
  density: number;
}): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 步数检查
  if (params.moves < BALANCE_CONSTANTS.MOVES_MIN) {
    warnings.push(`步数 ${params.moves} 低于最小值 ${BALANCE_CONSTANTS.MOVES_MIN}`);
  }
  if (params.moves > BALANCE_CONSTANTS.MOVES_MAX) {
    warnings.push(`步数 ${params.moves} 超过最大值 ${BALANCE_CONSTANTS.MOVES_MAX}`);
  }

  // 目标数量检查
  if (params.goalCount < BALANCE_CONSTANTS.GOAL_MIN) {
    warnings.push(`目标数量 ${params.goalCount} 低于最小值 ${BALANCE_CONSTANTS.GOAL_MIN}`);
  }
  if (params.goalCount > BALANCE_CONSTANTS.GOAL_MAX) {
    warnings.push(`目标数量 ${params.goalCount} 超过最大值 ${BALANCE_CONSTANTS.GOAL_MAX}`);
  }

  // 密度检查
  if (params.density > BALANCE_CONSTANTS.DENSITY_CAP) {
    warnings.push(`苔藓密度 ${params.density.toFixed(2)} 超过上限 ${BALANCE_CONSTANTS.DENSITY_CAP}`);
  }

  // 可玩性检查
  const winRate = estimateWinRate(params.moves, params.goalCount);
  if (winRate < 0.1) {
    warnings.push(`预估胜率过低 ${(winRate * 100).toFixed(1)}%，可能无法通关`);
  }

  // 早期关卡难度检查
  if (params.level <= 10 && winRate < 0.9) {
    warnings.push(`新手关卡 ${params.level} 胜率 ${(winRate * 100).toFixed(1)}% 可能过难`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

// ============================================
// 导出配置类型
// ============================================

export interface BalanceConfig {
  version: string;
  lastUpdated: string;
  constants: typeof BALANCE_CONSTANTS;
}

/**
 * 创建默认配置
 */
export function createDefaultConfig(): BalanceConfig {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    constants: { ...BALANCE_CONSTANTS },
  };
}
