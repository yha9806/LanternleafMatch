/**
 * Demo 页面 E2E 测试
 *
 * 测试 Demo 页面的加载、渲染和基本交互。
 *
 * 注意：这些测试通过 Playwright MCP 工具执行，
 * 需要在 Claude Code 会话中运行。
 */

import { DemoPage } from '../pages';
import { config } from '../config';
import { TestHelpers, Assertions } from '../utils/playwright-mcp';

/**
 * 测试定义接口
 */
export interface TestDefinition {
  name: string;
  description: string;
  steps: TestStep[];
}

/**
 * 测试步骤
 */
export interface TestStep {
  action: string;
  description: string;
  params?: Record<string, unknown>;
  assertions?: Array<{
    type: 'snapshot' | 'screenshot' | 'evaluate';
    expected?: unknown;
  }>;
}

/**
 * Demo 页面测试套件
 */
export const DemoTestSuite = {
  name: 'Demo 页面测试',

  tests: [
    // 测试 1: 页面加载
    {
      name: 'demo-page-load',
      description: '验证 Demo 页面成功加载',
      steps: [
        {
          action: 'resize',
          description: '设置视口尺寸',
          params: { width: 1080, height: 1920 },
        },
        {
          action: 'navigate',
          description: '打开 Demo 页面',
          params: { url: config.demoPath },
        },
        {
          action: 'wait',
          description: '等待页面渲染',
          params: { time: 3 },
        },
        {
          action: 'snapshot',
          description: '获取页面快照',
          assertions: [
            { type: 'snapshot', expected: 'page-loaded' },
          ],
        },
        {
          action: 'screenshot',
          description: '截图验证',
          params: { filename: 'demo-initial.png' },
        },
      ],
    } as TestDefinition,

    // 测试 2: 棋盘渲染
    {
      name: 'demo-board-render',
      description: '验证游戏棋盘正确渲染',
      steps: [
        {
          action: 'navigate',
          description: '打开 Demo 页面',
          params: { url: config.demoPath },
        },
        {
          action: 'wait',
          description: '等待棋盘渲染',
          params: { time: 3 },
        },
        {
          action: 'evaluate',
          description: '检查 Canvas 存在',
          params: {
            function: '() => document.querySelector("canvas") !== null',
          },
          assertions: [
            { type: 'evaluate', expected: true },
          ],
        },
        {
          action: 'screenshot',
          description: '棋盘截图',
          params: { filename: 'demo-board.png', fullPage: true },
        },
      ],
    } as TestDefinition,

    // 测试 3: 格子点击
    {
      name: 'demo-tile-click',
      description: '验证格子点击交互',
      steps: [
        {
          action: 'navigate',
          description: '打开 Demo 页面',
          params: { url: config.demoPath },
        },
        {
          action: 'wait',
          description: '等待页面就绪',
          params: { time: 3 },
        },
        {
          action: 'click-tile',
          description: '点击中心格子 (2, 2)',
          params: { row: 2, col: 2 },
        },
        {
          action: 'wait',
          description: '等待选中效果',
          params: { time: 0.5 },
        },
        {
          action: 'screenshot',
          description: '选中状态截图',
          params: { filename: 'demo-tile-selected.png' },
        },
      ],
    } as TestDefinition,

    // 测试 4: 消除测试
    {
      name: 'demo-match-test',
      description: '测试格子交换和消除',
      steps: [
        {
          action: 'navigate',
          description: '打开 Demo 页面',
          params: { url: config.demoPath },
        },
        {
          action: 'wait',
          description: '等待页面就绪',
          params: { time: 3 },
        },
        {
          action: 'screenshot',
          description: '交换前截图',
          params: { filename: 'demo-before-swap.png' },
        },
        {
          action: 'swap-tiles',
          description: '尝试交换相邻格子',
          params: {
            from: { row: 2, col: 2 },
            to: { row: 2, col: 3 },
          },
        },
        {
          action: 'wait',
          description: '等待消除动画',
          params: { time: 2 },
        },
        {
          action: 'screenshot',
          description: '交换后截图',
          params: { filename: 'demo-after-swap.png' },
        },
      ],
    } as TestDefinition,

    // 测试 5: 多视口测试
    {
      name: 'demo-responsive',
      description: '测试不同视口尺寸',
      steps: [
        // 移动端竖屏
        {
          action: 'resize',
          description: '设置移动端视口',
          params: { width: 375, height: 812 },
        },
        {
          action: 'navigate',
          description: '打开 Demo 页面',
          params: { url: config.demoPath },
        },
        {
          action: 'wait',
          description: '等待渲染',
          params: { time: 3 },
        },
        {
          action: 'screenshot',
          description: '移动端截图',
          params: { filename: 'demo-mobile.png' },
        },
        // 平板视口
        {
          action: 'resize',
          description: '设置平板视口',
          params: { width: 768, height: 1024 },
        },
        {
          action: 'navigate',
          description: '刷新页面',
          params: { url: config.demoPath },
        },
        {
          action: 'wait',
          description: '等待渲染',
          params: { time: 3 },
        },
        {
          action: 'screenshot',
          description: '平板截图',
          params: { filename: 'demo-tablet.png' },
        },
      ],
    } as TestDefinition,
  ],
};

/**
 * 获取测试用的 DemoPage 实例
 */
export function getDemoPage(): DemoPage {
  return new DemoPage();
}

/**
 * 生成测试执行指令
 *
 * 返回 MCP 命令序列，供 Claude Code 执行
 */
export function generateTestInstructions(test: TestDefinition): string[] {
  const instructions: string[] = [];
  const page = getDemoPage();

  instructions.push(`## 测试: ${test.name}`);
  instructions.push(`描述: ${test.description}`);
  instructions.push('');

  for (let i = 0; i < test.steps.length; i++) {
    const step = test.steps[i];
    instructions.push(`### 步骤 ${i + 1}: ${step.description}`);

    switch (step.action) {
      case 'navigate':
        instructions.push(`执行: browser_navigate({ url: "${step.params?.url}" })`);
        break;
      case 'resize':
        instructions.push(`执行: browser_resize({ width: ${step.params?.width}, height: ${step.params?.height} })`);
        break;
      case 'wait':
        instructions.push(`执行: browser_wait_for({ time: ${step.params?.time} })`);
        break;
      case 'snapshot':
        instructions.push(`执行: browser_snapshot({})`);
        break;
      case 'screenshot':
        instructions.push(`执行: browser_take_screenshot({ filename: "${step.params?.filename}" })`);
        break;
      case 'click-tile': {
        const coords = page.clickTile(
          step.params?.row as number,
          step.params?.col as number
        );
        instructions.push(`执行: browser_click 在坐标 (${coords.x}, ${coords.y})`);
        break;
      }
      case 'swap-tiles': {
        const from = step.params?.from as { row: number; col: number };
        const to = step.params?.to as { row: number; col: number };
        const swap = page.swapTiles(from, to);
        instructions.push(`执行: 先点击 (${swap.from.x}, ${swap.from.y})，再点击 (${swap.to.x}, ${swap.to.y})`);
        break;
      }
      case 'evaluate':
        instructions.push(`执行: browser_evaluate({ function: "${step.params?.function}" })`);
        break;
    }
    instructions.push('');
  }

  return instructions;
}

export default DemoTestSuite;
