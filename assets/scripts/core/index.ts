// ============================================
// Cocos Creator 核心模块导出入口
// 注意：游戏逻辑核心模块在 src/core 目录
// 此目录仅包含 Cocos 专用的状态和管理模块
// ============================================

// 类型定义
export * from './types';

// 场景和状态管理
export { SceneManager, sceneManager, SceneName, TransitionType } from './SceneManager';
export type { SceneLoadOptions } from './SceneManager';
export { PlayerProgress, playerProgress, MAX_LEVEL, MAX_STARS_PER_LEVEL } from './PlayerProgress';
export type { PlayerProgressData } from './PlayerProgress';
export { SettingsManager, settingsManager } from './SettingsManager';
export type { SettingsData, SettingsChangeEvent } from './SettingsManager';
export { GameState, gameState } from './GameState';
export type { RuntimeState } from './GameState';

// 道具系统
export { ItemManager, itemManager } from './ItemManager';
