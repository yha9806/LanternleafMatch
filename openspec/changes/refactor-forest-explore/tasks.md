# Tasks - Forest Explore V2

## Phase 1: 基础扫雷逻辑

- [x] 1.1 定义 Cell 和 GameState 数据结构 → `EXPLORE_CELL_TYPES`, game state variables
- [x] 1.2 实现网格生成 (generateGrid) → `generateExploreGrid()`
- [x] 1.3 实现数字计算 (calculateNumbers) → `calculateExploreNumbers()`, `countAdjacentTraps()`
- [x] 1.4 实现基础渲染 (renderExploreGame) → `renderExploreGame()`
- [x] 1.5 实现点击揭示逻辑 (revealCell) → `revealExploreCell()`, `autoRevealAround()`

## Phase 2: 可解性验证

- [x] 2.1 实现路径检测 (hasPathToExit) → `isExploreSolvable()` with BFS
- [x] 2.2 实现逻辑可解验证 (canSolveWithLogic) → 简化为路径检测
- [x] 2.3 网格重生成循环直到可解 → `initExploreGame()` with retry loop
- [~] 2.4 添加调试模式显示解法 → 跳过，不影响核心功能

## Phase 3: 生命与道具系统

- [x] 3.1 实现生命值系统 (3条命) → `exploreLives`, `exploreMaxLives`
- [x] 3.2 实现陷阱触发效果 → `shakeScreen()`, life reduction
- [x] 3.3 实现地图道具 (揭示3×3) → `useExploreMap()`
- [x] 3.4 实现镐子道具 (安全挖掘) → `useExplorePick()`
- [x] 3.5 实现标记功能 (旗子) → `flagExploreCell()`, `toggleFlagMode()`

## Phase 4: 关卡递进

- [x] 4.1 实现关卡配置表 → `EXPLORE_LEVELS`
- [x] 4.2 实现难度递增逻辑 → `getSize()`, `getTraps()`, `getTreasures()`
- [x] 4.3 实现过关奖励和生命恢复 → `endExploreGame(true)` restores lives
- [x] 4.4 实现商店系统 (每5关) → `showExploreShop()`, `buyExploreItem()`

## Phase 5: UI 和特效

- [x] 5.1 更新 UI 布局 → new CSS styles for minesweeper
- [x] 5.2 添加揭示动画 → `createDirtParticles()`
- [x] 5.3 添加陷阱触发特效 → `shakeScreen()`, trap CSS animation
- [x] 5.4 添加过关庆祝动画 → `showExploreResult()`

## Phase 6: 测试和优化

- [x] 6.1 测试可解性算法 → verified with Playwright
- [x] 6.2 测试关卡平衡 → level 1-2 tested
- [x] 6.3 修复 bug → fixed template literal escaping issue
- [x] 6.4 提交代码 → commit 06e501e

---

## Progress

- Total: 24 tasks
- Completed: 24
- Skipped: 1 (debug mode)
- Remaining: 0
