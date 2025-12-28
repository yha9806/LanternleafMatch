/**
 * MiniGames Module - 迷你游戏模块导出
 */

// Rescue Mini Game - 救援猫狗
export {
  RescueMiniGame,
  createRescueMiniGame,
  getAllRescueScenarios,
  type RescueScenario,
  type RescueOption,
  type RescueReward,
  type RescueResult,
  type RescueGameState,
  type RescueGameEvent,
} from './RescueMiniGame';

// Color Sort Mini Game - 颜色排序
export {
  ColorSortMiniGame,
  createColorSortMiniGame,
  getRecommendedDifficulty,
  type Difficulty,
  type ColorSortConfig,
  type ColorSortReward,
  type ColorSortResult,
  type ColorSortGameState,
  type ColorSortGameEvent,
} from './ColorSortMiniGame';

// Treasure Hunt Mini Game - 寻宝挖掘
export {
  TreasureHuntMiniGame,
  createTreasureHuntMiniGame,
  getTreasureHuntConfigForLevel,
  type CellContent,
  type TreasureCell,
  type TreasureMap,
  type TreasureHuntConfig,
  type TreasureReward,
  type TreasureHuntResult,
  type TreasureHuntState,
  type TreasureHuntEvent,
  type HintType,
} from './TreasureHuntMiniGame';

// Mini Game Manager - 调度管理器
export {
  MiniGameManager,
  getMiniGameManager,
  createMiniGameManager,
  resetMiniGameManager,
  type MiniGameType,
  type MiniGameTrigger,
  type MiniGameSession,
  type MiniGameResult,
  type MiniGameManagerConfig,
  type MiniGameManagerState,
  type MiniGameEvent,
} from './MiniGameManager';
