# Tasks: Core Retention Features

## 1. Win Streak System (连胜系统)

### 1.1 Core Logic
- [x] 1.1.1 Create `WinStreakManager.ts` with streak tracking
- [x] 1.1.2 Implement streak reward calculation (coins/gems/boosters)
- [x] 1.1.3 Implement streak revival logic (ad/gems options)
- [x] 1.1.4 Add Super Rainbow booster type for 10+ streak
- [x] 1.1.5 Integrate with `PlayerProgress` for level completion events

### 1.2 UI Components
- [x] 1.2.1 Create streak counter display for HUD
- [x] 1.2.2 Create level complete modal with streak rewards
- [x] 1.2.3 Create streak loss warning modal with revival options
- [x] 1.2.4 Add streak milestone celebration animations

### 1.3 Demo Integration
- [x] 1.3.1 Update `demo/retention-demo.html` with win streak UI
- [x] 1.3.2 Add streak state simulation for testing

### 1.4 Tests
- [x] 1.4.1 Unit tests for `WinStreakManager`
- [x] 1.4.2 E2E test for streak flow (see `e2e/tests/retention.test.ts`)

---

## 2. Pre-Boosters System (预置道具)

### 2.1 Core Logic
- [x] 2.1.1 Create `PreBoosterManager.ts` for selection management
- [x] 2.1.2 Implement booster placement on board initialization
- [x] 2.1.3 Integrate streak rewards as free pre-boosters
- [x] 2.1.4 Implement smart recommendation after failures

### 2.2 UI Components
- [x] 2.2.1 Create pre-level booster selection screen
- [x] 2.2.2 Add booster item cards with prices
- [x] 2.2.3 Create "Start Level" confirmation with selected boosters
- [x] 2.2.4 Create failure recommendation popup

### 2.3 Demo Integration
- [x] 2.3.1 Add pre-booster selection screen to demo flow
- [x] 2.3.2 Show placed boosters on demo board preview

### 2.4 Tests
- [x] 2.4.1 Unit tests for `PreBoosterManager`
- [x] 2.4.2 E2E test for booster selection flow (see `e2e/tests/retention.test.ts`)

---

## 3. Rescue Mini Game (救援游戏)

### 3.1 Core Logic
- [x] 3.1.1 Create `RescueMiniGame.ts` with scenario system
- [x] 3.1.2 Define 6 cat/dog rescue scenarios
- [x] 3.1.3 Implement 10-second timer logic
- [x] 3.1.4 Implement success/failure result handling

### 3.2 UI Components
- [x] 3.2.1 Create rescue game modal/overlay
- [x] 3.2.2 Add countdown timer display
- [x] 3.2.3 Create option buttons (3 choices)
- [x] 3.2.4 Add result animations (success celebration / failure comfort)

### 3.3 Assets (placeholder for now)
- [x] 3.3.1 Define scenario background placeholders (see `docs/MINIGAME_ASSETS.md`)
- [x] 3.3.2 Define character sprite requirements (see `docs/MINIGAME_ASSETS.md`)

### 3.4 Tests
- [x] 3.4.1 Unit tests for `RescueMiniGame`

---

## 4. Color Sort Mini Game (颜色排序)

### 4.1 Core Logic
- [x] 4.1.1 Create `ColorSortMiniGame.ts` with difficulty levels
- [x] 4.1.2 Implement shuffle algorithm
- [x] 4.1.3 Implement selection validation
- [x] 4.1.4 Add mistake tracking (max 2 mistakes)

### 4.2 UI Components
- [x] 4.2.1 Create color sort game modal
- [x] 4.2.2 Display target order and shuffled tiles
- [x] 4.2.3 Show selection progress indicator
- [x] 4.2.4 Add timer display

### 4.3 Tests
- [x] 4.3.1 Unit tests for `ColorSortMiniGame`

---

## 5. Treasure Hunt Mini Game (挖宝寻宝)

### 5.1 Core Logic
- [x] 5.1.1 Create `TreasureHuntMiniGame.ts`
- [x] 5.1.2 Implement treasure map generator
- [x] 5.1.3 Implement shovel management (dig + ad reward)
- [x] 5.1.4 Implement hint system (area/direction)

### 5.2 UI Components
- [x] 5.2.1 Create 5x5 grid treasure map UI
- [x] 5.2.2 Add shovel counter display
- [x] 5.2.3 Create dig animation and reveal effect
- [x] 5.2.4 Add "get more shovels" ad button (hint button)

### 5.3 Tests
- [x] 5.3.1 Unit tests for `TreasureHuntMiniGame`

---

## 6. Mini Game Manager (迷你游戏调度)

### 6.1 Core Logic
- [x] 6.1.1 Create `MiniGameManager.ts` scheduler
- [x] 6.1.2 Implement trigger conditions (daily/streak/level)
- [x] 6.1.3 Implement random game type selection
- [x] 6.1.4 Integrate with reward system

### 6.2 Demo Integration
- [x] 6.2.1 Add mini game triggers to demo
- [x] 6.2.2 Create mini game test buttons (demo/minigames.html)

### 6.3 Tests
- [x] 6.3.1 Unit tests for `MiniGameManager`

---

## 7. Integration & Polish

### 7.1 System Integration
- [x] 7.1.1 Connect win streak to mini game triggers
- [x] 7.1.2 Connect pre-boosters to streak rewards
- [x] 7.1.3 Add analytics events for all features

### 7.2 Configuration
- [x] 7.2.1 Create `retention-config.json` with all parameters
- [x] 7.2.2 Add feature flags for each module

### 7.3 Documentation
- [x] 7.3.1 Update CLAUDE.md with new systems
- [x] 7.3.2 Add inline code documentation

---

## 8. Visual & Interactive Demo (可视化交互演示)

### 8.1 Win Streak Visualization
- [x] 8.1.1 Create streak HUD with fire animation
- [x] 8.1.2 Create level complete modal with reward cascade
- [x] 8.1.3 Create streak loss modal with revival buttons
- [x] 8.1.4 Add milestone celebration effects (confetti, screen flash)
- [x] 8.1.5 Create streak history timeline view

### 8.2 Pre-Booster Selection UI
- [x] 8.2.1 Create booster card selection with hover effects
- [x] 8.2.2 Add price tags with discount indicators
- [x] 8.2.3 Create "FREE from streak" badge animation
- [x] 8.2.4 Add board preview showing booster placement
- [x] 8.2.5 Create smart recommendation tooltip

### 8.3 Enhanced Mini Games UI
- [x] 8.3.1 Rescue: Add character animations (scared→happy/sad)
- [x] 8.3.2 Rescue: Add countdown ring with pulse effect
- [x] 8.3.3 ColorSort: Add tile bounce and glow effects
- [x] 8.3.4 ColorSort: Add progress bar with celebration
- [x] 8.3.5 Treasure: Add dig particle effect (dirt spray)
- [x] 8.3.6 Treasure: Add treasure chest open animation
- [x] 8.3.7 Treasure: Add heat map overlay for hints

### 8.4 Unified Demo Hub
- [x] 8.4.1 Create retention-demo.html with all systems
- [x] 8.4.2 Add state simulation controls (streak level, coins, etc.)
- [x] 8.4.3 Add real-time event log panel
- [x] 8.4.4 Create flow diagram showing system connections

---

## Dependencies

```
1.1 → 1.2 → 1.3 (Win Streak core → UI → Demo)
2.1 → 2.2 → 2.3 (Pre-Boosters core → UI → Demo)
3.1 → 3.2 (Rescue core → UI)
4.1 → 4.2 (Color Sort core → UI)
5.1 → 5.2 (Treasure core → UI)
3.1, 4.1, 5.1 → 6.1 (All mini games → Manager)
1.1, 2.1, 6.1 → 7.1 (All systems → Integration)
```

## Parallelizable Work

- 1.x (Win Streak) and 2.x (Pre-Boosters) can run in parallel
- 3.x, 4.x, 5.x (Mini Games) can run in parallel after core patterns established
- 6.x depends on at least one mini game being complete
- 7.x (Integration) must wait for all other tasks

## Estimated Effort

| Section | Estimated Hours |
|---------|-----------------|
| 1. Win Streak | 16-20 |
| 2. Pre-Boosters | 12-16 |
| 3. Rescue Game | 8-12 |
| 4. Color Sort | 6-8 |
| 5. Treasure Hunt | 10-14 |
| 6. Mini Game Manager | 6-8 |
| 7. Integration | 8-12 |
| 8. Visual Demo | 12-16 |
| **Total** | **78-106** |
