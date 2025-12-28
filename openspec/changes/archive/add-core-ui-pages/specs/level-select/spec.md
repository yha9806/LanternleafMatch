# Capability: Level Select

关卡选择页面，展示所有关卡并允许玩家选择进入。

## ADDED Requirements

### Requirement: Level Grid Display

系统 SHALL 以网格形式展示所有关卡。

#### Scenario: 显示 50 关卡
- **GIVEN** 关卡选择页面加载
- **WHEN** 页面渲染完成
- **THEN** 页面 SHALL 展示 50 个关卡按钮
- **AND** 布局 SHALL 为 10 行 × 5 列

#### Scenario: 关卡编号显示
- **GIVEN** 关卡按钮渲染
- **WHEN** 显示完成
- **THEN** 每个按钮 SHALL 显示对应关卡编号（1-50）
- **AND** 编号 SHALL 清晰可读

#### Scenario: 滚动浏览
- **GIVEN** 关卡网格超出屏幕高度
- **WHEN** 用户上下滑动
- **THEN** 列表 SHALL 支持垂直滚动
- **AND** 滚动 SHALL 流畅无卡顿

### Requirement: Level Unlock Status

系统 SHALL 正确显示每个关卡的解锁状态。

#### Scenario: 已解锁关卡显示
- **GIVEN** 玩家已通关第 N 关
- **WHEN** 关卡选择页面显示
- **THEN** 第 1 至 N+1 关 SHALL 显示为已解锁状态
- **AND** 解锁关卡 SHALL 可点击

#### Scenario: 锁定关卡显示
- **GIVEN** 玩家当前在第 N 关
- **WHEN** 关卡选择页面显示
- **THEN** 第 N+2 关及之后 SHALL 显示为锁定状态
- **AND** 锁定关卡 SHALL 显示锁图标
- **AND** 锁定关卡 SHALL 置灰显示

#### Scenario: 当前关卡高亮
- **GIVEN** 玩家当前进度为第 N 关
- **WHEN** 关卡选择页面显示
- **THEN** 第 N 关按钮 SHALL 有高亮边框或特殊标记
- **AND** 页面 SHALL 自动滚动到该关卡可见位置

### Requirement: Level Stars Display

系统 SHALL 显示每关的星级评价。

#### Scenario: 未通关显示
- **GIVEN** 某关卡未通关
- **WHEN** 关卡按钮显示
- **THEN** 按钮 SHALL 不显示星星或显示灰色空星

#### Scenario: 已通关星级显示
- **GIVEN** 玩家通关某关卡获得 2 星
- **WHEN** 关卡按钮显示
- **THEN** 按钮 SHALL 显示 2 个金色星星
- **AND** 剩余 1 个位置显示灰色空星

#### Scenario: 三星满分显示
- **GIVEN** 玩家某关卡获得 3 星
- **WHEN** 关卡按钮显示
- **THEN** 按钮 SHALL 显示 3 个金色星星
- **AND** 可添加特殊效果（如发光）

### Requirement: Level Selection Interaction

系统 SHALL 处理关卡选择交互。

#### Scenario: 点击已解锁关卡
- **GIVEN** 用户点击已解锁的关卡按钮
- **WHEN** 点击发生
- **THEN** 系统 SHALL 记录选择的关卡
- **AND** 跳转到游戏场景
- **AND** 游戏 SHALL 加载对应关卡

#### Scenario: 点击锁定关卡
- **GIVEN** 用户点击锁定的关卡按钮
- **WHEN** 点击发生
- **THEN** 系统 SHALL 显示提示"请先通关前面的关卡"
- **AND** 不跳转场景

#### Scenario: 返回主菜单
- **GIVEN** 用户在关卡选择页面
- **WHEN** 点击返回按钮
- **THEN** 系统 SHALL 返回主菜单页面

### Requirement: Level Select Header

关卡选择页面 SHALL 包含头部信息区。

#### Scenario: 显示总星数
- **GIVEN** 玩家累计获得 68 颗星
- **WHEN** 关卡选择页面显示
- **THEN** 头部 SHALL 显示"总星数: ⭐ 68/150"

#### Scenario: 显示当前进度
- **GIVEN** 玩家当前在第 27 关
- **WHEN** 关卡选择页面显示
- **THEN** 头部 SHALL 显示"进度: 27/50 关"
