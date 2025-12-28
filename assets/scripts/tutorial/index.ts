// ============================================
// 新手引导模块导出
// ============================================

export {
  TutorialManager,
  getTutorialManager,
  checkAndStartTutorial
} from './TutorialManager';

export type {
  TutorialAction,
  TutorialEvent
} from './TutorialManager';

export {
  TutorialOverlay
} from './TutorialOverlay';

export type {
  TutorialContext
} from './TutorialOverlay';

export {
  getTutorialForLevel,
  LEVEL_TUTORIALS,
  LEVEL_1_TUTORIAL,
  LEVEL_2_TUTORIAL,
  LEVEL_3_TUTORIAL,
  LEVEL_5_TUTORIAL,
  LEVEL_8_TUTORIAL
} from './TutorialStep';

export type {
  TutorialStepType,
  TutorialStepDef,
  TutorialCompleteCondition,
  LevelTutorialConfig
} from './TutorialStep';
