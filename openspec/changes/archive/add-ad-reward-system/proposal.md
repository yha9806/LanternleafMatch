# Change: Add Ad Reward System (广告奖励系统)

## Why

当前广告入口仅在体力不足时出现，缺少其他广告奖励机会。需要增加多个广告入口点，让玩家有更多机会通过看广告获取资源，同时增加游戏变现能力。

## What Changes

- **ADDED**: 主菜单免费体力按钮
- **ADDED**: 关卡内续命广告（+3步）
- **ADDED**: 道具商店广告换道具
- **ADDED**: 通关双倍奖励广告
- **ADDED**: 每日签到双倍广告
- **ADDED**: 广告观看次数限制管理

## Impact

- Affected specs: `ad-reward` (new)
- Affected code:
  - `demo/menu.html` - 添加免费体力按钮
  - `demo/index.html` - 添加续命和双倍奖励
  - `assets/scripts/core/EnergyManager.ts` - 扩展广告限制
  - 新增广告管理模块
