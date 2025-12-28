# Change: Add Combo Reward System (连消奖励系统)

## Why

当前连消只显示文字提示（如"连消 x3!"），没有实质奖励。需要添加连消奖励机制，在达到一定连消次数时自动生成特殊方块，增加游戏策略深度和趣味性。

## What Changes

- **ADDED**: 连消次数追踪
- **ADDED**: 连消奖励特殊块生成
- **ADDED**: 连消视觉反馈增强
- **ADDED**: 连消统计记录

## Impact

- Affected specs: `combo-reward` (new)
- Affected code:
  - `assets/scripts/core/MatchResolver.ts` - 添加连消奖励逻辑
  - `demo/index.html` - 增强连消视觉效果和奖励生成
  - `assets/scripts/core/types.ts` - 添加连消相关类型
