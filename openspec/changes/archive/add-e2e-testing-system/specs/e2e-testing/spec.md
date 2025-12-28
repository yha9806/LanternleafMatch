# Capability: E2E Testing

端到端测试能力，验证完整游戏流程和用户交互。

## ADDED Requirements

### Requirement: E2E Test Framework

系统 SHALL 提供端到端测试框架，支持自动化验证游戏功能。

#### Scenario: Demo 页面加载测试
- **GIVEN** Demo 页面 URL `demo/index.html`
- **WHEN** 测试执行器打开该页面
- **THEN** 页面 SHALL 成功加载
- **AND** 游戏棋盘 SHALL 可见

#### Scenario: 测试超时处理
- **GIVEN** 一个测试用例执行中
- **WHEN** 执行时间超过配置的超时时间
- **THEN** 测试 SHALL 标记为失败
- **AND** 错误信息 SHALL 包含超时原因

### Requirement: Test Case Definition

测试用例 SHALL 使用 TypeScript 定义，遵循统一格式。

#### Scenario: 测试文件结构
- **GIVEN** 测试目录 `e2e/tests/`
- **WHEN** 开发者创建新测试
- **THEN** 测试文件 SHALL 以 `.test.ts` 结尾
- **AND** 测试 SHALL 使用 `describe/it` 结构

#### Scenario: 测试断言
- **GIVEN** 一个测试用例
- **WHEN** 验证页面状态
- **THEN** 系统 SHALL 支持 `expect` 断言
- **AND** 支持截图对比断言

### Requirement: Visual Regression Testing

系统 SHALL 支持截图对比，检测视觉回归。

#### Scenario: 截图基准创建
- **GIVEN** 首次运行截图测试
- **WHEN** 基准截图不存在
- **THEN** 系统 SHALL 创建新基准截图
- **AND** 截图 SHALL 存储在 `e2e/snapshots/` 目录

#### Scenario: 截图对比通过
- **GIVEN** 已有基准截图
- **WHEN** 当前截图与基准匹配（差异 < 5%）
- **THEN** 测试 SHALL 通过

#### Scenario: 截图对比失败
- **GIVEN** 已有基准截图
- **WHEN** 当前截图与基准差异 >= 5%
- **THEN** 测试 SHALL 失败
- **AND** 差异图 SHALL 生成并保存

### Requirement: Test Execution Scripts

系统 SHALL 提供 npm 脚本执行测试。

#### Scenario: 运行 E2E 测试
- **GIVEN** 开发者在项目根目录
- **WHEN** 执行 `npm run test:e2e`
- **THEN** 所有 E2E 测试 SHALL 执行
- **AND** 结果 SHALL 输出到控制台

#### Scenario: 更新截图基准
- **GIVEN** 需要更新截图基准
- **WHEN** 执行 `npm run test:e2e:update`
- **THEN** 所有截图基准 SHALL 更新为当前状态
