# UI 页面系统

本文档介绍游戏的页面导航系统和各页面组件。

## 页面流程

```
[主菜单]
    │
    ├── 开始游戏 → [关卡选择] → 选择关卡 → [游戏场景]
    │                              │
    │                              └── 返回 → [主菜单]
    │
    └── 设置 → [设置页面] → 返回 → [主菜单]

[游戏场景]
    │
    ├── 暂停 → 返回主菜单 → [主菜单]
    │
    ├── 通关 → 下一关 → [游戏场景]
    │       └── 返回关卡选择 → [关卡选择]
    │
    └── 失败 → 重试 → [游戏场景]
            └── 返回 → [关卡选择]
```

## 场景名称

| 场景 | 名称 | 说明 |
|------|------|------|
| 主菜单 | `Menu` | 游戏入口 |
| 关卡选择 | `LevelSelect` | 50 关地图 |
| 游戏场景 | `Game` | 消除玩法 |
| 设置 | `Settings` | 游戏设置 |

## 核心组件

### SceneManager

场景管理器，负责场景切换和过渡动画。

```typescript
import { sceneManager, SceneName, TransitionType } from './core';

// 切换场景
await sceneManager.loadScene(SceneName.Menu);

// 带过渡动画
await sceneManager.loadScene(SceneName.Game, {
  transition: TransitionType.FadeScale,
  duration: 0.3,
  data: { level: 5 },
});

// 预加载
await sceneManager.preloadScene(SceneName.Game);

// 传递数据
SceneManager.setSceneData('level', 10);
const level = SceneManager.getSceneData<number>('level');
```

### PlayerProgress

玩家进度管理，持久化存储。

```typescript
import { playerProgress, MAX_LEVEL } from './core';

// 初始化（应用启动时调用一次）
await playerProgress.init();

// 读取数据
const currentLevel = playerProgress.currentLevel;
const totalStars = playerProgress.totalStars;
const stars = playerProgress.getLevelStars(5);
const unlocked = playerProgress.isLevelUnlocked(10);

// 完成关卡
playerProgress.completeLevel(5, 3); // 第 5 关，3 星

// 监听变化
playerProgress.addListener((data) => {
  console.log('进度更新:', data);
});

// 重置
playerProgress.reset();
```

### SettingsManager

设置管理，实时生效。

```typescript
import { settingsManager } from './core';

// 初始化
await settingsManager.init();

// 读取
const bgmVolume = settingsManager.bgmVolume;
const sfxVolume = settingsManager.sfxVolume;
const vibration = settingsManager.vibration;

// 设置
settingsManager.setBgmVolume(0.5);
settingsManager.setSfxVolume(1.0);
settingsManager.setVibration(true);

// 监听变化
settingsManager.addChangeListener((event) => {
  console.log(`${event.key}: ${event.oldValue} → ${event.newValue}`);
});

// 重置为默认
settingsManager.resetToDefault();
```

### GameState

全局状态管理，整合各子系统。

```typescript
import { gameState } from './core';

// 初始化（启动时调用）
await gameState.init();

// 访问子系统
const progress = gameState.progress;
const settings = gameState.settings;
const scene = gameState.scene;

// 便捷方法
await gameState.startGame(5);       // 开始第 5 关
await gameState.goToMainMenu();     // 返回主菜单
await gameState.goToLevelSelect();  // 关卡选择
await gameState.goToSettings();     // 打开设置

// 运行时状态
const state = gameState.getRuntimeState();
console.log(state.selectedLevel, state.isInGame, state.isPaused);
```

## 页面视图组件

### MainMenuView

主菜单页面，显示标题、进度、按钮。

**属性绑定:**
- `titleLabel: Label` - 游戏标题
- `currentLevelLabel: Label` - 当前关卡
- `totalStarsLabel: Label` - 总星数
- `startButton: Button` - 开始游戏
- `settingsButton: Button` - 设置
- `energyLabel: Label` - 体力显示
- `characterNode: Node` - 角色展示区

### LevelSelectView

关卡选择页面，50 关网格。

**属性绑定:**
- `titleLabel: Label` - 标题
- `progressLabel: Label` - 进度信息
- `totalStarsLabel: Label` - 总星数
- `backButton: Button` - 返回
- `scrollView: ScrollView` - 滚动容器
- `levelGridContainer: Node` - 关卡网格
- `levelButtonPrefab: Prefab` - 关卡按钮预制体

**关卡按钮预制体结构:**
```
LevelButton
├── LevelLabel (Label) - 关卡编号
├── StarsLabel (Label) - 星级显示
└── LockIcon (Node) - 锁图标
```

### SettingsView

设置页面，音量和开关。

**属性绑定:**
- `titleLabel: Label` - 标题
- `backButton: Button` - 返回
- `bgmSlider: Slider` - BGM 滑块
- `bgmValueLabel: Label` - BGM 数值
- `sfxSlider: Slider` - SFX 滑块
- `sfxValueLabel: Label` - SFX 数值
- `vibrationToggle: Toggle` - 震动开关
- `resetButton: Button` - 重置按钮
- `confirmModal: Node` - 确认弹窗

## 数据结构

### PlayerProgressData

```typescript
interface PlayerProgressData {
  currentLevel: number;                    // 当前关卡 (1-50)
  levelStars: Record<number, number>;      // 每关星数
  totalStars: number;                      // 总星数
  completedLevels: number;                 // 已通关数
  lastPlayTime: number;                    // 上次游戏时间
  version: number;                         // 数据版本
}
```

### SettingsData

```typescript
interface SettingsData {
  bgmVolume: number;      // 0-1
  sfxVolume: number;      // 0-1
  vibration: boolean;
  language: string;
  version: number;
}
```

## 存储键

| 键 | 说明 |
|-----|------|
| `lanternleaf_player_progress` | 玩家进度 |
| `lanternleaf_settings` | 游戏设置 |

## 相关文件

```
assets/scripts/
├── core/
│   ├── SceneManager.ts      # 场景管理
│   ├── PlayerProgress.ts    # 进度管理
│   ├── SettingsManager.ts   # 设置管理
│   └── GameState.ts         # 全局状态
└── ui/
    ├── MainMenuView.ts      # 主菜单
    ├── LevelSelectView.ts   # 关卡选择
    └── SettingsView.ts      # 设置页面
```
