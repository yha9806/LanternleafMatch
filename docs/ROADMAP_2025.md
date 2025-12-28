# 灯笼叶子消消乐 - 2025 产品路线图

> 基于 Royal Match、Candy Crush、Gardenscapes 等头部三消游戏的设计分析

---

## 一、市场洞察

### 1.1 行业数据 (2024-2025)

| 指标 | 数值 | 来源 |
|------|------|------|
| 三消游戏年收入 | $2.7B (2025 H1) | AppMagic |
| Royal Match 年收入 | $1.4B (2024) | 行业报告 |
| Candy Crush 年收入 | $1.24B (2024) | 行业报告 |
| 三消游戏 D1 留存 | 24% | GameAnalytics |
| 三消游戏 D7 留存 | 20%+ (良好) | GameAnalytics |
| 三消游戏 D30 留存 | 5% | GameAnalytics |

### 1.2 成功游戏的核心特征

| 游戏 | 创新点 | 值得借鉴 |
|------|--------|----------|
| **Royal Match** | 迷你游戏、无限尝试、5种基础块 | 降低复杂度、增加趣味性 |
| **Gardenscapes** | 故事元层、装修玩法 | 情感连接、长线目标 |
| **Candy Crush** | 近似胜利、社交压力 | 付费点设计、病毒传播 |

---

## 二、当前项目 vs 行业标杆

### 2.1 已实现功能 ✅

| 模块 | 状态 | 完成度 |
|------|------|--------|
| 核心三消机制 | ✅ 完成 | 100% |
| 特殊块 (whirl/lantern/rainbow) | ✅ 完成 | 100% |
| 体力系统 | ✅ 完成 | 100% |
| 关卡生成 (50关) | ✅ 完成 | 100% |
| 基础 UI (7个页面) | ✅ 完成 | 100% |
| 每日签到 | ✅ 完成 | 100% |
| 排行榜 (静态) | ✅ 完成 | 80% |
| 收藏系统 | ✅ 完成 | 80% |

### 2.2 缺失功能 ❌ (与头部游戏对比)

| 功能 | 重要性 | Royal Match | 我们 | 差距 |
|------|--------|-------------|------|------|
| **迷你游戏** | P0 | ✅ 10+ 种 | ❌ 无 | 严重 |
| **团队战** | P0 | ✅ 周赛 | ❌ 无 | 严重 |
| **赛季通行证** | P0 | ✅ 有 | ❌ 无 | 严重 |
| **连胜系统** | P1 | ✅ 有 | ❌ 无 | 中等 |
| **实时活动** | P1 | ✅ 10+ 并行 | ❌ 无 | 中等 |
| **预置道具** | P1 | ✅ 有 | ❌ 无 | 中等 |
| **社交赠送** | P2 | ✅ 有 | ❌ 无 | 轻微 |
| **公会系统** | P2 | ✅ 有 | ❌ 无 | 轻微 |

---

## 三、功能优先级矩阵

```
                    高留存价值
                        ↑
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │  P2: 社交赠送     │  P0: 迷你游戏     │
    │  P2: 公会聊天     │  P0: 团队战       │
    │                   │  P0: 赛季通行证   │
    │                   │                   │
    ├───────────────────┼───────────────────┤
    │                   │                   │
    │  P3: 皮肤系统     │  P1: 连胜系统     │
    │  P3: 好友列表     │  P1: 实时活动     │
    │                   │  P1: 预置道具     │
    │                   │                   │
    └───────────────────┴───────────────────┘
   低开发成本 ←─────────────────────────→ 高开发成本
```

---

## 四、开发路线图

### Phase 1: 核心留存 (4-6 周)

> 目标: D7 留存从 15% 提升到 22%

#### 1.1 连胜系统 (Win Streak)

```typescript
interface WinStreak {
  currentStreak: number;      // 当前连胜
  maxStreak: number;          // 历史最高
  bonusMultiplier: number;    // 奖励加成 (1.0 → 2.0)
  streakRewards: {
    3: { coins: 50 },         // 3连胜奖励
    5: { gems: 5 },           // 5连胜奖励
    10: { booster: 'rocket' } // 10连胜奖励
  };
}
```

**设计要点**:
- 连胜 3/5/10 时弹出庆祝动画
- 连胜断裂时给"复活机会"(看广告保留连胜)
- 连胜越高，关卡难度微调 (动态难度)

#### 1.2 预置道具 (Pre-Boosters)

```typescript
interface PreBooster {
  id: 'extra_moves' | 'rocket_start' | 'bomb_start';
  name: string;
  description: string;
  cost: { coins?: number; gems?: number; ad?: boolean };
  effect: BoosterEffect;
}

// 关卡开始前选择
const PRE_BOOSTERS = [
  { id: 'extra_moves', name: '+5 步', cost: { coins: 100 } },
  { id: 'rocket_start', name: '开局火箭', cost: { gems: 5 } },
  { id: 'bomb_start', name: '开局炸弹', cost: { gems: 8 } },
];
```

**设计要点**:
- 失败 2 次后自动推荐
- 首次使用免费体验
- 与激励广告结合 (看广告免费用一次)

#### 1.3 动态难度调整 (DDA)

```typescript
interface DynamicDifficulty {
  // 输入指标
  recentWinRate: number;       // 近 10 关胜率
  currentStreak: number;       // 当前连胜/连败
  sessionLength: number;       // 本次游戏时长

  // 调整参数
  moveAdjustment: number;      // 步数调整 (-2 ~ +3)
  spawnBias: number;           // 有利块生成偏向
  cascadeProbability: number;  // 连消概率调整
}
```

**设计要点**:
- 连败 3 次 → 悄悄增加 2 步
- 首次玩家 → 开局保证有匹配
- 付费用户 → 更宽松的胜率目标

---

### Phase 2: 迷你游戏 (6-8 周)

> 目标: 每日活跃时长从 8 分钟提升到 15 分钟

#### 2.1 救援迷你游戏 (类 Royal Match)

```typescript
interface RescueMiniGame {
  type: 'rescue';
  scenario: 'king_falling' | 'cat_stuck' | 'treasure_flood';
  timeLimit: 10;  // 秒
  correctAnswer: number;  // 正确选项索引
  rewards: { coins: 50 };
}
```

**场景设计** (匹配我们的猫狗主题):
1. 小猫被困树上 → 选择正确的梯子
2. 小狗追蝴蝶 → 选择正确的路径
3. 宝箱进水 → 选择正确的阀门

#### 2.2 颜色排序迷你游戏

```typescript
interface ColorSortMiniGame {
  type: 'color_sort';
  colors: TileType[];     // 乱序的颜色数组
  correctOrder: TileType[];
  attempts: 3;
  rewards: { coins: 30, booster?: string };
}
```

#### 2.3 挖宝迷你游戏

```typescript
interface TreasureHuntMiniGame {
  type: 'treasure_hunt';
  gridSize: 5x5;
  hiddenRewards: Array<{ position: [number, number]; reward: Reward }>;
  shovels: number;  // 可挖掘次数
}
```

---

### Phase 3: 团队系统 (8-10 周)

> 目标: 社交活跃用户占比从 0% 提升到 30%

#### 3.1 团队基础架构

```typescript
interface Team {
  id: string;
  name: string;
  emblem: string;           // 队徽
  level: number;
  members: TeamMember[];    // 最多 50 人
  settings: {
    isPublic: boolean;
    minLevel: number;       // 加入门槛
    language: string;
  };
}

interface TeamMember {
  playerId: string;
  role: 'leader' | 'elder' | 'member';
  joinedAt: Date;
  contribution: number;     // 本周贡献
  lastActive: Date;
}
```

#### 3.2 团队战 (Team Battle)

```typescript
interface TeamBattle {
  id: string;
  startTime: Date;
  endTime: Date;            // 持续 3 天
  participants: Team[];     // 20 支队伍
  leaderboard: Array<{
    teamId: string;
    shields: number;        // 通关获得盾牌
  }>;
  rewards: {
    rank1: { gems: 100, coins: 5000 };
    rank2_3: { gems: 50, coins: 3000 };
    rank4_10: { gems: 20, coins: 1000 };
  };
}
```

**设计要点**:
- 每周五开始，周一结束
- 通关获得盾牌，团队总盾牌排名
- 实时更新排行榜，营造紧迫感

#### 3.3 团队聊天

```typescript
interface TeamChat {
  messages: ChatMessage[];
  stickers: Sticker[];      // 表情包
  quickMessages: string[];  // 快捷消息
}

// 快捷消息示例
const QUICK_MESSAGES = [
  '加油！',
  '求助！',
  '我通关了！',
  '团队战开始了！',
];
```

---

### Phase 4: 赛季通行证 (4-6 周)

> 目标: ARPDAU 从 $0.02 提升到 $0.05

#### 4.1 通行证结构

```typescript
interface SeasonPass {
  seasonId: string;
  theme: string;            // '春日森林' | '夏日海滩' | ...
  startDate: Date;
  endDate: Date;            // 30 天一季

  tiers: PassTier[];        // 30 层

  freeTrack: Reward[];      // 免费轨道
  premiumTrack: Reward[];   // 付费轨道

  price: { usd: 4.99 };
}

interface PassTier {
  level: number;
  xpRequired: number;
  freeReward: Reward;
  premiumReward: Reward;
}
```

#### 4.2 XP 获取方式

| 行为 | XP 获得 |
|------|---------|
| 通关关卡 | 10 XP |
| 3 星通关 | +5 XP |
| 每日首胜 | +20 XP |
| 完成每日任务 | 15-30 XP |
| 团队战贡献 | 5-50 XP |
| 迷你游戏 | 5-10 XP |

#### 4.3 奖励设计

| 层级 | 免费轨道 | 付费轨道 |
|------|----------|----------|
| 1 | 50 金币 | 100 金币 + 专属头像框 |
| 5 | 1 道具 | 3 道具 + 主题表情 |
| 10 | 100 金币 | 5 宝石 + 专属皮肤碎片 |
| 15 | 2 道具 | 专属棋盘皮肤 |
| 20 | 200 金币 | 10 宝石 + 专属特效 |
| 25 | 3 道具 | 专属明信片 |
| 30 | 500 金币 | 专属称号 + 全套皮肤 |

---

### Phase 5: 实时活动 (持续)

> 目标: 建立持续的运营节奏

#### 5.1 活动日历

| 周期 | 活动 | 类型 |
|------|------|------|
| 每日 | 每日任务 | 任务 |
| 每日 | 迷你游戏 | 互动 |
| 周一-周五 | 限时挑战 | 竞技 |
| 周五-周一 | 团队战 | 社交 |
| 每月 | 赛季通行证 | 长线 |
| 节假日 | 主题活动 | 营销 |

#### 5.2 限时挑战

```typescript
interface TimedChallenge {
  id: string;
  name: string;
  description: string;
  duration: number;         // 小时
  goal: ChallengeGoal;      // 收集 100 个叶子
  rewards: Reward[];
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

## 五、技术架构升级

### 5.1 后端服务需求

| 服务 | 用途 | 优先级 |
|------|------|--------|
| 用户系统 | 账号、存档同步 | P0 |
| 排行榜服务 | 实时排名 | P0 |
| 团队服务 | 创建/加入/战斗 | P1 |
| 活动服务 | 活动配置下发 | P1 |
| 聊天服务 | 团队聊天 | P2 |
| 推送服务 | 活动提醒 | P2 |

### 5.2 数据埋点扩展

```typescript
interface ExtendedAnalytics {
  // 留存相关
  streak_started: { streak_count: number };
  streak_broken: { final_count: number; revival_shown: boolean };
  streak_revived: { method: 'ad' | 'gems' };

  // 迷你游戏
  minigame_started: { type: string };
  minigame_completed: { type: string; success: boolean; time: number };

  // 团队
  team_joined: { team_id: string; member_count: number };
  team_battle_started: { team_rank: number };
  team_battle_contributed: { shields: number };

  // 通行证
  pass_tier_reached: { tier: number; is_premium: boolean };
  pass_purchased: { price: number; tier_at_purchase: number };
}
```

---

## 六、ROI 预估

### 6.1 留存提升预估

| 功能 | D1 影响 | D7 影响 | D30 影响 |
|------|---------|---------|----------|
| 连胜系统 | +2% | +3% | +1% |
| 迷你游戏 | +3% | +5% | +2% |
| 团队战 | +1% | +4% | +3% |
| 通行证 | +1% | +2% | +2% |
| **总计** | **+7%** | **+14%** | **+8%** |

### 6.2 收入提升预估

| 功能 | ARPDAU 影响 | 月收入影响 (10万 DAU) |
|------|-------------|----------------------|
| 预置道具 | +$0.005 | +$15,000 |
| 通行证 | +$0.015 | +$45,000 |
| 团队礼包 | +$0.008 | +$24,000 |
| 活动礼包 | +$0.012 | +$36,000 |
| **总计** | **+$0.04** | **+$120,000/月** |

---

## 七、里程碑时间线

```
2025 Q1 (已完成)
├── ✅ 核心三消机制
├── ✅ 体力系统
├── ✅ 基础 UI
└── ✅ 每日签到

2025 Q2 (进行中)
├── 🔄 连胜系统
├── 🔄 预置道具
├── 🔄 动态难度
└── 📋 迷你游戏设计

2025 Q3
├── 📋 迷你游戏实现 (3种)
├── 📋 团队系统基础
├── 📋 团队战 MVP
└── 📋 实时排行榜

2025 Q4
├── 📋 赛季通行证
├── 📋 实时活动框架
├── 📋 团队聊天
└── 📋 节日活动 (圣诞/新年)

图例: ✅ 完成 | 🔄 进行中 | 📋 计划中
```

---

## 八、参考资料

### 8.1 行业报告
- [Casual Games Report H1 2025 - AppMagic](https://appmagic.rocks/research/casual-report-h1-2025)
- [Match-3 Games Metrics Guide - GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide)
- [Royal Match Mini Games Success 2025 - FoxData](https://foxdata.com/en/blogs/royal-matchs-mini-games-the-secret-driving-its-global-success-in-2025/)

### 8.2 设计分析
- [The Royal Crush: Analysis of Match-3 Mechanics (学术论文)](https://downloads.hci.informatik.uni-wuerzburg.de/2024-CoG-RoyalCrush.pdf)
- [Royal Match Level Design Analysis - Medium](https://pratama-naufal.medium.com/what-makes-royal-match-so-good-level-design-1d82ca2e3b11)
- [Match-3 Games Features Full Breakdown - Gamigion](https://www.gamigion.com/match-3-games-features-full-breakdown/)

### 8.3 留存与变现
- [Progression Systems in Mobile Games - Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/progression-systems)
- [Leaderboard Design Guide - Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/leaderboards)
- [Mobile Game Level Design - Sunday](https://sunday.gg/mobile-game-level-design-key-considerations-for-ad-monetized-casual-mobile-games/)

---

*文档生成时间: 2025-12-27*
*基于市场调研和竞品分析*
