// ============================================
// UI 模块导出
// ============================================

export {
  EnergyGateModal,
  showEnergyGate
} from './EnergyGateModal';

export type {
  EnergyGateResult
} from './EnergyGateModal';

export {
  WinLoseModal,
  registerWinLoseModal,
  getWinLoseModal,
  showGameResult
} from './WinLoseModal';

export type {
  GameResult,
  ResultAction,
  ResultData
} from './WinLoseModal';

export {
  PauseModal,
  registerPauseModal,
  getPauseModal,
  showPauseMenu
} from './PauseModal';

export type {
  PauseAction,
  AudioSettings
} from './PauseModal';

export {
  ExtraMovesModal,
  registerExtraMovesModal,
  getExtraMovesModal,
  checkAndShowExtraMoves
} from './ExtraMovesModal';

export type {
  ExtraMovesResult
} from './ExtraMovesModal';

// 页面视图
export { MainMenuView } from './MainMenuView';
export { LevelSelectView } from './LevelSelectView';
export { SettingsView } from './SettingsView';
