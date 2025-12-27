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
