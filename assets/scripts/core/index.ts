// ============================================
// 核心模块导出入口
// ============================================

// 类型定义
export * from './types';
export * from './interfaces';

// 核心模块
export { RNG, stableHash } from './RNG';
export { MossGenerator } from './MossGenerator';
export { MatchFinder } from './MatchFinder';
export { MatchResolver } from './MatchResolver';
export { LevelGenerator } from './LevelGenerator';
export { GoalTracker } from './GoalTracker';
export { EnergyManager } from './EnergyManager';
export { GameController } from './GameController';
export type { SwapResult, GameControllerConfig } from './GameController';
