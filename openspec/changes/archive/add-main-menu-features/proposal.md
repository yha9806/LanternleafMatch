# Change: Add Main Menu Features (主菜单功能扩展)

## Why

当前主菜单只有"开始游戏"和"设置"两个按钮，缺少收藏馆、排行榜、皮肤、每日奖励等常见休闲游戏功能，影响玩家留存和参与度。

## What Changes

- **ADDED**: 排行榜功能（总星榜、周星榜、好友榜）
- **ADDED**: 收藏馆功能（明信片、成就、故事章节）
- **ADDED**: 每日签到奖励系统
- **ADDED**: 皮肤入口（P2，先预留位置）
- **ADDED**: 公告入口（P2，先预留位置）
- **ADDED**: 主菜单显示道具数量
- **ADDED**: 主菜单显示金币数量

## Impact

- Affected specs: `main-menu`, `daily-reward`, `leaderboard`, `collection` (all new)
- Affected code:
  - `demo/menu.html` - 新增按钮和布局
  - `assets/scripts/ui/MainMenuView.ts` - 扩展功能
  - `assets/scripts/core/PlayerProgress.ts` - 扩展数据结构
  - 新增页面：排行榜、收藏馆、签到
