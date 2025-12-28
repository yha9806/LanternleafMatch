/**
 * Playwright MCP 工具封装
 *
 * 这是一个类型定义和辅助函数文件，用于在 Claude Code 会话中
 * 使用 Playwright MCP 工具进行 E2E 测试。
 *
 * 实际的 MCP 调用由 Claude Code 直接执行。
 */

import { config, type ViewportConfig, type WaitConfig } from '../config';

/**
 * MCP 工具调用结果
 */
export interface MCPResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 截图选项
 */
export interface ScreenshotOptions {
  filename?: string;
  fullPage?: boolean;
  element?: string;
  ref?: string;
  type?: 'png' | 'jpeg';
}

/**
 * 点击选项
 */
export interface ClickOptions {
  element: string;
  ref: string;
  button?: 'left' | 'right' | 'middle';
  doubleClick?: boolean;
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[];
}

/**
 * 页面快照元素
 */
export interface SnapshotElement {
  role: string;
  name?: string;
  ref?: string;
  children?: SnapshotElement[];
}

/**
 * 测试结果
 */
export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  screenshot?: string;
}

/**
 * 测试套件结果
 */
export interface TestSuiteResult {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
  timestamp: string;
}

/**
 * MCP 命令生成器
 *
 * 生成用于 Claude Code 执行的 MCP 工具调用描述
 */
export const MCPCommands = {
  /**
   * 导航到 URL
   */
  navigate(url: string): string {
    return `mcp__plugin_playwright_playwright__browser_navigate({ url: "${url}" })`;
  },

  /**
   * 调整浏览器窗口大小
   */
  resize(viewport: ViewportConfig): string {
    return `mcp__plugin_playwright_playwright__browser_resize({ width: ${viewport.width}, height: ${viewport.height} })`;
  },

  /**
   * 截图
   */
  screenshot(options: ScreenshotOptions = {}): string {
    const params: string[] = [];
    if (options.filename) params.push(`filename: "${options.filename}"`);
    if (options.fullPage) params.push(`fullPage: true`);
    if (options.type) params.push(`type: "${options.type}"`);
    if (options.element && options.ref) {
      params.push(`element: "${options.element}"`);
      params.push(`ref: "${options.ref}"`);
    }
    return `mcp__plugin_playwright_playwright__browser_take_screenshot({ ${params.join(', ')} })`;
  },

  /**
   * 获取页面快照
   */
  snapshot(filename?: string): string {
    if (filename) {
      return `mcp__plugin_playwright_playwright__browser_snapshot({ filename: "${filename}" })`;
    }
    return `mcp__plugin_playwright_playwright__browser_snapshot({})`;
  },

  /**
   * 点击元素
   */
  click(options: ClickOptions): string {
    const params = [`element: "${options.element}"`, `ref: "${options.ref}"`];
    if (options.button) params.push(`button: "${options.button}"`);
    if (options.doubleClick) params.push(`doubleClick: true`);
    return `mcp__plugin_playwright_playwright__browser_click({ ${params.join(', ')} })`;
  },

  /**
   * 等待
   */
  waitFor(wait: WaitConfig): string {
    const params: string[] = [];
    if (wait.time) params.push(`time: ${wait.time}`);
    if (wait.text) params.push(`text: "${wait.text}"`);
    return `mcp__plugin_playwright_playwright__browser_wait_for({ ${params.join(', ')} })`;
  },

  /**
   * 执行 JavaScript
   */
  evaluate(fn: string): string {
    return `mcp__plugin_playwright_playwright__browser_evaluate({ function: "${fn.replace(/"/g, '\\"')}" })`;
  },

  /**
   * 获取控制台消息
   */
  consoleMessages(level: 'error' | 'warning' | 'info' | 'debug' = 'info'): string {
    return `mcp__plugin_playwright_playwright__browser_console_messages({ level: "${level}" })`;
  },

  /**
   * 关闭浏览器
   */
  close(): string {
    return `mcp__plugin_playwright_playwright__browser_close({})`;
  },
};

/**
 * 测试辅助函数
 */
export const TestHelpers = {
  /**
   * 生成截图文件名
   */
  screenshotName(testName: string, suffix?: string): string {
    const safeName = testName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return suffix
      ? `${safeName}_${suffix}_${timestamp}.png`
      : `${safeName}_${timestamp}.png`;
  },

  /**
   * 生成基准截图路径
   */
  baselinePath(name: string): string {
    return `${config.snapshotsDir}/${name}.png`;
  },

  /**
   * 生成当前截图路径
   */
  currentPath(name: string): string {
    return `${config.reportsDir}/screenshots/${name}.png`;
  },

  /**
   * 生成差异截图路径
   */
  diffPath(name: string): string {
    return `${config.reportsDir}/diffs/${name}_diff.png`;
  },

  /**
   * 格式化测试结果
   */
  formatResults(suite: TestSuiteResult): string {
    const lines: string[] = [
      `\n${'='.repeat(60)}`,
      `测试套件: ${suite.name}`,
      `时间: ${suite.timestamp}`,
      `耗时: ${suite.duration}ms`,
      `${'='.repeat(60)}`,
      '',
    ];

    for (const test of suite.tests) {
      const status = test.passed ? '✓' : '✗';
      const color = test.passed ? '\x1b[32m' : '\x1b[31m';
      lines.push(`${color}${status}\x1b[0m ${test.name} (${test.duration}ms)`);
      if (test.error) {
        lines.push(`  错误: ${test.error}`);
      }
    }

    lines.push('');
    lines.push(`通过: ${suite.passed} / ${suite.tests.length}`);
    lines.push(`失败: ${suite.failed}`);
    lines.push(`${'='.repeat(60)}\n`);

    return lines.join('\n');
  },
};

/**
 * 断言辅助函数
 */
export const Assertions = {
  /**
   * 断言条件为真
   */
  assertTrue(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`断言失败: ${message}`);
    }
  },

  /**
   * 断言值相等
   */
  assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
      throw new Error(`断言失败: ${message}\n  期望: ${expected}\n  实际: ${actual}`);
    }
  },

  /**
   * 断言包含文本
   */
  assertContains(text: string, substring: string, message: string): void {
    if (!text.includes(substring)) {
      throw new Error(`断言失败: ${message}\n  文本不包含: ${substring}`);
    }
  },

  /**
   * 断言元素存在于快照中
   */
  assertElementExists(snapshot: SnapshotElement[], selector: { role?: string; name?: string }, message: string): void {
    const found = findElement(snapshot, selector);
    if (!found) {
      throw new Error(`断言失败: ${message}\n  未找到元素: ${JSON.stringify(selector)}`);
    }
  },
};

/**
 * 在快照中查找元素
 */
function findElement(
  elements: SnapshotElement[],
  selector: { role?: string; name?: string }
): SnapshotElement | null {
  for (const el of elements) {
    if (
      (!selector.role || el.role === selector.role) &&
      (!selector.name || el.name?.includes(selector.name))
    ) {
      return el;
    }
    if (el.children) {
      const found = findElement(el.children, selector);
      if (found) return found;
    }
  }
  return null;
}

export default {
  MCPCommands,
  TestHelpers,
  Assertions,
};
