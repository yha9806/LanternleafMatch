# 三消游戏设计深度研究

基于对 Candy Crush、Royal Match 等头部产品的研究，总结核心设计原则和优化方向。

## 一、为什么三消游戏让人上瘾？

### 1.1 心理学原理

#### 多巴胺奖励循环 (Dopamine Loop)
- **预期阶段**：玩家期待消除时，大脑已开始分泌多巴胺
- **行动阶段**：滑动交换产生即时反馈
- **奖励阶段**：消除动画、音效、分数飙升带来满足感
- **关键洞察**：多巴胺在"预期"阶段分泌最多，而非奖励本身

#### 可变奖励 (Variable Rewards)
```
固定奖励：每次消除 +10 分 → 很快厌倦
可变奖励：连消 3→5→8 倍得分 + 随机特殊块 → 持续兴奋
```

#### 近失效应 (Near-Miss Effect)
- 2009 年《Neuron》期刊研究：差一点成功激活与真正成功相同的脑区
- 玩家差 1-2 步失败时，购买"续命"意愿最强
- **设计应用**：关卡设计要让玩家经常"差一点"完成

#### 强迫症倾向 (OCD-like Tendencies)
- 人类天生追求秩序和完整性
- 看到杂乱的棋盘会产生整理冲动
- 消除后整齐排列带来的满足感

### 1.2 留存核心公式

```
留存率 = 成就感 × 社交压力 × 习惯养成
         ────────────────────────────
              挫败感 × 付费压力
```

## 二、关卡设计要诀

### 2.1 难度曲线 (Difficulty Curve)

参考 Royal Match 的设计：

| 关卡段 | 步数 | 平均尝试次数 | 设计目的 |
|--------|------|--------------|----------|
| 1-20   | 30-38 | 1.0-1.1 | 建立信心 |
| 21-60  | 25-30 | 1.2-1.4 | 逐步挑战 |
| 61-100 | 23-27 | 1.4-1.8 | 核心体验 |
| 硬关卡 | 20-25 | 2.0-2.5 | 变现节点 |

**蛇形曲线设计**：
```
难度
  ↑
  │    ╱╲      ╱╲
  │   ╱  ╲    ╱  ╲
  │  ╱    ╲  ╱    ╲
  │ ╱      ╲╱      ╲
  └─────────────────→ 关卡
     休息  难关  休息
```

### 2.2 新手引导黄金法则

**前 10 分钟决定留存**：
1. 第 1-3 关：必须 100% 成功，无需思考
2. 机制逐个引入，每关只教一个新东西
3. 大量正向反馈：粒子、音效、庆祝动画
4. **关键**：不要在新手期扣体力

### 2.3 Near-Miss 变现设计

当玩家失败时：
```typescript
if (goalProgress >= goalTotal * 0.9) {
  // 差一点就赢了！
  showExtraMovesOffer({
    moves: 5,
    discount: 0.5,  // 首次 50% 折扣
    countdown: 10   // 10 秒倒计时制造紧迫感
  });
}
```

## 三、道具系统设计

### 3.1 道具分类

| 类型 | 获取方式 | 使用场景 | 变现贡献 |
|------|----------|----------|----------|
| 提示 | 每日免费 3 次 | 任何时候 | 低 |
| 洗牌 | 广告/库存 | 无解时 | 中 |
| 锤子 | 广告/购买 | 关键消除 | 高 |
| 续命 | 仅失败时 | 近失时刻 | 最高 |

### 3.2 道具经济设计

```
新手奖励（前 10 关）:
- 锤子 x3
- 洗牌 x5
- 提示 x10

日常获取:
- 每日登录: 随机道具 x1-3
- 看广告: 指定道具 x1
- 连胜奖励: 每连续赢 5 关送道具

消耗场景:
- 主动使用
- 失败时推荐
- 开局预装（高级功能）
```

### 3.3 广告触发时机

**好的触发点**：
- 道具用完时，柔和提示"看广告获取"
- 关卡失败后，提供广告续命选项
- 每日首次登录，奖励广告

**差的触发点**：
- 游戏中途强制插入
- 连续多次弹窗
- 无法跳过的广告

## 四、Meta 层设计

### 4.1 成功案例分析

| 游戏 | Meta 类型 | 效果 |
|------|-----------|------|
| Gardenscapes | 装修花园 | 长线目标，情感投入 |
| Royal Match | 装饰皇宫 | 任务驱动，进度可视 |
| Homescapes | 故事剧情 | 情感连接，追更心理 |

### 4.2 灯笼叶子的 Meta 建议

**短期（低成本）**：
- 收集系统：通关解锁明信片/壁纸
- 每日任务：消除 X 个、使用道具、连续登录

**中期（中等成本）**：
- 章节故事：猫狗的日常小故事
- 季节活动：节日限定关卡和皮肤

**长期（高成本）**：
- 家园装修：解锁装饰猫狗的小屋
- 角色收集：解锁不同动物伙伴

## 五、提示系统优化

### 5.1 自动提示设计

```typescript
const HINT_CONFIG = {
  // 无操作 X 秒后显示提示
  idleTimeToHint: 8,

  // 提示动画持续时间
  hintDuration: 2,

  // 提示后的冷却时间
  hintCooldown: 5,

  // 是否高亮最优解
  showBestMove: true,

  // 连续无进展后强制提示
  forcedHintAfterMoves: 5
};
```

### 5.2 提示优先级

1. **特殊块可形成** → 最高优先级
2. **目标物可消除** → 次高优先级
3. **连消潜力大** → 中等优先级
4. **任意有效移动** → 最低优先级

## 六、留存策略

### 6.1 D1 留存（次日）

**目标**：35-40%

- 新手引导流畅
- 前 10 关无挫败
- 明确的进度目标
- 次日登录奖励预告

### 6.2 D7 留存（周）

**目标**：15-20%

- 周任务/周奖励
- 好友排行榜
- 新章节解锁
- 累计登录奖励

### 6.3 D30 留存（月）

**目标**：5-8%

- 月度活动
- 赛季系统
- 成就系统
- 收藏进度

## 七、开源资源参考

### 7.1 Cocos Creator 三消项目

| 项目 | 地址 | 特点 |
|------|------|------|
| Match3-algorithm-TS | [GitHub](https://github.com/AlexKutepov/Match3-algorithm-TS-Cocos-creator) | TypeScript 算法实现 |
| Match-3 Always Move | [GitHub](https://github.com/Ghamza-Jd/Match-3) | "始终有解"算法 |
| Z Game Kit | [GitHub](https://github.com/SpeedPHP/zgame) | Cocos 3.x 开发框架 |

### 7.2 其他资源

- [Cocos Store 三消模板](https://store.cocos.com/)
- [Unity Match-3 Complete Kit](https://assetstore.unity.com/) - 参考设计
- [GameRefinery 分析报告](https://www.gamerefinery.com/) - 市场数据

## 八、灯笼叶子优化建议

### 8.1 立即可做（本周）

1. **道具 UI 优化**
   - 显示剩余次数
   - 无库存时显示"看广告获取"按钮
   - 使用时有确认动画

2. **自动提示**
   - 8 秒无操作显示提示
   - 高亮可消除位置
   - 优先提示目标物

3. **Near-Miss 续命**
   - 失败且进度 >80% 时触发
   - 提供 5 步续命选项
   - 首次免费或广告获取

### 8.2 短期规划（2 周）

1. **难度曲线调优**
   - 数据埋点分析失败率
   - 调整高失败关卡的步数
   - 增加硬关卡前的"休息关"

2. **社交系统**
   - 好友列表
   - 关卡排行榜
   - 请求/赠送体力

3. **每日任务**
   - 3-5 个简单任务
   - 完成奖励道具/体力
   - 全部完成额外奖励

### 8.3 中期规划（1 个月）

1. **收藏系统**
   - 通关解锁明信片
   - 收集进度可视化
   - 分享功能

2. **章节故事**
   - 每 20 关一个章节
   - 简单的猫狗小故事
   - 章节完成奖励

3. **季节活动**
   - 限时关卡
   - 特殊皮肤
   - 活动道具

## 九、核心指标追踪

| 指标 | 目标 | 当前 | 优化方向 |
|------|------|------|----------|
| D1 留存 | 40% | - | 新手体验 |
| D7 留存 | 18% | - | 社交+任务 |
| ARPDAU | ¥0.3 | - | 广告+道具 |
| 人均关卡/天 | 8 | - | 体验流畅度 |
| 广告观看率 | 30% | - | 奖励吸引力 |
| 付费转化 | 3% | - | 道具价值 |

## 参考资料

- [Match-3 Games: What Makes Them Fun and Addictive?](http://renatus.com/match-3-games-what-makes-fun-and-addictive)
- [Candy Crush Saga: A Sweet Journey into Monetization](https://www.gamedeveloper.com/design/candy-crush-saga-a-sweet-journey-into-monetization)
- [How Difficulty Curve Increases Retention in Royal Match](https://playliner.com/tpost/l8zzrb9el1-how-difficulty-curve-increases-retention)
- [The Near Miss Effect and Game Rewards](https://www.psychologyofgames.com/2016/09/the-near-miss-effect-and-game-rewards/)
- [Compulsion Loops & Dopamine in Games](https://www.gamedeveloper.com/design/compulsion-loops-dopamine-in-games-and-gamification)
- [Royal Match Game Analysis](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b)
- [三消游戏设计分析 - 机核](https://www.gcores.com/articles/184271)
