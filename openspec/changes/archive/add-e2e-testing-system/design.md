# Design: E2E Testing System

## Context

### 背景
- 项目使用 Cocos Creator 3.8 开发三消游戏
- 现有测试仅覆盖核心逻辑（`src/core/__tests__/`）
- 有可用的 Playwright MCP 工具
- Demo 页面位于 `demo/index.html`

### 约束
- Cocos 游戏运行在 Canvas 上，DOM 元素有限
- MCP 工具通过 accessibility snapshot 获取页面信息
- 需要支持 `file://` 协议的本地文件

### 利益相关者
- 开发者：需要快速验证更改
- QA：需要可视化回归检测
- CI/CD：需要自动化测试

## Goals / Non-Goals

### Goals
- 建立 E2E 测试框架，验证完整游戏流程
- 实现截图对比，检测视觉回归
- 支持多页面批量审查
- 集成 Playwright MCP 工具

### Non-Goals
- 不替代现有单元测试
- 不实现完整的 CI/CD 管道（可选）
- 不测试平台特定功能（微信/抖音 SDK）

## Decisions

### 1. 测试执行方式

**决定**: 使用 Playwright MCP + TypeScript 脚本

**原因**:
- MCP 工具已可用，无需额外安装
- TypeScript 与项目一致
- 可直接在 Claude Code 会话中执行

**替代方案**:
- 原生 Playwright：需要独立安装和配置
- Cypress：学习成本高，与 MCP 不兼容

### 2. 页面对象模型

**决定**: 采用 Page Object Model (POM) 模式

**结构**:
```typescript
// e2e/pages/BasePage.ts
abstract class BasePage {
  abstract url: string;
  abstract waitForReady(): Promise<void>;
  abstract takeSnapshot(): Promise<string>;
}

// e2e/pages/DemoPage.ts
class DemoPage extends BasePage {
  url = 'file:///mnt/i/LanternleafMatch/demo/index.html';

  async waitForReady() {
    // 等待 Canvas 渲染完成
  }

  async clickTile(row: number, col: number) {
    // 点击棋盘格子
  }
}
```

**原因**: 提高测试可维护性，隔离页面变化

### 3. 截图存储策略

**决定**: 基准截图存储在 `e2e/snapshots/`，按测试名称组织

**结构**:
```
e2e/snapshots/
├── demo/
│   ├── initial-load.png
│   └── game-board.png
├── game-flow/
│   └── level-complete.png
└── .gitkeep
```

**原因**:
- 便于版本控制
- 支持对比审查
- 易于更新基准

### 4. 多页面审查机制

**决定**: 配置驱动的批量审查

**配置格式**:
```typescript
// e2e/review/pages.config.ts
export const REVIEW_PAGES = [
  {
    name: 'demo-initial',
    url: 'file:///mnt/i/LanternleafMatch/demo/index.html',
    viewport: { width: 1080, height: 1920 },
    waitFor: { time: 2 }  // 等待 2 秒
  },
  // 更多页面...
];
```

**输出**: HTML 报告，包含所有页面截图和状态

### 5. Canvas 元素交互

**决定**: 基于坐标的交互 + accessibility snapshot 辅助

**原因**:
- Canvas 内部元素无法通过 DOM 选择
- MCP 的 browser_click 支持坐标点击
- accessibility snapshot 可获取页面结构信息

**实现**:
```typescript
async clickTileAt(row: number, col: number) {
  // 计算棋盘坐标
  const x = BOARD_OFFSET_X + col * TILE_SIZE + TILE_SIZE / 2;
  const y = BOARD_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2;

  // 使用 MCP 点击
  await mcp.browser_click({ x, y });
}
```

## Risks / Trade-offs

### 风险 1: Canvas 渲染时序

**风险**: Canvas 内容可能未完全渲染就截图
**缓解**:
- 增加等待时间
- 检测特定 DOM 元素状态
- 多次重试机制

### 风险 2: 截图对比敏感度

**风险**: 字体渲染、反锯齿差异导致假阳性
**缓解**:
- 设置容差阈值
- 关注关键区域
- 人工审查机制

### 风险 3: MCP 工具限制

**风险**: MCP 工具可能不支持某些操作
**缓解**:
- 使用 browser_evaluate 执行 JS
- 降级到 browser_run_code
- 记录不支持的场景

## Migration Plan

### 阶段 1: 基础设施（1天）
1. 创建目录结构
2. 实现 MCP 封装
3. 创建基础页面对象

### 阶段 2: 测试用例（1天）
1. Demo 页面测试
2. 截图对比测试
3. 游戏流程测试

### 阶段 3: 多页面审查（0.5天）
1. 审查配置
2. 报告生成
3. 文档更新

### 回滚计划
- 删除 `e2e/` 目录
- 移除 package.json 脚本
- 无其他系统影响

## Open Questions

1. **是否需要 CI 集成？**
   - 当前建议：可选，后续按需添加

2. **截图对比阈值设置？**
   - 建议：5% 像素差异容忍度

3. **测试并行执行？**
   - 当前建议：顺序执行，避免资源冲突
