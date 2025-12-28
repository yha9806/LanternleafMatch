# Phase 1 & Phase 2 详细设计文档

---

## Phase 1: 核心留存系统

### 1.1 连胜系统 (Win Streak)

#### 核心机制

```
通关 → 连胜+1 → 奖励升级 → 继续挑战
  ↓
失败 → 连胜归零 → 提供复活机会 → 看广告/花钱保留连胜
```

#### 连胜奖励表

| 连胜数 | 奖励 | 下一关预置道具 | 说明 |
|--------|------|----------------|------|
| 1 | 20 金币 | - | 起步 |
| 2 | 40 金币 | - | 积累 |
| 3 | 80 金币 | 🚀 火箭 x1 | 首次道具奖励 |
| 4 | 100 金币 | 🚀 火箭 x1 | 保持 |
| 5 | 150 金币 + 💎1 | 🚀 + 💣 炸弹 x1 | 第一个宝石 |
| 6 | 180 金币 | 🚀 + 💣 | 保持 |
| 7 | 220 金币 + 💎2 | 🚀 + 💣 + 🌈 彩虹 x1 | 全道具组合 |
| 8-9 | 250 金币 | 🚀 + 💣 + 🌈 | 保持 |
| 10+ | 300 金币 + 💎3 | 🚀 + 💣 + 🌈 + ⭐ 超级彩虹 | 最高奖励 |

#### 超级彩虹 (Super Rainbow)

```typescript
interface SuperRainbow {
  type: 'super_rainbow';
  effect: '清除所有同类型方块 + 额外消除一行一列';
  unlockCondition: 'streak >= 10';
  description: '10连胜专属道具，开局自动放置在棋盘中央';
}
```

**设计意图**: 参考 Royal Match 的 "Super Light Ball"，这是玩家保持连胜的强烈动机。

#### UI 设计

```
┌─────────────────────────────────────┐
│  🔥 连胜: 7                          │  ← 顶部常驻显示
│  ████████░░ 下一阶段: 10            │
└─────────────────────────────────────┘

通关后弹窗:
┌─────────────────────────────────────┐
│                                     │
│         🎉 关卡通过!                │
│                                     │
│    🔥 连胜 7 → 8                    │
│                                     │
│    ┌─────────────────────┐          │
│    │ 下关预置道具:        │          │
│    │ 🚀 🚀 💣 🌈          │          │
│    └─────────────────────┘          │
│                                     │
│    奖励: 220 金币 + 💎2             │
│                                     │
│  ┌─────────┐  ┌─────────────────┐   │
│  │  领取   │  │ 看广告 x2 奖励  │   │
│  └─────────┘  └─────────────────┘   │
│                                     │
└─────────────────────────────────────┘

失败后弹窗:
┌─────────────────────────────────────┐
│                                     │
│         😢 挑战失败                 │
│                                     │
│    🔥 连胜将归零 (当前: 7)          │
│                                     │
│    ┌─────────────────────────────┐  │
│    │ 即将失去:                    │  │
│    │ • 下关预置: 🚀🚀💣🌈         │  │
│    │ • 10连胜进度: 70%           │  │
│    └─────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  🎬 看广告保留连胜 (免费)     │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  💎 花费 30 宝石保留连胜      │  │
│  └───────────────────────────────┘  │
│                                     │
│       [ 放弃连胜，重新开始 ]        │
│                                     │
└─────────────────────────────────────┘
```

#### 数据结构

```typescript
interface WinStreakData {
  currentStreak: number;
  maxStreak: number;
  lastWinTime: number;          // 用于超时检测
  streakExpiresAt: number | null; // 72小时超时 (可选)

  // 统计
  totalStreakRevivals: number;  // 复活次数
  revivalMethodUsed: {
    ad: number;
    gems: number;
  };
}

// 存储 key
const STORAGE_KEY = 'lanternleaf_win_streak';
```

#### 核心代码框架

```typescript
class WinStreakManager {
  private data: WinStreakData;

  // 获取当前连胜奖励
  getCurrentRewards(): StreakRewards {
    const streak = this.data.currentStreak;

    return {
      coins: this.calcCoins(streak),
      gems: this.calcGems(streak),
      preBoosters: this.calcPreBoosters(streak),
    };
  }

  // 通关处理
  onLevelWin(): StreakRewards {
    this.data.currentStreak++;
    this.data.lastWinTime = Date.now();

    if (this.data.currentStreak > this.data.maxStreak) {
      this.data.maxStreak = this.data.currentStreak;
    }

    this.save();
    return this.getCurrentRewards();
  }

  // 失败处理
  onLevelFail(): { canRevive: boolean; reviveCost: ReviveCost } {
    const canWatchAd = AdManager.canShowRewarded();
    const gemCost = this.calcReviveGemCost();

    return {
      canRevive: this.data.currentStreak >= 3,
      reviveCost: {
        ad: canWatchAd,
        gems: gemCost,
      },
    };
  }

  // 复活连胜
  reviveStreak(method: 'ad' | 'gems'): boolean {
    if (method === 'ad') {
      // 触发广告
      this.data.totalStreakRevivals++;
      this.data.revivalMethodUsed.ad++;
    } else {
      const cost = this.calcReviveGemCost();
      if (!PlayerProgress.spendGems(cost)) return false;
      this.data.revivalMethodUsed.gems++;
    }

    this.save();
    return true;
  }

  // 放弃连胜
  resetStreak(): void {
    this.data.currentStreak = 0;
    this.save();
  }

  // 计算预置道具
  private calcPreBoosters(streak: number): PreBooster[] {
    const boosters: PreBooster[] = [];

    if (streak >= 3) boosters.push({ type: 'rocket', count: 1 });
    if (streak >= 5) boosters.push({ type: 'bomb', count: 1 });
    if (streak >= 7) boosters.push({ type: 'rainbow', count: 1 });
    if (streak >= 10) boosters.push({ type: 'super_rainbow', count: 1 });

    return boosters;
  }
}
```

---

### 1.2 预置道具系统 (Pre-Boosters)

#### 核心机制

关卡开始前，玩家可选择携带道具进入关卡。道具会在开局时自动放置在棋盘上。

#### 道具类型

| 道具 | 图标 | 效果 | 价格 | 放置位置 |
|------|------|------|------|----------|
| +3 步 | ➕ | 额外3步 | 50 金币 | - |
| +5 步 | ➕➕ | 额外5步 | 100 金币 / 💎5 | - |
| 火箭 | 🚀 | 清一行/列 | 80 金币 / 💎3 | 随机空位 |
| 炸弹 | 💣 | 清 3x3 | 120 金币 / 💎5 | 随机空位 |
| 彩虹 | 🌈 | 清同色 | 💎8 | 随机空位 |
| 洗牌 | 🔀 | 重排棋盘 | 60 金币 | - |

#### UI 设计 - 关卡开始前选择界面

```
┌─────────────────────────────────────┐
│        关卡 27 - 准备出发           │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   目标: 收集 12 个橡果       │    │
│  │   步数: 15                   │    │
│  │   难度: ⭐⭐⭐               │    │
│  └─────────────────────────────┘    │
│                                     │
│  ═══════ 选择预置道具 ═══════       │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ ➕  │ │ 🚀  │ │ 💣  │ │ 🌈  │   │
│  │ +3步│ │火箭 │ │炸弹 │ │彩虹 │   │
│  │     │ │     │ │     │ │     │   │
│  │ 50  │ │ 80  │ │ 120 │ │ 💎8 │   │
│  │ [+] │ │ [+] │ │ [+] │ │ [+] │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│  已选择: 🚀 💣  费用: 200 金币      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   🔥 连胜奖励: 🚀 (免费)    │    │  ← 连胜赠送的道具
│  └─────────────────────────────┘    │
│                                     │
│  ┌───────────┐ ┌───────────────┐    │
│  │   开始    │ │ 看广告免费用 │    │  ← 首次/每日一次
│  └───────────┘ └───────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

#### 失败后推荐 UI

当玩家连续失败 2 次时，自动推荐预置道具:

```
┌─────────────────────────────────────┐
│                                     │
│         😅 再试一次?                │
│                                     │
│    这关有点难，试试带点道具?        │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  推荐组合:                   │  │
│    │                              │  │
│    │  🚀 火箭 + ➕ +3步           │  │
│    │                              │  │
│    │  原价: 130 金币              │  │
│    │  限时: 99 金币 (省 24%)      │  │
│    │                              │  │
│    │  [ 使用此组合 ]              │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │ 🎬 看广告获得 🚀 (免费)     │  │
│    └─────────────────────────────┘  │
│                                     │
│         [ 不用了，直接开始 ]        │
│                                     │
└─────────────────────────────────────┘
```

#### 数据结构

```typescript
interface PreBoosterConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  effect: BoosterEffect;
  cost: {
    coins?: number;
    gems?: number;
  };
  placement: 'board' | 'none';  // 是否放置在棋盘
  maxPerLevel: number;          // 每关最多携带数量
}

interface SelectedPreBoosters {
  boosters: Array<{
    id: string;
    count: number;
    source: 'purchased' | 'streak' | 'ad' | 'free';
  }>;
  totalCost: { coins: number; gems: number };
}

// 关卡开始时的道具放置
interface BoardPlacement {
  boosterId: string;
  position: { row: number; col: number };
  tileType: TileType;  // 道具附着的方块类型
}
```

#### 核心代码框架

```typescript
class PreBoosterManager {
  private config: PreBoosterConfig[];

  // 获取可用道具列表
  getAvailableBoosters(levelIndex: number): PreBoosterConfig[] {
    // 根据关卡解锁情况过滤
    return this.config.filter(b => this.isUnlocked(b, levelIndex));
  }

  // 计算选择的道具总价
  calculateCost(selections: SelectedPreBoosters): { coins: number; gems: number } {
    let coins = 0, gems = 0;

    for (const sel of selections.boosters) {
      if (sel.source !== 'purchased') continue;

      const config = this.getConfig(sel.id);
      coins += (config.cost.coins || 0) * sel.count;
      gems += (config.cost.gems || 0) * sel.count;
    }

    return { coins, gems };
  }

  // 确认购买并开始关卡
  confirmAndStart(selections: SelectedPreBoosters): BoardPlacement[] {
    const cost = this.calculateCost(selections);

    // 扣费
    if (cost.coins > 0 && !PlayerProgress.spendCoins(cost.coins)) {
      throw new Error('金币不足');
    }
    if (cost.gems > 0 && !PlayerProgress.spendGems(cost.gems)) {
      throw new Error('宝石不足');
    }

    // 生成棋盘放置位置
    return this.generatePlacements(selections);
  }

  // 生成道具在棋盘上的位置
  private generatePlacements(selections: SelectedPreBoosters): BoardPlacement[] {
    const placements: BoardPlacement[] = [];
    const usedPositions = new Set<string>();

    for (const sel of selections.boosters) {
      const config = this.getConfig(sel.id);
      if (config.placement !== 'board') continue;

      for (let i = 0; i < sel.count; i++) {
        // 找一个未使用的随机位置
        const pos = this.findRandomPosition(usedPositions);
        usedPositions.add(`${pos.row},${pos.col}`);

        placements.push({
          boosterId: sel.id,
          position: pos,
          tileType: this.getRandomTileType(),
        });
      }
    }

    return placements;
  }
}
```

---

### 1.3 动态难度调整 (DDA)

#### 核心理念

> "让玩家感觉自己在进步，而不是被游戏打败"

DDA 是**隐性**的，玩家不应该感知到难度在调整。

#### 调整维度

| 维度 | 调整范围 | 触发条件 | 玩家感知 |
|------|----------|----------|----------|
| 步数 | -2 ~ +3 | 连败/连胜 | 低 |
| 开局布局 | 保证可消 | 始终 | 无 |
| 目标物权重 | ±20% | 连败 | 低 |
| 连消概率 | ±15% | 连败/付费用户 | 低 |
| 特殊块生成 | ±10% | 付费用户 | 低 |

#### 触发规则

```typescript
interface DDAProfile {
  // 当前状态
  recentResults: ('win' | 'lose')[];  // 最近 10 关结果
  currentLoseStreak: number;
  currentWinStreak: number;
  sessionPlayTime: number;            // 本次游戏时长 (分钟)

  // 玩家属性
  isPayer: boolean;                   // 是否付费用户
  totalSpent: number;                 // 累计消费
  isNewPlayer: boolean;               // 是否新手 (前20关)

  // 计算出的调整
  adjustments: DDAdjustments;
}

interface DDAdjustments {
  moveBonus: number;          // 步数加成 (-2 ~ +3)
  targetWeightBonus: number;  // 目标物权重加成 (0.8 ~ 1.2)
  cascadeBonus: number;       // 连消概率加成 (0.9 ~ 1.15)
  specialSpawnBonus: number;  // 特殊块生成加成 (0.9 ~ 1.1)
  guaranteedMatch: boolean;   // 是否保证开局有匹配
}
```

#### 调整公式

```typescript
class DynamicDifficultyAdjuster {

  calculate(profile: DDAProfile): DDAdjustments {
    const { recentResults, currentLoseStreak, isPayer, isNewPlayer } = profile;

    // 计算近期胜率
    const recentWinRate = recentResults.filter(r => r === 'win').length / recentResults.length;

    // 基础调整
    let moveBonus = 0;
    let targetWeightBonus = 1.0;
    let cascadeBonus = 1.0;
    let specialSpawnBonus = 1.0;

    // === 规则 1: 连败保护 ===
    if (currentLoseStreak >= 3) {
      moveBonus += Math.min(currentLoseStreak - 2, 3);  // +1 ~ +3 步
      targetWeightBonus += 0.1;  // 目标物更容易出现
      cascadeBonus += 0.1;       // 连消更容易
    }

    // === 规则 2: 新手保护 ===
    if (isNewPlayer) {
      moveBonus += 1;
      cascadeBonus += 0.1;
      specialSpawnBonus += 0.05;
    }

    // === 规则 3: 付费用户优待 ===
    if (isPayer) {
      targetWeightBonus += 0.05;
      cascadeBonus += 0.05;
      specialSpawnBonus += 0.05;
    }

    // === 规则 4: 连胜平衡 ===
    if (profile.currentWinStreak >= 10) {
      moveBonus -= 1;  // 稍微增加难度
    }

    // === 规则 5: 长时间游玩奖励 ===
    if (profile.sessionPlayTime > 20) {
      cascadeBonus += 0.05;  // 玩得越久越"幸运"
    }

    return {
      moveBonus: Math.max(-2, Math.min(3, moveBonus)),
      targetWeightBonus: Math.max(0.8, Math.min(1.2, targetWeightBonus)),
      cascadeBonus: Math.max(0.9, Math.min(1.15, cascadeBonus)),
      specialSpawnBonus: Math.max(0.9, Math.min(1.1, specialSpawnBonus)),
      guaranteedMatch: currentLoseStreak >= 2 || isNewPlayer,
    };
  }
}
```

#### 应用到关卡生成

```typescript
// 修改 LevelGenerator
class LevelGenerator {
  generateLevel(levelIndex: number, playerId: string): LevelDef {
    const baseDef = this.generateBaseDef(levelIndex);

    // 获取 DDA 调整
    const profile = DDAManager.getProfile(playerId);
    const adjustments = DDAManager.calculate(profile);

    // 应用调整
    return {
      ...baseDef,
      moves: baseDef.moves + adjustments.moveBonus,
      tile_weights: this.applyWeightBonus(baseDef.tile_weights, adjustments.targetWeightBonus),
      _dda: adjustments,  // 用于埋点分析
    };
  }
}

// 修改 MatchResolver - 连消概率调整
class MatchResolver {
  private resolveAndFill(board: Board, dda: DDAdjustments): void {
    // 在填充新方块时应用概率调整
    for (const pos of emptyPositions) {
      const tile = this.generateTile(dda);
      board.set(pos, tile);
    }
  }

  private generateTile(dda: DDAdjustments): Tile {
    // 应用目标物权重加成
    const weights = this.applyWeights(this.baseWeights, dda.targetWeightBonus);

    // 根据 cascadeBonus 调整，让下落后更容易形成匹配
    if (dda.cascadeBonus > 1.0 && Math.random() < (dda.cascadeBonus - 1.0)) {
      // 尝试生成一个能形成匹配的方块
      return this.generateMatchableTile();
    }

    return this.randomTile(weights);
  }
}
```

---

## Phase 2: 迷你游戏系统

### 2.1 系统架构

```
┌──────────────────────────────────────────────────────┐
│                   MiniGameManager                    │
├──────────────────────────────────────────────────────┤
│  - 调度迷你游戏触发时机                               │
│  - 管理迷你游戏奖励                                   │
│  - 统计迷你游戏数据                                   │
└───────────────────────┬──────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ RescueGame   │ │ ColorSort    │ │ TreasureHunt │
│ 救援游戏      │ │ 颜色排序      │ │ 挖宝寻宝      │
└──────────────┘ └──────────────┘ └──────────────┘
```

#### 触发时机

| 场景 | 迷你游戏 | 概率 | 说明 |
|------|----------|------|------|
| 关卡通过 | 随机 | 30% | 额外奖励 |
| 每日登录 | 挖宝 | 100% | 每日首次 |
| 连胜 5 | 救援 | 100% | 连胜奖励 |
| 失败后 | 颜色排序 | 50% | 安慰奖 |
| 周末 | 全部 | +20% | 活动加成 |

---

### 2.2 救援游戏 (Rescue Mini Game)

#### 游戏机制

玩家需要在 **10 秒**内选择正确的选项来拯救角色。

#### 场景设计 (匹配猫狗主题)

| 场景 ID | 名称 | 描述 | 正确选项 |
|---------|------|------|----------|
| cat_tree | 小猫爬树 | 小猫爬到树上下不来 | 选择合适的梯子 |
| dog_river | 小狗过河 | 小狗需要过河 | 选择正确的跳板顺序 |
| cat_rain | 躲雨猫咪 | 下雨了需要帮猫咪找伞 | 选择正确颜色的伞 |
| dog_dig | 小狗挖宝 | 小狗想挖出骨头 | 选择正确的挖掘位置 |
| cat_fish | 钓鱼猫咪 | 猫咪想钓鱼 | 选择有鱼的水域 |
| rescue_both | 双重救援 | 猫狗都需要帮助 | 选择正确的救援顺序 |

#### UI 设计

```
┌─────────────────────────────────────┐
│                                     │
│    ⏱️ 8 秒                          │  ← 倒计时
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      🐱 ← 小猫在树上        │    │  ← 动画场景
│  │         🌳                  │    │
│  │        /  \                 │    │
│  │       /    \                │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│      帮助小猫下来! 选择正确的梯子    │
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │  🪜   │ │  🪜   │ │  🪜   │     │
│  │ 短梯  │ │ 中梯  │ │ 长梯  │     │  ← 3个选项
│  │   1   │ │   2   │ │   3   │     │
│  └───────┘ └───────┘ └───────┘     │
│                                     │
└─────────────────────────────────────┘

成功画面:
┌─────────────────────────────────────┐
│                                     │
│         🎉 救援成功!                │
│                                     │
│      🐱  ❤️                        │
│      小猫安全落地了!                │
│                                     │
│    ┌─────────────────────────┐      │
│    │  奖励: 100 金币 + 1 道具  │      │
│    └─────────────────────────┘      │
│                                     │
│         [ 领取奖励 ]                │
│                                     │
└─────────────────────────────────────┘

失败画面:
┌─────────────────────────────────────┐
│                                     │
│         😿 救援失败                 │
│                                     │
│      梯子太短了...                  │
│                                     │
│    ┌─────────────────────────┐      │
│    │  安慰奖: 20 金币         │      │
│    └─────────────────────────┘      │
│                                     │
│  ┌───────────┐ ┌───────────────┐    │
│  │   领取    │ │ 🎬 看广告再试  │    │
│  └───────────┘ └───────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

#### 数据结构

```typescript
interface RescueScenario {
  id: string;
  name: string;
  description: string;

  // 视觉资源
  backgroundImage: string;
  characterSprite: string;    // 猫/狗精灵
  characterAnimation: string; // 求助动画

  // 选项配置
  options: RescueOption[];
  correctOptionIndex: number;

  // 时间限制
  timeLimit: number;  // 秒

  // 奖励
  rewards: {
    success: Reward;
    fail: Reward;
  };
}

interface RescueOption {
  id: string;
  icon: string;
  label: string;
  resultAnimation: string;  // 选择后的动画
}

// 救援场景配置示例
const RESCUE_SCENARIOS: RescueScenario[] = [
  {
    id: 'cat_tree',
    name: '小猫爬树',
    description: '小猫爬到树上下不来，帮它选择合适的梯子!',
    backgroundImage: 'rescue_bg_forest.png',
    characterSprite: 'cat_scared.png',
    characterAnimation: 'cat_meow_help',
    options: [
      { id: 'short', icon: '🪜', label: '短梯', resultAnimation: 'ladder_too_short' },
      { id: 'medium', icon: '🪜', label: '中梯', resultAnimation: 'ladder_too_short' },
      { id: 'long', icon: '🪜', label: '长梯', resultAnimation: 'cat_rescued' },
    ],
    correctOptionIndex: 2,
    timeLimit: 10,
    rewards: {
      success: { coins: 100, booster: 'rocket' },
      fail: { coins: 20 },
    },
  },
  // ... 更多场景
];
```

#### 核心代码

```typescript
class RescueMiniGame {
  private scenario: RescueScenario;
  private timeRemaining: number;
  private timer: number | null = null;
  private hasAnswered: boolean = false;

  constructor(scenario: RescueScenario) {
    this.scenario = scenario;
    this.timeRemaining = scenario.timeLimit;
  }

  start(): void {
    this.timer = setInterval(() => {
      this.timeRemaining--;
      this.onTimeUpdate(this.timeRemaining);

      if (this.timeRemaining <= 0) {
        this.onTimeout();
      }
    }, 1000);
  }

  selectOption(optionIndex: number): RescueResult {
    if (this.hasAnswered) return;
    this.hasAnswered = true;
    this.stopTimer();

    const isCorrect = optionIndex === this.scenario.correctOptionIndex;
    const option = this.scenario.options[optionIndex];

    // 播放结果动画
    this.playResultAnimation(option.resultAnimation);

    return {
      success: isCorrect,
      reward: isCorrect ? this.scenario.rewards.success : this.scenario.rewards.fail,
      timeUsed: this.scenario.timeLimit - this.timeRemaining,
    };
  }

  private onTimeout(): void {
    this.stopTimer();
    // 超时视为失败
    this.onResult({
      success: false,
      reward: this.scenario.rewards.fail,
      timeUsed: this.scenario.timeLimit,
    });
  }
}
```

---

### 2.3 颜色排序游戏 (Color Sort)

#### 游戏机制

屏幕显示一组乱序的彩色方块，玩家需要点击正确的顺序将它们排列好。

#### 难度等级

| 难度 | 方块数 | 颜色数 | 时间限制 | 奖励 |
|------|--------|--------|----------|------|
| 简单 | 4 | 4 | 15秒 | 50 金币 |
| 中等 | 5 | 5 | 12秒 | 80 金币 |
| 困难 | 6 | 5 | 10秒 | 120 金币 + 道具 |

#### UI 设计

```
┌─────────────────────────────────────┐
│                                     │
│    ⏱️ 10 秒                         │
│                                     │
│  按正确顺序点击方块!                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │   正确顺序:                 │    │
│  │   🟢 🔵 🟡 🔴 🟣           │    │  ← 目标顺序
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │   点击排序:                 │    │
│  │   🔴 🟣 🟢 🔵 🟡           │    │  ← 乱序方块
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   已选择: 🟢 🔵 _  _  _     │    │  ← 当前选择
│  └─────────────────────────────┘    │
│                                     │
│         进度: 2 / 5                 │
│                                     │
└─────────────────────────────────────┘
```

#### 数据结构

```typescript
interface ColorSortConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  colors: TileType[];           // 使用游戏内的方块类型
  shuffledOrder: number[];      // 乱序索引
  correctOrder: number[];       // 正确顺序索引
  timeLimit: number;
  rewards: {
    perfect: Reward;    // 全部正确
    partial: Reward;    // 部分正确
    fail: Reward;       // 失败
  };
}

interface ColorSortState {
  selectedIndices: number[];    // 玩家已选择的索引
  remainingTime: number;
  mistakes: number;             // 错误次数
  maxMistakes: 2;               // 最多允许错误次数
}
```

#### 核心代码

```typescript
class ColorSortMiniGame {
  private config: ColorSortConfig;
  private state: ColorSortState;

  constructor(difficulty: 'easy' | 'medium' | 'hard') {
    this.config = this.generateConfig(difficulty);
    this.state = {
      selectedIndices: [],
      remainingTime: this.config.timeLimit,
      mistakes: 0,
      maxMistakes: 2,
    };
  }

  private generateConfig(difficulty: string): ColorSortConfig {
    const colors = this.getColorsForDifficulty(difficulty);
    const correctOrder = Array.from({ length: colors.length }, (_, i) => i);
    const shuffledOrder = this.shuffle([...correctOrder]);

    return {
      difficulty,
      colors,
      shuffledOrder,
      correctOrder,
      timeLimit: difficulty === 'easy' ? 15 : difficulty === 'medium' ? 12 : 10,
      rewards: this.getRewardsForDifficulty(difficulty),
    };
  }

  selectColor(shuffledIndex: number): SelectResult {
    const expectedIndex = this.state.selectedIndices.length;
    const expectedColor = this.config.correctOrder[expectedIndex];
    const selectedColor = this.config.shuffledOrder[shuffledIndex];

    if (selectedColor === expectedColor) {
      // 正确
      this.state.selectedIndices.push(shuffledIndex);

      if (this.state.selectedIndices.length === this.config.colors.length) {
        // 完成
        return { type: 'complete', reward: this.calcReward() };
      }

      return { type: 'correct' };
    } else {
      // 错误
      this.state.mistakes++;

      if (this.state.mistakes >= this.state.maxMistakes) {
        return { type: 'fail', reward: this.config.rewards.fail };
      }

      return { type: 'wrong', remainingMistakes: this.state.maxMistakes - this.state.mistakes };
    }
  }

  private calcReward(): Reward {
    if (this.state.mistakes === 0) {
      return this.config.rewards.perfect;
    }
    return this.config.rewards.partial;
  }
}
```

---

### 2.4 挖宝寻宝游戏 (Treasure Hunt)

#### 游戏机制

玩家有限量的"铲子"，在 5x5 的格子中挖掘，寻找隐藏的宝藏。

#### 宝藏分布

| 稀有度 | 数量 | 奖励范围 | 概率 |
|--------|------|----------|------|
| 普通 | 8 | 10-30 金币 | 40% |
| 稀有 | 4 | 50-100 金币 | 25% |
| 史诗 | 2 | 1-3 宝石 | 15% |
| 传说 | 1 | 道具 | 5% |
| 空 | 10 | 无 | 15% |

#### UI 设计

```
┌─────────────────────────────────────┐
│                                     │
│    🏝️ 寻宝岛                        │
│    铲子: 🪏🪏🪏🪏🪏 (5/5)           │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │  ⬜ ⬜ ⬜ ⬜ ⬜              │    │
│  │  ⬜ ⬜ ⬜ ⬜ ⬜              │    │
│  │  ⬜ ⬜ ⭐ ⬜ ⬜              │    │  ← 已挖掘显示奖励
│  │  ⬜ ⬜ ⬜ ⬜ ⬜              │    │
│  │  ⬜ ⬜ ⬜ ⬜ ⬜              │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  已获得: 80 金币 + 💎1              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  💡 提示: 左上角有宝藏!     │    │  ← 付费提示
│  │  [ 🎬 看广告获得提示 ]       │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ 结束寻宝 ]  [ 🎬 +3 铲子 ]       │
│                                     │
└─────────────────────────────────────┘
```

#### 挖掘动画

```
未挖掘:     挖掘中:     挖到宝藏:    空地:
┌─────┐    ┌─────┐     ┌─────┐     ┌─────┐
│  ⬜ │ → │  💨 │ →  │  💰 │  或 │  🕳️ │
│     │    │     │     │ +50 │     │     │
└─────┘    └─────┘     └─────┘     └─────┘
```

#### 数据结构

```typescript
interface TreasureHuntConfig {
  gridSize: 5;
  initialShovels: 5;
  treasureMap: TreasureCell[][];
  hints: HintConfig[];
}

interface TreasureCell {
  type: 'empty' | 'common' | 'rare' | 'epic' | 'legendary';
  reward: Reward | null;
  isRevealed: boolean;
  hasHint: boolean;  // 是否被提示过
}

interface HintConfig {
  type: 'area' | 'direction' | 'exact';
  cost: { ad: boolean; gems?: number };
  description: string;
}

interface TreasureHuntState {
  grid: TreasureCell[][];
  shovelsRemaining: number;
  totalRewards: { coins: number; gems: number; boosters: string[] };
  hintsUsed: number;
}
```

#### 宝藏生成算法

```typescript
class TreasureMapGenerator {
  generate(): TreasureCell[][] {
    const grid: TreasureCell[][] = [];

    // 初始化空格子
    for (let r = 0; r < 5; r++) {
      grid[r] = [];
      for (let c = 0; c < 5; c++) {
        grid[r][c] = { type: 'empty', reward: null, isRevealed: false, hasHint: false };
      }
    }

    // 放置宝藏
    const treasures = this.generateTreasureList();
    const positions = this.getRandomPositions(treasures.length);

    for (let i = 0; i < treasures.length; i++) {
      const { row, col } = positions[i];
      grid[row][col] = treasures[i];
    }

    return grid;
  }

  private generateTreasureList(): TreasureCell[] {
    const treasures: TreasureCell[] = [];

    // 传说 x1
    treasures.push({
      type: 'legendary',
      reward: { booster: 'rainbow' },
      isRevealed: false,
      hasHint: false,
    });

    // 史诗 x2
    for (let i = 0; i < 2; i++) {
      treasures.push({
        type: 'epic',
        reward: { gems: this.randomInt(1, 3) },
        isRevealed: false,
        hasHint: false,
      });
    }

    // 稀有 x4
    for (let i = 0; i < 4; i++) {
      treasures.push({
        type: 'rare',
        reward: { coins: this.randomInt(50, 100) },
        isRevealed: false,
        hasHint: false,
      });
    }

    // 普通 x8
    for (let i = 0; i < 8; i++) {
      treasures.push({
        type: 'common',
        reward: { coins: this.randomInt(10, 30) },
        isRevealed: false,
        hasHint: false,
      });
    }

    return treasures;
  }
}
```

#### 核心代码

```typescript
class TreasureHuntMiniGame {
  private state: TreasureHuntState;

  constructor() {
    const generator = new TreasureMapGenerator();
    this.state = {
      grid: generator.generate(),
      shovelsRemaining: 5,
      totalRewards: { coins: 0, gems: 0, boosters: [] },
      hintsUsed: 0,
    };
  }

  dig(row: number, col: number): DigResult {
    if (this.state.shovelsRemaining <= 0) {
      return { type: 'no_shovels' };
    }

    const cell = this.state.grid[row][col];

    if (cell.isRevealed) {
      return { type: 'already_dug' };
    }

    // 消耗铲子
    this.state.shovelsRemaining--;
    cell.isRevealed = true;

    if (cell.type === 'empty') {
      return { type: 'empty' };
    }

    // 收集奖励
    this.addReward(cell.reward!);

    return {
      type: 'found',
      treasureType: cell.type,
      reward: cell.reward!,
    };
  }

  useHint(hintType: 'area' | 'direction'): HintResult {
    // 找到最近的高价值宝藏
    const bestTreasure = this.findBestUnrevealedTreasure();

    if (!bestTreasure) {
      return { type: 'no_treasure_left' };
    }

    if (hintType === 'area') {
      // 提示区域 (左上/右上/左下/右下)
      const area = this.getArea(bestTreasure.row, bestTreasure.col);
      return { type: 'area', hint: `宝藏在${area}区域` };
    } else {
      // 提示方向
      const direction = this.getDirection(bestTreasure.row, bestTreasure.col);
      return { type: 'direction', hint: `往${direction}方向挖!` };
    }
  }

  addShovels(count: number): void {
    this.state.shovelsRemaining += count;
  }

  getEndRewards(): TotalRewards {
    return this.state.totalRewards;
  }
}
```

---

## 迷你游戏管理器

### 统一调度

```typescript
class MiniGameManager {
  private activeGame: MiniGame | null = null;

  // 判断是否触发迷你游戏
  shouldTriggerMiniGame(context: GameContext): MiniGameTrigger | null {
    const { justWonLevel, winStreak, isFirstLogin, dayOfWeek } = context;

    // 每日登录 → 挖宝
    if (isFirstLogin) {
      return { type: 'treasure_hunt', reason: 'daily_login' };
    }

    // 连胜5 → 救援
    if (winStreak === 5) {
      return { type: 'rescue', reason: 'win_streak' };
    }

    // 通关后 30% 概率
    if (justWonLevel && Math.random() < 0.3) {
      const type = this.randomMiniGameType();
      return { type, reason: 'level_win' };
    }

    // 周末加成
    if ((dayOfWeek === 0 || dayOfWeek === 6) && Math.random() < 0.5) {
      const type = this.randomMiniGameType();
      return { type, reason: 'weekend_bonus' };
    }

    return null;
  }

  // 启动迷你游戏
  startMiniGame(type: MiniGameType): MiniGame {
    switch (type) {
      case 'rescue':
        const scenario = this.getRandomRescueScenario();
        this.activeGame = new RescueMiniGame(scenario);
        break;
      case 'color_sort':
        const difficulty = this.getDifficultyForPlayer();
        this.activeGame = new ColorSortMiniGame(difficulty);
        break;
      case 'treasure_hunt':
        this.activeGame = new TreasureHuntMiniGame();
        break;
    }

    this.activeGame.start();
    return this.activeGame;
  }

  // 迷你游戏结束
  onMiniGameEnd(result: MiniGameResult): void {
    // 发放奖励
    PlayerProgress.addRewards(result.rewards);

    // 埋点
    Analytics.track('minigame_completed', {
      type: result.gameType,
      success: result.success,
      reward: result.rewards,
      timeSpent: result.timeSpent,
    });

    this.activeGame = null;
  }
}
```

---

## 总结: 实现优先级

### 第一批 (2周)

| 功能 | 复杂度 | 留存影响 | 收入影响 |
|------|--------|----------|----------|
| 连胜系统 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 连胜复活 (广告) | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### 第二批 (2周)

| 功能 | 复杂度 | 留存影响 | 收入影响 |
|------|--------|----------|----------|
| 预置道具选择 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 失败推荐道具 | ⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| DDA 基础版 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

### 第三批 (4周)

| 功能 | 复杂度 | 留存影响 | 收入影响 |
|------|--------|----------|----------|
| 救援迷你游戏 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| 颜色排序游戏 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 挖宝寻宝游戏 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

*文档更新: 2025-12-27*
