/**
 * E2E Testing Configuration
 * 端到端测试配置文件
 */

export interface ViewportConfig {
  width: number;
  height: number;
}

export interface WaitConfig {
  time?: number;        // 等待秒数
  selector?: string;    // 等待元素出现
  text?: string;        // 等待文本出现
}

export interface PageConfig {
  name: string;
  url: string;
  viewport: ViewportConfig;
  waitFor: WaitConfig;
  description?: string;
}

export interface E2EConfig {
  /** 项目根目录 */
  projectRoot: string;

  /** Demo 页面路径 */
  demoPath: string;

  /** 截图存储目录 */
  snapshotsDir: string;

  /** 报告输出目录 */
  reportsDir: string;

  /** 基准截图目录 */
  baselineDir: string;

  /** 默认视口尺寸 */
  defaultViewport: ViewportConfig;

  /** 默认超时时间（毫秒） */
  defaultTimeout: number;

  /** 截图对比阈值（0-1，像素差异容忍度） */
  diffThreshold: number;

  /** 最大重试次数 */
  maxRetries: number;

  /** 重试间隔（毫秒） */
  retryDelay: number;
}

// 项目根目录
const PROJECT_ROOT = '/mnt/i/LanternleafMatch';

/**
 * E2E 测试配置
 */
export const config: E2EConfig = {
  projectRoot: PROJECT_ROOT,
  demoPath: `file://${PROJECT_ROOT}/demo/index.html`,
  snapshotsDir: `${PROJECT_ROOT}/e2e/snapshots`,
  reportsDir: `${PROJECT_ROOT}/e2e/reports`,
  baselineDir: `${PROJECT_ROOT}/e2e/reports/baseline`,

  defaultViewport: {
    width: 1080,
    height: 1920,
  },

  defaultTimeout: 30000,
  diffThreshold: 0.05,  // 5% 像素差异容忍度
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * 棋盘布局常量（用于坐标点击）
 */
export const BOARD_LAYOUT = {
  /** 棋盘左上角 X 偏移 */
  offsetX: 90,

  /** 棋盘左上角 Y 偏移（从游戏区顶部算起） */
  offsetY: 1100,

  /** 格子尺寸 */
  tileSize: 150,

  /** 棋盘行列数 */
  rows: 6,
  cols: 6,
};

/**
 * 计算棋盘格子中心坐标
 */
export function getTileCenter(row: number, col: number): { x: number; y: number } {
  const x = BOARD_LAYOUT.offsetX + col * BOARD_LAYOUT.tileSize + BOARD_LAYOUT.tileSize / 2;
  const y = BOARD_LAYOUT.offsetY + row * BOARD_LAYOUT.tileSize + BOARD_LAYOUT.tileSize / 2;
  return { x, y };
}

/**
 * 审查页面配置
 */
export const REVIEW_PAGES: PageConfig[] = [
  {
    name: 'demo-initial',
    url: `file://${PROJECT_ROOT}/demo/index.html`,
    viewport: { width: 1080, height: 1920 },
    waitFor: { time: 2 },
    description: 'Demo 页面初始状态',
  },
  {
    name: 'demo-mobile-portrait',
    url: `file://${PROJECT_ROOT}/demo/index.html`,
    viewport: { width: 375, height: 812 },
    waitFor: { time: 2 },
    description: 'Demo 页面移动端竖屏',
  },
  {
    name: 'demo-tablet',
    url: `file://${PROJECT_ROOT}/demo/index.html`,
    viewport: { width: 768, height: 1024 },
    waitFor: { time: 2 },
    description: 'Demo 页面平板视图',
  },
];

export default config;
