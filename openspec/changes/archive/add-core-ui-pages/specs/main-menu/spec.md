# Capability: Main Menu

主菜单页面，作为游戏入口，展示品牌和核心导航。

## ADDED Requirements

### Requirement: Main Menu Display

系统 SHALL 提供主菜单页面作为游戏入口。

#### Scenario: 显示游戏标题
- **GIVEN** 用户打开游戏
- **WHEN** 主菜单加载完成
- **THEN** 页面 SHALL 显示游戏标题"灯笼叶子消消乐"
- **AND** 标题 SHALL 使用品牌字体和颜色

#### Scenario: 显示玩家进度
- **GIVEN** 玩家有游戏进度
- **WHEN** 主菜单显示
- **THEN** 页面 SHALL 显示当前关卡编号
- **AND** 页面 SHALL 显示总获得星数

#### Scenario: 新玩家首次进入
- **GIVEN** 新玩家首次打开游戏
- **WHEN** 主菜单显示
- **THEN** 当前关卡 SHALL 显示为"第 1 关"
- **AND** 总星数 SHALL 显示为"0"

### Requirement: Main Menu Navigation

系统 SHALL 提供主菜单的导航功能。

#### Scenario: 开始游戏
- **GIVEN** 用户在主菜单
- **WHEN** 点击"开始游戏"按钮
- **THEN** 系统 SHALL 跳转到关卡选择页面

#### Scenario: 进入设置
- **GIVEN** 用户在主菜单
- **WHEN** 点击"设置"按钮
- **THEN** 系统 SHALL 打开设置页面

#### Scenario: 按钮点击反馈
- **GIVEN** 用户点击任意按钮
- **WHEN** 点击发生
- **THEN** 按钮 SHALL 播放点击音效
- **AND** 按钮 SHALL 显示点击视觉反馈

### Requirement: Energy Display on Main Menu

主菜单 SHALL 显示玩家当前体力状态。

#### Scenario: 体力已满
- **GIVEN** 玩家体力为 5/5
- **WHEN** 主菜单显示
- **THEN** 体力显示 SHALL 为"5/5 已满"
- **AND** 不显示回复倒计时

#### Scenario: 体力未满
- **GIVEN** 玩家体力为 3/5
- **WHEN** 主菜单显示
- **THEN** 体力显示 SHALL 为"3/5"
- **AND** 显示下一点回复倒计时

#### Scenario: 体力实时更新
- **GIVEN** 主菜单处于显示状态
- **WHEN** 体力回复计时完成
- **THEN** 体力数值 SHALL 实时更新
- **AND** 倒计时 SHALL 重置为下一点

### Requirement: Main Menu Visual Style

主菜单 SHALL 遵循吉卜力风格设计。

#### Scenario: 背景展示
- **GIVEN** 主菜单加载
- **WHEN** 页面渲染完成
- **THEN** 背景 SHALL 使用森林主题图
- **AND** 色调 SHALL 为低饱和度暖色

#### Scenario: 角色展示区
- **GIVEN** 主菜单显示
- **WHEN** 页面就绪
- **THEN** 页面 SHALL 显示猫狗角色（静态或简单动画）
- **AND** 角色风格 SHALL 与整体设计一致
