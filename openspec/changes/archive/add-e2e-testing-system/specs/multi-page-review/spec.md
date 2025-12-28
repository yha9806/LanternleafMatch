# Capability: Multi-Page Review

多页面审查能力，批量检查和对比多个页面状态。

## ADDED Requirements

### Requirement: Page Review Configuration

系统 SHALL 支持配置驱动的多页面审查。

#### Scenario: 定义审查页面列表
- **GIVEN** 审查配置文件 `e2e/review/pages.config.ts`
- **WHEN** 添加新页面配置
- **THEN** 配置 SHALL 包含：
  - `name`: 页面标识
  - `url`: 页面 URL
  - `viewport`: 视口尺寸
  - `waitFor`: 等待条件

#### Scenario: 视口尺寸配置
- **GIVEN** 审查配置
- **WHEN** 指定视口尺寸 `{ width: 1080, height: 1920 }`
- **THEN** 页面 SHALL 以该尺寸渲染
- **AND** 截图 SHALL 反映该尺寸

#### Scenario: 等待条件配置
- **GIVEN** 审查配置
- **WHEN** 指定等待时间 `{ time: 2 }`
- **THEN** 系统 SHALL 等待 2 秒后截图

### Requirement: Batch Page Capture

系统 SHALL 批量访问和截图多个页面。

#### Scenario: 执行多页面审查
- **GIVEN** 配置了多个页面
- **WHEN** 执行 `npm run test:review`
- **THEN** 系统 SHALL 依次访问每个页面
- **AND** 为每个页面生成截图

#### Scenario: 截图命名规则
- **GIVEN** 页面配置 `{ name: 'demo-initial' }`
- **WHEN** 生成截图
- **THEN** 截图文件名 SHALL 为 `demo-initial.png`
- **AND** 存储在 `e2e/reports/screenshots/` 目录

#### Scenario: 错误页面处理
- **GIVEN** 多页面审查执行中
- **WHEN** 某页面加载失败
- **THEN** 系统 SHALL 记录错误
- **AND** 继续处理下一个页面

### Requirement: Review Report Generation

系统 SHALL 生成可视化的审查报告。

#### Scenario: HTML 报告生成
- **GIVEN** 完成多页面审查
- **WHEN** 报告生成
- **THEN** 系统 SHALL 创建 `e2e/reports/review-report.html`
- **AND** 报告 SHALL 包含所有页面截图

#### Scenario: 报告内容
- **GIVEN** 审查报告
- **WHEN** 查看报告
- **THEN** 报告 SHALL 显示：
  - 页面名称
  - 截图预览
  - 页面 URL
  - 审查时间戳

#### Scenario: 报告截图对比视图
- **GIVEN** 当前和历史截图
- **WHEN** 查看报告
- **THEN** 报告 SHALL 支持并排对比

### Requirement: A/B Version Comparison

系统 SHALL 支持版本间对比审查。

#### Scenario: 基准版本设置
- **GIVEN** 需要设置对比基准
- **WHEN** 执行 `npm run test:review:baseline`
- **THEN** 当前截图 SHALL 设为基准
- **AND** 存储在 `e2e/reports/baseline/` 目录

#### Scenario: 版本对比
- **GIVEN** 已有基准版本
- **WHEN** 执行普通审查
- **THEN** 报告 SHALL 显示基准与当前对比
- **AND** 高亮差异区域

#### Scenario: 差异阈值
- **GIVEN** 版本对比
- **WHEN** 差异超过 5%
- **THEN** 该页面 SHALL 标记为"需审查"

### Requirement: Interactive Review

系统 SHALL 支持交互式审查。

#### Scenario: 问题标注
- **GIVEN** 审查报告中的截图
- **WHEN** 审查者标注问题区域
- **THEN** 标注 SHALL 保存
- **AND** 可导出为问题列表

#### Scenario: 审查状态追踪
- **GIVEN** 多个待审查页面
- **WHEN** 完成某页面审查
- **THEN** 状态 SHALL 更新为"已审查"
- **AND** 显示审查进度
