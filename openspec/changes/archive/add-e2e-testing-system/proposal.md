# Change: Add End-to-End Testing System

## Why

当前项目仅有单元测试（核心逻辑测试在 `src/core/__tests__/`），缺乏：
1. **端到端测试** - 无法验证完整游戏流程
2. **可视化测试** - 无法检测 UI 渲染问题
3. **多页面审查** - 无法批量检查多个页面/场景状态
4. **Playwright 集成** - 未利用现有 MCP Playwright 工具进行自动化测试

## What Changes

### 新增能力

1. **E2E 测试框架**
   - 基于 Playwright MCP 的测试执行器
   - 游戏流程自动化测试（开始→游戏→结果）
   - 截图对比和视觉回归检测

2. **多页面审查系统**
   - 批量截图多个游戏状态/场景
   - 自动生成审查报告
   - 支持 A/B 版本对比

3. **测试配置**
   - `e2e/` 目录结构
   - 测试用例定义格式
   - CI/CD 集成配置

### 技术实现

- 使用 Playwright MCP 工具执行浏览器操作
- 测试脚本使用 TypeScript
- 截图存储和对比机制

## Impact

### Affected Specs
- 新增: `e2e-testing` - E2E 测试规范
- 新增: `playwright-integration` - Playwright 集成规范
- 新增: `multi-page-review` - 多页面审查规范

### Affected Code
- `e2e/` - 新增测试目录
- `e2e/tests/` - 测试用例
- `e2e/pages/` - 页面定义
- `e2e/utils/` - 测试工具
- `package.json` - 新增测试脚本

### Dependencies
- Playwright MCP (已可用)
- vitest (已安装)
