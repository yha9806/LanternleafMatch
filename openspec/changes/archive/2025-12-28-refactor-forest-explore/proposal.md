# Refactor Forest Explore - Minesweeper-Based Redesign

## Summary

将森林探索迷你游戏从纯随机挖掘改为基于扫雷的逻辑推理玩法，提升可玩性和重玩价值。

## Why

当前森林探索存在的问题：
1. **纯随机** - 玩家无法通过技巧影响结果
2. **无策略深度** - 缺乏逻辑推理元素
3. **重玩价值低** - 每局体验相似

## What Changes

- `demo/minigames.html` - 重构 Forest Explore 游戏逻辑
- 新增扫雷式网格生成和数字提示系统
- 新增 BFS 可解性验证算法
- 新增生命系统、道具系统、关卡递进、商店系统

## Design Goals

1. **可推理** - 玩家可通过数字提示推断陷阱位置
2. **保证可解** - 算法确保每局都有安全路径
3. **渐进难度** - 关卡递进系统
4. **道具策略** - 增加决策深度

## Reference Games

- Microsoft Treasure Hunt - 扫雷+冒险+收集
- Hexcells - 100%可推理、无需猜测
- Mine Forest - 森林主题+治愈风格

## Scope

### In Scope
- 扫雷式网格生成
- 可解性验证算法
- 生命值系统
- 道具系统（地图、镐子、标记）
- 关卡递进（5×5 到 9×9）
- 商店系统

### Out of Scope
- 动物伙伴收集系统（后续迭代）
- 云存档
- 排行榜

## Success Metrics

- 平均游戏时长提升 200%
- 重玩率提升 150%
- 玩家可通过逻辑推理完成关卡

## Timeline

- Phase 1: 基础扫雷逻辑 (~2h)
- Phase 2: 可解性算法 (~3h)
- Phase 3: 道具和关卡系统 (~3h)
- Phase 4: 测试和优化 (~2h)

Total: ~10h
