// ============================================
// 核心模块导出
// ============================================

// 类型
export * from '../types';

// 接口
export * from './interfaces';

// 实现
export { RNG, stableHash } from './RNG';
export { MossGenerator } from './MossGenerator';
export { MatchFinder } from './MatchFinder';
export { MatchResolver } from './MatchResolver';
export { LevelGenerator } from './LevelGenerator';
export { GoalTracker } from './GoalTracker';
export { GameController } from './GameController';
export type { SwapResult, GameControllerConfig } from './GameController';
export { EnergyManager } from './EnergyManager';

// 关卡验证与难度系统
export { LevelValidator } from './LevelValidator';
export type {
  SimStrategy,
  SimulationConfig,
  SimulationRun,
  ValidationResult,
  MovePreview,
} from './LevelValidator';

export { DifficultyEstimator, DIFFICULTY_PHASES } from './DifficultyEstimator';
export type {
  DifficultyFactors,
  DifficultyBreakdown,
  DifficultyPhase,
} from './DifficultyEstimator';

export {
  BALANCE_CONSTANTS,
  calculateMoves,
  calculateGoalCount,
  calculateDensity,
  estimateWinRate,
  selectPattern,
  selectGoalType,
  selectGoalItem,
  calculateTileWeights,
  isBossLevel,
  applyBossModifier,
  adjustForWinRate,
  suggestLevelParams,
  generateLevelSuggestions,
  validateLevelParams,
  createDefaultConfig,
} from './BalanceFormulas';
export type { BalanceConfig } from './BalanceFormulas';
