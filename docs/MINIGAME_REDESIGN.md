# 迷你游戏重新设计方案

## 核心原则：与主游戏元素结合

**主游戏元素**:
- 🍃 叶子 (leaf) | 🌰 橡果 (acorn) | ⭐ 星屑 (star) | 🐟 鱼干 (fish) | 🦴 骨头 (bone)
- 🐱 猫咪 Mochi | 🐶 狗狗 Taro
- 🌿 苔藓障碍物
- 🌲 森林/自然/吉卜力风格主题

**迷你游戏必须**:
1. 使用游戏中的5种元素图标
2. 包含猫狗角色
3. 符合森林/自然主题
4. 与主游戏机制有关联（收集、清除）

---

## 问题分析

### 1. 首页入口问题

**当前问题**（menu.html 第378-394行）:
- ❌ "迷你游戏" 按钮 - 不应暴露独立入口
- ❌ "留存系统演示" 按钮 - 开发调试用
- ❌ "核心玩法" 按钮 - 开发调试用

**正确设计**:
- 迷你游戏应在主游戏过程中**自动触发**，不需要菜单入口
- 首页只保留：每日奖励、排行榜、收藏馆、设置

### 2. 迷你游戏触发机制

| 触发条件 | 概率 | 游戏类型权重 |
|----------|------|-------------|
| 连胜里程碑（5、10连胜） | 100% | 均等 |
| 关卡通关后 | 15% | 根据关卡类型 |
| 每日首次登录 | 100% | 寻宝优先 |
| 失败3次后 | 50% | 简单游戏优先 |

---

## 迷你游戏重新设计

### A. 森林救援 (Forest Rescue) - Pin Pull 解谜

**主题融合**: 帮助 Mochi猫 或 Taro狗 脱离森林困境

**场景示例**:
```
┌─────────────────────────────────────┐
│  🐱 Mochi 被困在树枝上！              │
│                                     │
│     🪵树枝  ← 拔掉树枝1               │
│        ↓                            │
│  🌿苔藓    ← 拔掉苔藓                 │
│     🍃🍃   (叶子会飘落变成软垫)       │
│        ↓                            │
│  🐱 ══════ ← 拔掉木板让猫滑下         │
│        ↓                            │
│     🍃🍃🍃 (叶子堆缓冲)               │
│                                     │
│  正确顺序: 苔藓→树枝→木板             │
└─────────────────────────────────────┘
```

**游戏元素融合**:
| 游戏元素 | 在解谜中的作用 |
|----------|----------------|
| 🍃 叶子 | 堆积成软垫/滑道 |
| 🌰 橡果 | 滚动触发机关/填坑 |
| ⭐ 星屑 | 照亮路径/吸引角色 |
| 🐟 鱼干 | 引诱猫咪移动 |
| 🦴 骨头 | 引诱狗狗移动 |
| 🌿 苔藓 | 障碍物/需要清除 |

**核心玩法**:
1. 2-4 个可交互元素（树枝/苔藓/木板/石头）
2. 拖拽或点击移除障碍物
3. 利用游戏元素的物理特性（叶子飘落、橡果滚动）
4. 用鱼干/骨头引导猫狗移动到安全位置

**难度递进**:
| 难度 | 机关数 | 需要引诱 | 时间 |
|------|--------|----------|------|
| 简单 | 2 | 否 | 无限 |
| 中等 | 3 | 是 | 20秒 |
| 困难 | 4 | 是 | 15秒 |

---

### B. 收集整理 (Collection Sort) - 元素分类

**主题融合**: 帮猫狗整理收集到的森林物品

**场景示例**:
```
┌─────────────────────────────────────┐
│  🐱🐶 帮我们整理收集的宝贝吧！        │
│                                     │
│   木桶1   木桶2   木桶3   空桶       │
│   ┌──┐   ┌──┐   ┌──┐   ┌──┐       │
│   │🍃│   │🌰│   │⭐│   │  │       │
│   │🌰│   │🍃│   │🍃│   │  │       │
│   │⭐│   │⭐│   │🌰│   │  │       │
│   └──┘   └──┘   └──┘   └──┘       │
│                                     │
│   点击木桶1 → 点击空桶               │
│   🍃 移动到空桶顶部                  │
│                                     │
│   目标: 每个桶只装同一种物品          │
│   剩余步数: 15                       │
└─────────────────────────────────────┘
```

**游戏元素**:
- 容器：🪣木桶 / 🧺篮子 / 🎒背包
- 物品：5种游戏元素（叶子、橡果、星屑、鱼干、骨头）
- 背景：森林小屋/猫狗窝

**核心玩法**:
1. 4-6 个木桶，装有混合的游戏元素
2. 点击选中桶顶元素，再点击目标桶放下
3. 只能放到**同类元素顶部**或**空桶**
4. 目标：每桶只有一种元素
5. 有步数限制

**特殊规则**:
- 🐱猫咪提示：高亮所有鱼干位置（消耗1次）
- 🐶狗狗提示：高亮所有骨头位置（消耗1次）
- 连续相同元素可一起移动

**难度递进**:
| 难度 | 桶数 | 元素种类 | 步数 | 层数 |
|------|------|----------|------|------|
| 简单 | 4 | 3(🍃🌰⭐) | 12 | 3 |
| 中等 | 5 | 4(+🐟) | 18 | 4 |
| 困难 | 6 | 5(+🦴) | 24 | 4 |

---

### C. 森林探索 (Forest探索) - 扫雷式寻宝

**主题融合**: 在森林草地中寻找隐藏的宝物

**场景示例**:
```
┌─────────────────────────────────────┐
│  🐱🐶 森林里藏着宝贝！帮我们找到吧！  │
│                                     │
│        1  2  3  4  5                │
│      ┌──┬──┬──┬──┬──┐              │
│    1 │🌿│🌿│ 2│🌿│🌿│ ← 数字=距离   │
│      ├──┼──┼──┼──┼──┤              │
│    2 │🌿│ 1│🍃│ 1│🌿│ 🍃=叶子(空)  │
│      ├──┼──┼──┼──┼──┤              │
│    3 │🌿│🌿│ 2│🌿│🌿│ 🌰=橡果奖励  │
│      ├──┼──┼──┼──┼──┤              │
│    4 │🚩│🌿│🌿│🌿│🌿│ ⭐=星屑大奖  │
│      ├──┼──┼──┼──┼──┤              │
│    5 │🌿│🌿│🌿│🌿│🌿│ 🚩=标记     │
│      └──┴──┴──┴──┴──┘              │
│                                     │
│  爪子: 🐾×5   [挖掘] [标记]          │
│  🐱感应🐟  🐶感应🦴  (特殊能力)      │
└─────────────────────────────────────┘
```

**游戏元素融合**:
| 隐藏内容 | 图标 | 奖励 | 概率 |
|----------|------|------|------|
| 空地 | 🍃 | 无 | 35% |
| 橡果堆 | 🌰 | +30💰 | 25% |
| 星屑 | ⭐ | +1💎 | 10% |
| 鱼干 | 🐟 | +50💰 | 10% |
| 骨头 | 🦴 | +50💰 | 10% |
| 苔藓陷阱 | 🌿💀 | -1爪子 | 8% |
| 宝箱 | 🎁 | +100💰+2💎 | 2% |

**特殊能力**:
- 🐱 猫咪嗅觉：显示是否有🐟在相邻格子（免费1次）
- 🐶 狗狗嗅觉：显示是否有🦴在相邻格子（免费1次）
- 探测器：显示某行/列有几个宝物（广告获取）

**核心玩法**:
1. 5×5 网格覆盖苔藓，隐藏各种物品
2. 用"爪子"挖开格子，显示内容
3. 挖开空地显示**数字**（到最近宝物的距离）
4. 用数字**推理**宝物位置
5. 找到宝箱🎁即大成功

**数字提示**:
```
0 = 这格就是宝物
1 = 宝物在上下左右相邻格
2 = 宝物距离2格
3+ = 较远
```

---

## 实现优先级

### Phase 1: 首页清理
1. 移除 menu.html 中的开发调试入口
2. 移除独立的"迷你游戏"按钮

### Phase 2: 触发机制
1. 实现 MiniGameTrigger 组件
2. 集成到关卡完成流程
3. 集成到连胜系统

### Phase 3: 游戏重做
1. **试管球排序**（复杂度中等，参考成熟）
2. **扫雷式寻宝**（复杂度中等，有推理深度）
3. **Pin Pull 解谜**（复杂度高，需要场景编辑器）

---

## 技术实现要点

### 试管球排序
```typescript
interface TubeState {
  balls: Color[]; // 从底到顶
  maxCapacity: 4;
}

interface BallSortGame {
  tubes: TubeState[];
  movesRemaining: number;
  undoStack: Move[];

  canMove(from: number, to: number): boolean;
  move(from: number, to: number): boolean;
  undo(): boolean;
  isComplete(): boolean;
}
```

### 扫雷式寻宝
```typescript
interface TreasureCell {
  content: 'empty' | 'coins' | 'gems' | 'trap' | 'treasure';
  revealed: boolean;
  flagged: boolean;
  hintNumber?: number; // 到最近宝藏的距离
}

interface TreasureHuntGame {
  grid: TreasureCell[][];
  shovels: number;
  detectors: number;
  treasureFound: boolean;

  dig(row: number, col: number): DigResult;
  flag(row: number, col: number): void;
  useDetector(type: 'row' | 'col', index: number): boolean[];
  calculateHint(row: number, col: number): number;
}
```

### Pin Pull 解谜
```typescript
interface PinPullElement {
  type: 'pin' | 'rock' | 'water' | 'fire' | 'monster' | 'platform';
  position: { x: number, y: number };
  state: 'active' | 'triggered' | 'destroyed';
}

interface PinPullGame {
  elements: PinPullElement[];
  character: { position: Vector2, safe: boolean };
  pins: Pin[];

  pullPin(pinId: string): SimulationResult;
  checkWin(): boolean;
  checkLose(): boolean;
}
```

---

## 实现状态

### 已完成 (2025-12-27)

1. **收集整理 (Collection Sort)** - `demo/minigames.html`
   - 木桶容器 UI，带木纹效果
   - 使用 🍃🌰⭐🐟🦴 五种游戏元素
   - 猫狗提示功能：🐱高亮🐟，🐶高亮🦴
   - 难度等级：简单(4桶3类3层)、中等(5桶4类4层)、困难(6桶5类4层)
   - 步数限制与完美通关奖励

2. **森林救援 (Forest Rescue)** - `demo/minigames.html`
   - 3个救援场景，使用游戏元素作为障碍物
   - 猫被困树上(🍃做缓冲)、狗过河(🌰做桥)、猫躲雨(🍃做伞)
   - 障碍物顺序解谜，错误扣时间
   - 15秒倒计时环形进度条
   - 角色动画：scared → happy/sad

3. **森林探索 (Forest Explore)** - `demo/minigames.html`
   - 5×5 苔藓覆盖的网格
   - 隐藏内容：🍃空地、🌰橡果、⭐星屑、🐟鱼干、🦴骨头、🌿💀陷阱、🎁宝箱
   - 6次挖掘机会(🐾爪子)
   - 猫狗特殊能力：🐱感应🐟、🐶感应🦴
   - 热力图提示到宝箱的距离

---

## 参考资源

- [Ball Sort Puzzle - Coolmath Games](https://www.coolmathgames.com/0-ball-sort)
- [Water Sort Puzzle Games Guide](https://www.brsoftech.com/blog/develop-water-sort-puzzle-game/)
- [Save The Girl - Pull The Pin](https://play.google.com/store/apps/details?id=com.gamee.savegirlpullpin)
- [Finders Sweepers - Treasure Hunt](https://apps.apple.com/ca/app/finders-sweepers-treasure-hunt/id1586844563)
- [Microsoft Treasure Hunt](https://www.microsoftcasualgames.com/treasurehunt)
