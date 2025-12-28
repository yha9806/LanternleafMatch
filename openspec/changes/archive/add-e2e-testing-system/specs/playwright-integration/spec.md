# Capability: Playwright MCP Integration

Playwright MCP 工具集成，提供浏览器自动化能力。

## ADDED Requirements

### Requirement: MCP Browser Navigation

系统 SHALL 通过 Playwright MCP 实现页面导航。

#### Scenario: 打开本地文件
- **GIVEN** 本地 HTML 文件路径
- **WHEN** 调用导航功能
- **THEN** 浏览器 SHALL 打开该文件
- **AND** 支持 `file://` 协议

#### Scenario: 打开 HTTP URL
- **GIVEN** HTTP/HTTPS URL
- **WHEN** 调用导航功能
- **THEN** 浏览器 SHALL 导航到该 URL
- **AND** 等待页面加载完成

#### Scenario: 页面加载超时
- **GIVEN** 一个无法访问的 URL
- **WHEN** 尝试导航
- **THEN** 系统 SHALL 在超时后返回错误

### Requirement: MCP Screenshot Capture

系统 SHALL 通过 Playwright MCP 捕获页面截图。

#### Scenario: 全页面截图
- **GIVEN** 已打开的页面
- **WHEN** 请求截图
- **THEN** 系统 SHALL 捕获完整页面
- **AND** 截图 SHALL 保存为 PNG 格式

#### Scenario: 指定文件名截图
- **GIVEN** 已打开的页面
- **WHEN** 请求截图并指定文件名
- **THEN** 截图 SHALL 保存为指定文件名

#### Scenario: 元素截图
- **GIVEN** 已打开的页面和目标元素
- **WHEN** 请求元素截图
- **THEN** 系统 SHALL 仅捕获该元素区域

### Requirement: MCP Element Interaction

系统 SHALL 通过 Playwright MCP 与页面元素交互。

#### Scenario: 点击元素
- **GIVEN** 已打开的页面和可点击元素
- **WHEN** 调用点击功能
- **THEN** 元素 SHALL 被点击
- **AND** 触发相应事件

#### Scenario: 坐标点击
- **GIVEN** 已打开的页面
- **WHEN** 调用点击功能并提供坐标 (x, y)
- **THEN** 系统 SHALL 在该坐标点击

#### Scenario: 输入文本
- **GIVEN** 已打开的页面和输入框
- **WHEN** 调用输入功能
- **THEN** 文本 SHALL 输入到输入框

### Requirement: MCP Page Snapshot

系统 SHALL 通过 Playwright MCP 获取页面可访问性快照。

#### Scenario: 获取页面结构
- **GIVEN** 已打开的页面
- **WHEN** 请求 accessibility snapshot
- **THEN** 系统 SHALL 返回页面结构信息
- **AND** 包含元素层级和属性

#### Scenario: 定位元素引用
- **GIVEN** 页面快照
- **WHEN** 查找特定元素
- **THEN** 系统 SHALL 返回元素引用（ref）
- **AND** 可用于后续交互

### Requirement: MCP Error Handling

系统 SHALL 优雅处理 MCP 工具错误。

#### Scenario: 工具调用失败
- **GIVEN** MCP 工具调用
- **WHEN** 发生错误
- **THEN** 系统 SHALL 捕获错误
- **AND** 返回有意义的错误消息

#### Scenario: 重试机制
- **GIVEN** 可恢复的错误
- **WHEN** 首次调用失败
- **THEN** 系统 SHALL 自动重试（最多 3 次）
