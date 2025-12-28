# Change: Add Core Retention Features (Phase 1 & Phase 2)

## Why

当前游戏缺少关键的留存机制，与头部三消游戏（Royal Match、Candy Crush）相比存在明显差距：
- 没有连胜系统激励持续游玩
- 没有关卡开始前的道具选择流程
- 没有迷你游戏增加游戏多样性

根据行业数据：
- 连胜系统可提升 D7 留存 3-5%
- 迷你游戏可延长日均游戏时长 50%+
- 预置道具可提升 ARPDAU 25%+

## What Changes

### Phase 1: 核心留存

1. **连胜系统 (Win Streak)**
   - 连续通关获得递增奖励
   - 连胜 3/5/7/10 解锁预置道具奖励
   - 失败时提供"保留连胜"选项（看广告/花宝石）
   - 超级彩虹道具（10连胜专属）

2. **预置道具系统 (Pre-Boosters)**
   - 关卡开始前选择携带道具
   - 支持：+3步、+5步、火箭、炸弹、彩虹、洗牌
   - 连胜奖励的道具自动放入
   - 失败后智能推荐道具组合

### Phase 2: 迷你游戏

3. **救援游戏 (Rescue Mini Game)**
   - 10秒限时选择正确选项
   - 6个猫狗主题场景
   - 成功/失败分级奖励

4. **颜色排序 (Color Sort)**
   - 按正确顺序点击彩色方块
   - 简单/中等/困难三档难度
   - 允许2次错误

5. **挖宝寻宝 (Treasure Hunt)**
   - 5x5 格子探索
   - 初始5把铲子
   - 传说/史诗/稀有/普通四档宝藏
   - 看广告获得额外铲子

6. **迷你游戏调度器**
   - 每日登录、连胜、通关后触发
   - 统一奖励发放

## Impact

### Affected Specs (新建)
- `win-streak` - 连胜系统规格
- `pre-boosters` - 预置道具规格
- `mini-games` - 迷你游戏规格

### Affected Code
- `assets/scripts/core/WinStreakManager.ts` (新建)
- `assets/scripts/core/PreBoosterManager.ts` (新建)
- `assets/scripts/minigames/` (新建目录)
  - `MiniGameManager.ts`
  - `RescueMiniGame.ts`
  - `ColorSortMiniGame.ts`
  - `TreasureHuntMiniGame.ts`
- `assets/scripts/ui/WinStreakUI.ts` (新建)
- `assets/scripts/ui/PreBoosterSelectUI.ts` (新建)
- `assets/scripts/ui/MiniGameUI.ts` (新建)
- `demo/` - HTML 演示页面更新

### Dependencies
- 现有 `BoosterManager` - 道具库存管理
- 现有 `RewardedAdManager` - 广告系统
- 现有 `PlayerProgress` - 玩家进度
- 现有 `DynamicDifficulty` - 动态难度（将集成）

### Non-Breaking
所有更改为新增功能，不影响现有系统行为。
