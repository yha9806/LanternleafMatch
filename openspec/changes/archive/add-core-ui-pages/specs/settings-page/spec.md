# Capability: Settings Page

设置页面，允许玩家调整游戏配置。

## ADDED Requirements

### Requirement: Audio Settings

系统 SHALL 提供音频设置选项。

#### Scenario: 背景音乐音量调节
- **GIVEN** 用户在设置页面
- **WHEN** 拖动背景音乐滑块到 50%
- **THEN** 背景音乐音量 SHALL 调整为 50%
- **AND** 音量变化 SHALL 实时生效

#### Scenario: 音效音量调节
- **GIVEN** 用户在设置页面
- **WHEN** 拖动音效滑块到 80%
- **THEN** 音效音量 SHALL 调整为 80%
- **AND** 播放测试音效验证

#### Scenario: 静音背景音乐
- **GIVEN** 用户在设置页面
- **WHEN** 将背景音乐滑块拖到 0%
- **THEN** 背景音乐 SHALL 静音
- **AND** 滑块显示 SHALL 更新为 0%

### Requirement: Vibration Settings

系统 SHALL 提供震动反馈设置。

#### Scenario: 开启震动
- **GIVEN** 震动开关为关闭状态
- **WHEN** 用户点击开关
- **THEN** 震动 SHALL 开启
- **AND** 开关 SHALL 显示为 ON 状态
- **AND** 设备 SHALL 产生一次震动反馈

#### Scenario: 关闭震动
- **GIVEN** 震动开关为开启状态
- **WHEN** 用户点击开关
- **THEN** 震动 SHALL 关闭
- **AND** 开关 SHALL 显示为 OFF 状态
- **AND** 游戏中不再触发震动

### Requirement: Settings Persistence

系统 SHALL 持久化保存设置。

#### Scenario: 保存设置
- **GIVEN** 用户修改了任何设置项
- **WHEN** 离开设置页面
- **THEN** 所有设置 SHALL 自动保存
- **AND** 不需要手动点击保存按钮

#### Scenario: 加载设置
- **GIVEN** 用户有保存的设置
- **WHEN** 重新打开游戏进入设置页面
- **THEN** 所有设置项 SHALL 显示上次保存的值

#### Scenario: 默认设置
- **GIVEN** 新玩家首次进入设置
- **WHEN** 设置页面加载
- **THEN** 背景音乐 SHALL 默认 80%
- **AND** 音效 SHALL 默认 100%
- **AND** 震动 SHALL 默认开启

### Requirement: Reset Progress

系统 SHALL 提供重置游戏进度功能。

#### Scenario: 显示重置按钮
- **GIVEN** 用户在设置页面
- **WHEN** 滚动到页面底部
- **THEN** SHALL 显示"重置游戏进度"按钮
- **AND** 按钮 SHALL 使用警告色（如红色）

#### Scenario: 重置确认
- **GIVEN** 用户点击重置按钮
- **WHEN** 点击发生
- **THEN** 系统 SHALL 显示确认弹窗
- **AND** 弹窗 SHALL 警告"此操作将清除所有进度，无法恢复"
- **AND** 提供"确认"和"取消"选项

#### Scenario: 执行重置
- **GIVEN** 确认弹窗显示
- **WHEN** 用户点击"确认"
- **THEN** 所有关卡进度 SHALL 清除
- **AND** 总星数 SHALL 重置为 0
- **AND** 当前关卡 SHALL 重置为 1
- **AND** 设置项 SHALL 保留不变

#### Scenario: 取消重置
- **GIVEN** 确认弹窗显示
- **WHEN** 用户点击"取消"
- **THEN** 弹窗 SHALL 关闭
- **AND** 进度 SHALL 保持不变

### Requirement: Settings Navigation

系统 SHALL 提供设置页面的导航功能。

#### Scenario: 返回上一页
- **GIVEN** 用户在设置页面
- **WHEN** 点击返回按钮或手机返回键
- **THEN** 系统 SHALL 返回主菜单
- **AND** 设置 SHALL 已保存

#### Scenario: 设置页面标题
- **GIVEN** 设置页面加载
- **WHEN** 页面渲染完成
- **THEN** 页面 SHALL 显示标题"设置"
- **AND** 标题栏 SHALL 包含返回按钮

### Requirement: Language Settings (Reserved)

系统 SHALL 预留语言设置入口。

#### Scenario: 语言选项显示
- **GIVEN** 用户在设置页面
- **WHEN** 查看语言选项
- **THEN** 选项 SHALL 显示当前语言"简体中文"
- **AND** 选项 SHALL 处于禁用状态
- **AND** 显示"即将推出"标签
