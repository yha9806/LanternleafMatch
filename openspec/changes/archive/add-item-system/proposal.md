# Change: Add Item System (道具系统)

## Why

当前游戏只有一个无限制的"提示"按钮，缺乏完整的道具系统。玩家无法通过策略性使用道具来增强游戏体验，也缺少通过通关、看广告、签到等方式获取道具的激励机制。

## What Changes

- **ADDED**: 道具数据结构（提示、重排、锤子、清行、清列、爆破）
- **ADDED**: 道具库存管理系统
- **ADDED**: 道具使用次数限制（每关/冷却时间）
- **ADDED**: 道具获取机制（通关奖励、星级里程碑、广告奖励）
- **ADDED**: 道具 UI 组件（游戏内道具栏）
- **MODIFIED**: 提示按钮改为消耗道具

## Impact

- Affected specs: `item-system` (new)
- Affected code:
  - `assets/scripts/core/PlayerProgress.ts` - 扩展玩家数据结构
  - `assets/scripts/core/types.ts` - 添加道具类型定义
  - `demo/index.html` - 更新游戏 UI 和逻辑
  - `demo/menu.html` - 显示道具数量
