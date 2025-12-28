# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**灯笼叶子消消乐 (Lanternleaf Match)** - 一款竖屏休闲三消游戏，目标用户为英国/欧盟地区，以"清新治愈、吉卜力风格"为气质。

### 核心产品闭环
1. 进入关卡 → 消耗 1 点体力
2. 通关/失败 → 给轻量奖励
3. 体力耗尽 → 等待恢复 或 看激励视频广告（Rewarded Ad）补体力

### 技术约束
- 棋盘规格：6×6
- 仅使用激励视频广告（不做插屏）
- 需符合 UK/EU 广告合规（用户同意管理）

## 开发命令

### 核心逻辑测试
```bash
npm install          # 安装依赖
npm run test         # 运行测试
npm run test:watch   # 测试监听模式
npm run gen:level -- 17  # 生成并预览第 17 关
```

### E2E 测试（Playwright MCP）
```bash
npm run test:e2e            # 运行 E2E 测试
npm run test:e2e:update     # 更新截图基准
npm run test:review         # 多页面审查
npm run test:review:baseline # 设置审查基准
```

详细文档见 `docs/E2E_TESTING.md`

### Cocos Creator 开发
```bash
# 1. 用 Cocos Dashboard 打开项目根目录
# 2. 在编辑器中构建发布

# 微信小游戏发布
菜单: 项目 → 构建发布 → 微信小游戏 → 构建

# 抖音小游戏发布
菜单: 项目 → 构建发布 → 字节跳动小游戏 → 构建
```

## 代码架构

本项目采用 **Cocos Creator 3.8** 开发，核心逻辑与渲染层分离。

```
assets/                           # Cocos Creator 资源目录
├── prefabs/                      # 预制体
│   ├── Tile.prefab                   # 棋盘格子预制体
│   ├── Button.prefab                 # 通用按钮
│   └── Modal.prefab                  # 弹窗模板
├── scenes/                       # 场景文件
│   ├── Menu.scene                    # 主菜单场景
│   └── Game.scene                    # 游戏主场景
├── scripts/
│   ├── core/                     # 核心逻辑（纯 TypeScript，无引擎依赖）
│   │   ├── index.ts                  # 模块导出入口
│   │   ├── types.ts                  # 类型定义
│   │   ├── interfaces.ts             # 模块接口契约
│   │   ├── RNG.ts                    # 可复现随机数生成器
│   │   ├── MossGenerator.ts          # 苔藓位置生成
│   │   ├── MatchFinder.ts            # 消除检测
│   │   ├── MatchResolver.ts          # 消除执行 + 下落 + 填充
│   │   ├── LevelGenerator.ts         # 关卡生成
│   │   ├── GoalTracker.ts            # 目标进度追踪
│   │   ├── GameController.ts         # 游戏主控制器
│   │   ├── EnergyManager.ts          # 体力管理
│   │   ├── SceneManager.ts           # 场景管理器
│   │   ├── PlayerProgress.ts         # 玩家进度管理
│   │   ├── SettingsManager.ts        # 设置管理
│   │   └── GameState.ts              # 全局状态管理
│   ├── game/                     # Cocos 游戏组件
│   │   ├── BoardView.ts              # 棋盘渲染 + 触摸交换
│   │   └── GameManager.ts            # 游戏主管理器
│   ├── ui/                       # UI 组件
│   │   ├── HudView.ts                # 顶部 HUD
│   │   ├── ModalManager.ts           # 弹窗管理
│   │   ├── MainMenuView.ts           # 主菜单页面
│   │   ├── LevelSelectView.ts        # 关卡选择页面
│   │   └── SettingsView.ts           # 设置页面
│   └── platform/                 # 小程序平台适配
│       ├── index.ts                  # 平台模块导出
│       ├── types.ts                  # 平台接口定义
│       ├── PlatformBridge.ts         # Cocos 平台桥接（推荐使用）
│       ├── WeixinAdapter.ts          # 微信适配
│       └── DouyinAdapter.ts          # 抖音适配
└── resources/
    ├── configs/                  # 配置 JSON
    │   ├── levels.json               # 1-50 关参数表
    │   ├── patterns.json             # 8 个苔藓 pattern 的 BaseMask 坐标
    │   ├── energy.json               # 体力系统配置
    │   ├── design_tokens.json        # 色板、字体、布局比例
    │   └── copy_pool_zh.json         # 30 条中文故事旁白
    ├── textures/
    │   ├── tiles/                    # 棋盘格子贴图
    │   ├── ui/                       # UI 图标和面板
    │   └── bg_main_1080x1920.png     # 主背景
    └── audio/                    # 音频资源

settings/v2/packages/             # Cocos Creator 项目配置
├── project-settings.json         # 设计分辨率 1080×1920
├── engine.json                   # 引擎模块配置（2D）
├── scene.json                    # 起始场景配置
└── assets.json                   # Bundle 配置

profiles/v2/packages/             # 构建配置
└── build.json                    # 微信/抖音构建参数

Lanternleaf Match_ui_kit/         # UI 素材源（已复制到 resources）
```

### 关键模块职责

| 模块 | 职责 |
|------|------|
| `MatchFinder` | 检测消除、验证交换有效性、查找可行移动 |
| `MatchResolver` | 执行消除、处理苔藓、生成特殊块、下落填充、连消循环 |
| `MossGenerator` | 按 pattern+density 生成苔藓坐标 |
| `LevelGenerator` | 生成 LevelDef、创建可玩棋盘 |
| `GoalTracker` | 更新目标进度、判断胜利条件 |
| `GameController` | 游戏主循环、处理交换、协调各模块 |
| `EnergyManager` | 体力消耗/回充/广告奖励/频控 |
| `RNG` | 基于 seed 的可复现随机（Mulberry32）|

### 特殊块类型（匹配 UI Kit 素材）

| 类型 | 素材 | 生成条件 | 效果 |
|------|------|----------|------|
| `whirl_h` | tile_special_whirl_128.png | 水平 4 连 | 清除整行 |
| `whirl_v` | tile_special_whirl_128.png | 垂直 4 连 | 清除整列 |
| `lantern` | tile_special_lantern_128.png | 5 连 | 清除周围 3×3 |

## 小程序平台适配

### 目标平台
- **微信小游戏**: [开发文档](https://developers.weixin.qq.com/minigame/dev/guide/)
- **抖音小游戏**: [开发文档](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/introduction)

### 技术要求
| 项目 | 微信 | 抖音 |
|------|------|------|
| 语言 | JavaScript/TypeScript | JavaScript/TypeScript |
| 渲染 | Canvas 2D / WebGL | Canvas 2D / WebGL |
| API 兼容性 | — | 与微信基本兼容 |
| 分包加载 | 支持 | 不支持 |
| 云函数 | 支持 | 不支持 |

### 平台适配器使用

```typescript
import { createPlatformAdapter } from './platform';

const platform = createPlatformAdapter({
  weixin: { rewardedAdUnitId: 'adunit-xxx' },
  douyin: { rewardedAdUnitId: 'xxx' },
});

// 统一接口
await platform.storage.set('playerState', state);
const rewarded = await platform.rewardedAd.show();
platform.vibrate('light');
```

### 适配器接口

| 接口 | 功能 |
|------|------|
| `storage` | 本地存储（get/set/remove/clear）|
| `rewardedAd` | 激励视频广告（load/show/onStateChange）|
| `share` | 分享（showMenu/share/onShareAppMessage）|
| `login` | 登录（login/getUserInfo/checkSession）|
| `getSystemInfo()` | 获取设备信息（屏幕、安全区等）|
| `vibrate()` | 震动反馈（light/medium/heavy）|
| `showToast()` | 轻提示 |
| `showModal()` | 模态弹窗 |

## 游戏核心系统

### 体力系统参数
| 参数 | 值 |
|------|-----|
| energy_max | 5 |
| consume_per_play | 1 |
| regen | 20 分钟/点 |
| ad_reward | +1 体力 |
| ad_cap | 6 次/小时 |
| 新手保护 | 前 10 关不扣体力 |

### 关卡生成（可控随机）
- 模板池 8 个（T0-T7），每个模板有适用关卡区间
- 3 个难度旋钮：步数(14→10)、收集数量(8→16)、苔藓密度(0→30%)
- 必须保证可玩性：开局至少 1 步可消、无可行步自动洗牌、目标物权重倾斜

### Tile Types（5 种）
leaf 叶子 / acorn 橡果 / star 星屑 / fish 鱼干 / bone 骨头

### Blocker（1 种障碍）
moss 苔藓：落子在其上并发生消除即可清理（单层）

### 目标类型
- collect：收集指定数量目标物
- clear_moss：清除苔藓
- combo：collect + clear_moss 组合

## 留存系统

### 系统架构
```
assets/scripts/
├── core/
│   ├── WinStreakManager.ts      # 连胜管理
│   ├── PreBoosterManager.ts     # 预置道具管理
│   └── RetentionSystem.ts       # 留存系统集成
└── minigames/
    ├── index.ts                  # 模块导出
    ├── RescueMiniGame.ts         # 救援迷你游戏
    ├── ColorSortMiniGame.ts      # 颜色排序迷你游戏
    ├── TreasureHuntMiniGame.ts   # 寻宝迷你游戏
    └── MiniGameManager.ts        # 迷你游戏调度
```

### 连胜系统 (WinStreakManager)

| 连胜数 | 奖励 |
|--------|------|
| 1 | +50 💰 |
| 2 | +75 💰 |
| 3 | +100 💰, +1 💎 |
| 4 | +125 💰 |
| 5 | +150 💰, +2 💎, 🚀火箭 |
| 10 | +500 💰, +5 💎, 🌈超级彩虹 |

**复活选项**：
- 广告复活：每日 3 次
- 宝石复活：30 💎

### 预置道具 (PreBoosterManager)

| 道具 | 价格 | 解锁等级 | 效果 |
|------|------|----------|------|
| 🚀 火箭 | 50 💰 | 1 | 清除一行 |
| 💣 炸弹 | 80 💰 | 5 | 清除 3×3 |
| 🌈 彩虹 | 120 💰 | 10 | 清除同色 |
| 🔀 洗牌 | 30 💰 | 1 | 重排棋盘 |
| 🔨 锤子 | 60 💰 | 8 | 消除一个 |
| ⚡ 闪电 | 100 💰 | 15 | 清除一列 |

### 迷你游戏

| 游戏 | 触发条件 | 时限 | 奖励 |
|------|----------|------|------|
| 🐱 救援行动 | 关卡完成/连胜里程碑 | 10秒 | 100 💰 + 道具 |
| 🎨 颜色排序 | 关卡完成/连胜里程碑 | 12秒 | 70-100 💰 |
| 🗺️ 寻宝挖掘 | 关卡完成/连胜里程碑 | - | 20-200 💰 |

**触发规则**：
- 每 5 关有 30% 概率触发
- 5 连胜必触发
- 冷却时间 30 分钟

### 使用示例

```typescript
import { getRetentionSystem } from './core/RetentionSystem';

const retention = getRetentionSystem();

// 关卡开始前
const { availableBoosters, freeBoosters } = retention.onLevelStart(levelIndex);

// 关卡通关
const { streakReward, shouldTriggerMiniGame, miniGameType } = retention.onLevelWin(levelIndex);

// 关卡失败
const { streakLost, revivalOptions } = retention.onLevelFail(levelIndex);

// 复活连胜
retention.reviveStreakWithAd();
```

### 配置文件
`assets/resources/configs/retention-config.json` - 所有留存系统参数

## UI 结构（竖屏 1080×1920）

### 分屏布局
```
┌─────────────────────────┐
│                         │
│     动画区域 (上 50%)     │  ← 吉卜力风格猫狗故事动画
│     960px 高度           │     Spine 骨骼动画循环播放
│                         │
├─────────────────────────┤
│  HUD (关卡/目标/步数)     │  ← 80px
├─────────────────────────┤
│                         │
│     游戏区域 (下 50%)     │  ← 6×6 棋盘 + 触摸交互
│     880px 高度           │
│                         │
└─────────────────────────┘
```

### 详细区域划分
- **动画区 (0-960px)**：吉卜力风格动画 + 森林场景
  - 猫狗角色 Spine 动画（循环播放多个故事片段）
  - 森林草丛背景（视差滚动）
  - 柔和光效和粒子（风尘、萤火虫）
- **HUD (960-1040px)**：关卡号、目标 Widget、剩余步数、暂停按钮
- **游戏区 (1040-1920px)**：BoardGrid(6×6) + FXLayer + 体力指示器
- **弹窗层**：Pause/Win/Lose/EnergyGate/Consent

## 动画系统（吉卜力风格）

### 风格定义
- **色调**：低饱和度暖色系，日落时分的森林光线
- **线条**：柔和手绘风格，避免硬边
- **动态**：缓慢呼吸感，风吹草动的节奏
- **氛围**：治愈、温馨、怀旧

### 角色动画（Spine 2D 骨骼动画）
| 角色 | 动画状态 | 循环时长 | 说明 |
|------|----------|----------|------|
| 猫 (Mochi) | idle | 3s | 眨眼、耳朵微动 |
| 猫 (Mochi) | walk | 2s | 慢速行走 |
| 猫 (Mochi) | sleep | 5s | 蜷缩睡觉、腹部起伏 |
| 猫 (Mochi) | play | 4s | 扑蝴蝶/玩毛线 |
| 狗 (Taro) | idle | 3s | 摇尾巴、吐舌头 |
| 狗 (Taro) | walk | 2s | 小跑 |
| 狗 (Taro) | sit | 4s | 坐下歪头 |
| 狗 (Taro) | bark | 1.5s | 叫一声（触发事件） |

### 场景动画
| 元素 | 动画类型 | 说明 |
|------|----------|------|
| 草丛 | 帧动画/Shader | 风吹摇摆（3-5帧循环） |
| 树叶 | 粒子系统 | 缓缓飘落 |
| 萤火虫 | 粒子系统 | 随机飞舞发光 |
| 云朵 | Tween | 极慢速水平移动 |
| 阳光 | Shader | 体积光效果 |

### 故事片段（循环播放）
```
片段1: 猫在草丛中睡觉，狗走过来趴在旁边 (15s)
片段2: 猫追蝴蝶，狗在旁边看 (12s)
片段3: 猫狗一起在夕阳下走路 (10s)
片段4: 狗挖土，猫好奇凑过来 (12s)
片段5: 猫狗在树下乘凉打盹 (15s)
```

### 动画资源目录
```
assets/resources/animations/
├── spine/
│   ├── cat_mochi/           # 猫 Spine 资源
│   │   ├── cat_mochi.json
│   │   ├── cat_mochi.atlas
│   │   └── cat_mochi.png
│   └── dog_taro/            # 狗 Spine 资源
│       ├── dog_taro.json
│       ├── dog_taro.atlas
│       └── dog_taro.png
├── frames/
│   └── grass_sway/          # 草丛帧动画
└── particles/
    ├── leaves.plist          # 落叶粒子
    └── fireflies.plist       # 萤火虫粒子
```

## 音频系统

### 白噪音/环境音（循环播放）
| 音频 | 文件名 | 时长 | 说明 |
|------|--------|------|------|
| 森林环境音 | forest_ambience.mp3 | 60s+ | 鸟鸣、虫鸣、风声混合 |
| 草丛风声 | grass_wind.mp3 | 30s+ | 柔和风吹草动 |
| 小溪流水 | stream.mp3 | 45s+ | 远处溪流声 |

### 游戏音效
| 事件 | 文件名 | 说明 |
|------|--------|------|
| 选中格子 | sfx_select.mp3 | 轻柔点击音 |
| 交换成功 | sfx_swap.mp3 | 柔和滑动音 |
| 交换失败 | sfx_invalid.mp3 | 低沉短促音 |
| 3连消除 | sfx_match_3.mp3 | 清脆消除音 |
| 4连消除 | sfx_match_4.mp3 | 更明亮的消除音 |
| 5连消除 | sfx_match_5.mp3 | 华丽消除音 |
| 连消 | sfx_combo.mp3 | 递进式音效 |
| 苔藓清除 | sfx_moss_clear.mp3 | 类似露珠破裂 |
| 特殊块生成 | sfx_special_create.mp3 | 魔法音效 |
| 特殊块触发 | sfx_special_trigger.mp3 | 爆炸音效（柔和版） |
| 洗牌 | sfx_shuffle.mp3 | 卡牌洗动音 |
| 通关 | sfx_win.mp3 | 欢快庆祝音（2-3s） |
| 失败 | sfx_lose.mp3 | 温和遗憾音 |
| 按钮点击 | sfx_button.mp3 | UI 点击音 |

### 角色音效（可选）
| 事件 | 说明 |
|------|------|
| 猫叫 | 偶尔触发（通关/连消时） |
| 狗叫 | 偶尔触发（开始关卡时） |

### 音频资源目录
```
assets/resources/audio/
├── bgm/
│   └── forest_ambience.mp3   # 森林白噪音
├── sfx/
│   ├── sfx_select.mp3
│   ├── sfx_swap.mp3
│   ├── sfx_match_3.mp3
│   ├── sfx_match_4.mp3
│   ├── sfx_match_5.mp3
│   ├── sfx_combo.mp3
│   ├── sfx_win.mp3
│   ├── sfx_lose.mp3
│   └── ...
└── voice/
    ├── cat_meow.mp3
    └── dog_bark.mp3
```

### 音频管理器接口
```typescript
interface IAudioManager {
  // 背景音/白噪音
  playBGM(name: string, fadeIn?: number): void;
  stopBGM(fadeOut?: number): void;
  setBGMVolume(volume: number): void;  // 0-1

  // 音效
  playSFX(name: string): void;
  setSFXVolume(volume: number): void;

  // 全局控制
  setMasterVolume(volume: number): void;
  mute(muted: boolean): void;
}
```

## 开发优先级

### P0（必须完成才能上线）
- Board：交换/消除/下落/连消/特殊块（4连/5连）
- Goals：collect、clear_moss、combo 结算
- LevelGen：模板+seed+guardrails
- UI：竖屏布局 + Win/Lose/Pause
- Energy：回充 + EnergyGate + 倒计时显示
- Rewarded：接入 + 成功回调 + 失败兜底
- 埋点最小集

### P1（建议，成本低质感提升大）
- Story Panel：旁白池 + 展开收起
- 基础动效：风尘粒子 + 柔光呼吸
- 新手保护：前 10 关不扣体力

### P2（后续再说）
- 明信片收藏、每日任务、轻量皮肤、活动关卡

## 数据结构示例

### 关卡定义
```json
{
  "level_index": 27,
  "difficulty": 6,
  "seed": 918273,
  "board_size": 6,
  "moves": 11,
  "goals": [{"type": "collect", "item": "acorn", "count": 12}],
  "blockers": {"type": "moss", "density": 0.18, "pattern": "center_blob"},
  "tile_weights": {"leaf": 1.0, "acorn": 1.0, "star": 0.9, "fish": 0.8, "bone": 0.8}
}
```

### 体力系统配置
```json
{
  "energy_max": 5,
  "energy_regen_seconds": 1200,
  "ad_reward_energy": 1,
  "ad_hourly_cap": 6
}
```

## 8 个关卡模板

| ID | 名称 | Pattern | 目标 | 适用关卡 |
|----|------|---------|------|----------|
| T0 | Pure Collect | none | collect | 1-8 |
| T1 | Edge Ring | edge_ring | collect | 5-15 |
| T2 | Corner Patches | corners | collect/clear_moss | 10-22 |
| T3 | Diagonal Trail | diagonal | collect | 14-28 |
| T4 | Center Blob | center_blob | clear_moss/combo | 18-35 |
| T5 | Cross Wind | center_cross | collect | 22-40 |
| T6 | Stripes | stripes_h/v | clear_moss/combo | 30-50 |
| T7 | Scattered | scattered | combo | 38-50 |

<!-- OPENSPEC:START -->
## OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->