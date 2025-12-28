# Change: Add Special Tiles Enhancement (特殊方块扩展)

## Why

当前游戏只有 3 种特殊方块（whirl_h、whirl_v、lantern），玩法单一。需要增加更多特殊方块类型以提升游戏深度，并添加随机出现机制和连消奖励生成机制。

## What Changes

- **ADDED**: 新特殊块类型（rainbow、wildcard、multiplier、frozen、bomb_timer）
- **ADDED**: 特殊块随机生成机制
- **ADDED**: T型/L型消除生成 rainbow 块
- **ADDED**: 特殊块组合效果（如行+列=十字）
- **MODIFIED**: MatchResolver 支持新特殊块触发效果

## Impact

- Affected specs: `special-tiles` (new)
- Affected code:
  - `assets/scripts/core/types.ts` - 扩展 SpecialType
  - `assets/scripts/core/MatchResolver.ts` - 新特殊块效果
  - `assets/scripts/core/MatchFinder.ts` - T型/L型检测
  - `demo/index.html` - 渲染新特殊块
