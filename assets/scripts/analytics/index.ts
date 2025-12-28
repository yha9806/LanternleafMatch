// ============================================
// 埋点模块导出
// ============================================

export {
  AnalyticsTracker,
  getAnalyticsTracker
} from './AnalyticsTracker';

// 重新导出核心模块类型
export {
  ANALYTICS_EVENTS,
  getAnalyticsManager,
  initAnalytics
} from '../../../src/core/Analytics';

export type {
  AnalyticsEvent,
  AnalyticsConfig,
  LevelStartData,
  LevelEndData,
  MoveData,
  AdWatchData
} from '../../../src/core/Analytics';
