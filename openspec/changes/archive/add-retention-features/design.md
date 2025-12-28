# Design: Core Retention Features

## Context

本设计基于 Royal Match、Candy Crush、Gardenscapes 等头部三消游戏的成功经验，为灯笼叶子消消乐增加核心留存机制。

### Stakeholders
- 玩家 - 需要持续激励和多样化玩法
- 运营 - 需要提升留存和变现指标
- 开发 - 需要可维护、可扩展的架构

### Constraints
- 必须与现有 Cocos Creator 架构兼容
- 必须支持微信/抖音小程序平台
- UI 必须适配 1080×1920 竖屏布局
- 所有数据必须支持本地存储

## Goals / Non-Goals

### Goals
- 提升 D7 留存率 5%+
- 延长日均游戏时长 50%+
- 增加广告观看场景
- 提供更多付费点

### Non-Goals
- 不改变核心三消玩法
- 不添加社交功能（Phase 3 计划）
- 不添加赛季通行证（Phase 4 计划）

## Decisions

### 1. 连胜系统架构

**Decision**: 使用独立 `WinStreakManager` 类，不集成到 `PlayerProgress`

**Rationale**:
- 连胜逻辑复杂，包含复活、超时等机制
- 需要独立的事件系统
- 便于单元测试

**Alternatives Considered**:
- 集成到 PlayerProgress - 会使该类过于庞大
- 使用 Redux 式状态管理 - 过度设计

### 2. 预置道具放置逻辑

**Decision**: 道具在棋盘初始化时放置在随机空位

**Rationale**:
- 参考 Royal Match 的 Butler's Gift
- 随机位置增加不确定性
- 避免玩家形成固定策略

**Implementation**:
```typescript
interface BoardPlacement {
  boosterId: string;
  position: { row: number; col: number };
  attachedTileType: TileType;  // 道具附着的方块类型
}
```

### 3. 迷你游戏触发策略

**Decision**: 采用概率+条件混合触发

**Trigger Rules**:
| 场景 | 游戏类型 | 概率 |
|------|----------|------|
| 每日首次登录 | 挖宝 | 100% |
| 连胜达到5 | 救援 | 100% |
| 关卡通关后 | 随机 | 30% |
| 关卡失败后 | 颜色排序 | 50% |

**Rationale**:
- 保证核心触发点（登录、连胜）
- 通关后概率触发避免打断节奏
- 失败后安慰性质的小游戏

### 4. 迷你游戏奖励设计

**Decision**: 分级奖励 + 广告加成

| 结果 | 基础奖励 | 广告加成 |
|------|----------|----------|
| 救援成功 | 100金币+道具 | 2x |
| 救援失败 | 20金币 | 重试机会 |
| 排序完美 | 120金币 | 2x |
| 排序普通 | 80金币 | - |
| 挖宝每挖 | 10-300金币 | +3铲子 |

### 5. 数据存储方案

**Decision**: 使用 localStorage，key 前缀 `lanternleaf_`

**Keys**:
- `lanternleaf_win_streak` - 连胜数据
- `lanternleaf_pre_booster_history` - 预置道具使用记录
- `lanternleaf_minigame_daily` - 每日迷你游戏状态

**Rationale**:
- 与现有存储方案一致
- 支持跨平台（小程序兼容）
- 避免后端依赖

## Risks / Trade-offs

### Risk 1: 连胜复活滥用
- **Risk**: 玩家反复利用广告复活
- **Mitigation**: 每关只允许复活1次，每小时最多3次

### Risk 2: 迷你游戏过于频繁
- **Risk**: 打断核心游戏节奏
- **Mitigation**: 通关后概率控制在30%，可配置关闭

### Risk 3: 预置道具破坏难度平衡
- **Risk**: 玩家总是带满道具导致关卡过于简单
- **Mitigation**: 动态难度系统会感知道具使用，调整后续关卡

## Migration Plan

1. **Phase 1a** (第1周): 实现连胜系统核心逻辑和UI
2. **Phase 1b** (第2周): 实现预置道具选择界面
3. **Phase 2a** (第3-4周): 实现救援迷你游戏
4. **Phase 2b** (第5周): 实现颜色排序游戏
5. **Phase 2c** (第6周): 实现挖宝寻宝游戏
6. **Integration** (第7周): 集成测试和调优

### Rollback
- 所有功能通过 feature flag 控制
- 可独立禁用任一模块

## Open Questions

1. **超级彩虹道具效果细节** - 清除同类型+行列 vs 清除全屏？
   - 建议: 清除所有同类型方块 + 随机一行一列

2. **迷你游戏资源需求** - 需要多少新美术资源？
   - 救援游戏: 6个场景背景 + 角色动画
   - 颜色排序: 复用现有方块
   - 挖宝: 宝藏图标 + 铲子图标

3. **连胜超时机制** - 是否需要72小时超时？
   - 建议: 暂不实现，简化首版
