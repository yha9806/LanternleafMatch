# E2E 测试指南

本文档介绍如何使用端到端测试系统验证游戏功能。

## 概述

E2E 测试系统基于 Playwright MCP 工具，支持：
- 自动化页面交互测试
- 截图对比（视觉回归检测）
- 多页面批量审查
- HTML 报告生成

## 目录结构

```
e2e/
├── config.ts            # 测试配置
├── runner.ts            # 测试运行器
├── pages/               # 页面对象模型
│   ├── BasePage.ts          # 基类
│   ├── DemoPage.ts          # Demo 页面
│   └── index.ts
├── tests/               # 测试用例
│   ├── demo.test.ts         # Demo 页面测试
│   └── index.ts
├── utils/               # 工具函数
│   ├── playwright-mcp.ts    # MCP 封装
│   └── index.ts
├── review/              # 多页面审查
│   ├── pages.config.ts      # 审查页面配置
│   └── generate-report.ts   # 报告生成器
├── snapshots/           # 截图基准
│   └── .gitkeep
└── reports/             # 测试报告
    ├── screenshots/         # 当前截图
    ├── baseline/            # 基准截图
    └── review-report.html   # 审查报告
```

## 快速开始

### 1. 运行 E2E 测试

```bash
npm run test:e2e
```

这会输出测试执行指令。在 Claude Code 会话中，按照指令依次执行 MCP 命令。

### 2. 更新截图基准

```bash
npm run test:e2e:update
```

### 3. 多页面审查

```bash
npm run test:review
```

### 4. 设置审查基准

```bash
npm run test:review:baseline
```

## 测试用例

### Demo 页面测试

位于 `e2e/tests/demo.test.ts`，包含：

1. **demo-page-load**: 验证页面加载
2. **demo-board-render**: 验证棋盘渲染
3. **demo-tile-click**: 验证格子点击
4. **demo-match-test**: 验证消除功能
5. **demo-responsive**: 验证响应式布局

### 添加新测试

```typescript
// e2e/tests/my-feature.test.ts
import { DemoPage } from '../pages';
import type { TestDefinition } from './demo.test';

export const MyFeatureTest: TestDefinition = {
  name: 'my-feature-test',
  description: '测试某个功能',
  steps: [
    {
      action: 'navigate',
      description: '打开页面',
      params: { url: 'file:///path/to/page.html' },
    },
    {
      action: 'wait',
      description: '等待加载',
      params: { time: 2 },
    },
    {
      action: 'screenshot',
      description: '截图',
      params: { filename: 'my-feature.png' },
    },
  ],
};
```

## 页面对象模型

### BasePage

所有页面对象的基类，定义通用接口：

```typescript
abstract class BasePage {
  abstract readonly url: string;
  abstract readonly name: string;
  abstract waitForReady(): WaitConfig;
  abstract getKeyElements(): ElementLocator[];
  abstract validateState(): { valid: boolean; errors: string[] };
}
```

### DemoPage

Demo 页面对象，封装游戏交互：

```typescript
const page = new DemoPage();

// 获取格子中心坐标
const { x, y } = page.clickTile(2, 3);

// 交换两个格子
const swap = page.swapTiles(
  { row: 2, col: 2 },
  { row: 2, col: 3 }
);
```

## 多页面审查

### 配置审查页面

编辑 `e2e/review/pages.config.ts`：

```typescript
export const REVIEW_PAGES: PageConfig[] = [
  {
    name: 'demo-initial',
    url: 'file:///path/to/demo/index.html',
    viewport: { width: 1080, height: 1920 },
    waitFor: { time: 3 },
    description: 'Demo 页面初始状态',
  },
  // 添加更多页面...
];
```

### 生成报告

```bash
# 运行审查
npm run test:review

# 报告位置
e2e/reports/review-report.html
```

## MCP 命令参考

### 导航

```
browser_navigate({ url: "file:///path/to/page.html" })
```

### 调整视口

```
browser_resize({ width: 1080, height: 1920 })
```

### 等待

```
browser_wait_for({ time: 2 })
```

### 截图

```
browser_take_screenshot({ filename: "screenshot.png" })
browser_take_screenshot({ filename: "full.png", fullPage: true })
```

### 页面快照

```
browser_snapshot({})
```

### 点击

```
browser_click({ element: "Button", ref: "ref-id" })
```

### 执行 JavaScript

```
browser_evaluate({ function: "() => document.title" })
```

## 棋盘坐标计算

棋盘布局常量（定义在 `e2e/config.ts`）：

```typescript
const BOARD_LAYOUT = {
  offsetX: 90,      // 棋盘左上角 X
  offsetY: 1100,    // 棋盘左上角 Y
  tileSize: 150,    // 格子尺寸
  rows: 6,
  cols: 6,
};
```

计算格子中心：

```typescript
function getTileCenter(row: number, col: number) {
  return {
    x: 90 + col * 150 + 75,
    y: 1100 + row * 150 + 75,
  };
}
```

## 最佳实践

1. **等待充足时间**：Canvas 渲染需要时间，建议至少等待 2-3 秒
2. **使用有意义的截图名**：便于识别和对比
3. **定期更新基准**：视觉变更后及时更新
4. **检查控制台错误**：使用 `browser_console_messages` 获取错误
5. **分步验证**：复杂操作分解为多个步骤，便于定位问题

## 故障排除

### 截图空白

- 确保 Canvas 已完成渲染
- 增加等待时间
- 检查 URL 是否正确

### 点击无效

- 验证坐标计算正确
- 检查元素是否可交互
- 使用 `browser_snapshot` 确认页面状态

### 页面无法加载

- 确认 `file://` 协议支持
- 检查文件路径是否正确
- 验证 HTML 文件存在

## 相关文档

- [Playwright MCP 文档](https://github.com/anthropics/claude-code)
- [CLAUDE.md](../CLAUDE.md) - 项目开发指南
