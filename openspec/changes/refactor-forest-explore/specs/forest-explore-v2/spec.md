# Forest Explore V2 - Technical Specification

## Overview

基于扫雷的森林探索迷你游戏，玩家从入口导航到出口，收集宝物并避开陷阱。

## Game Flow

```
初始化 → 显示网格 → 玩家点击 → 揭示内容 → 判断结果
                         ↓
              数字: 显示周围陷阱数
              宝物: 加分
              陷阱: 扣生命
              出口: 过关
```

## Grid Generation Algorithm

### 1. 基础生成

```typescript
interface Cell {
  type: 'empty' | 'trap' | 'treasure' | 'gem' | 'exit' | 'obstacle';
  revealed: boolean;
  flagged: boolean;
  adjacentTraps: number; // 0-8
}

function generateGrid(level: number): Cell[][] {
  const size = getGridSize(level);      // 5-9
  const trapCount = getTrapCount(level); // 3-16

  // 1. 创建空网格
  const grid = createEmptyGrid(size);

  // 2. 放置入口(左下)和出口(右上)
  grid[size-1][0].type = 'start';
  grid[0][size-1].type = 'exit';

  // 3. 随机放置陷阱
  placeTrap(grid, trapCount);

  // 4. 放置宝物
  placeTreasures(grid, level);

  // 5. 计算数字提示
  calculateNumbers(grid);

  // 6. 验证可解性
  if (!isSolvable(grid)) {
    return generateGrid(level); // 重新生成
  }

  return grid;
}
```

### 2. 可解性验证

```typescript
function isSolvable(grid: Cell[][]): boolean {
  // 条件1: 存在从入口到出口的安全路径
  if (!hasPathToExit(grid)) return false;

  // 条件2: 所有陷阱可通过逻辑推理确定
  // 使用约束传播算法验证
  return canSolveWithLogic(grid);
}

function hasPathToExit(grid: Cell[][]): boolean {
  // BFS 寻找安全路径
  const size = grid.length;
  const visited = new Set<string>();
  const queue = [[size-1, 0]]; // 从入口开始

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    visited.add(key);

    const cell = grid[r][c];
    if (cell.type === 'trap' || cell.type === 'obstacle') continue;
    if (cell.type === 'exit') return true;

    // 检查四个方向
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        queue.push([nr, nc]);
      }
    }
  }
  return false;
}
```

### 3. 数字计算

```typescript
function calculateNumbers(grid: Cell[][]): void {
  const size = grid.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c].type !== 'trap') {
        grid[r][c].adjacentTraps = countAdjacentTraps(grid, r, c);
      }
    }
  }
}

function countAdjacentTraps(grid: Cell[][], r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (isValidCell(grid, nr, nc) && grid[nr][nc].type === 'trap') {
        count++;
      }
    }
  }
  return count;
}
```

## Game State

```typescript
interface ExploreGameState {
  grid: Cell[][];
  level: number;
  lives: number;        // 0-3
  maxLives: number;     // 3
  coins: number;
  gems: number;
  items: {
    maps: number;       // 揭示3x3区域
    picks: number;      // 安全挖掘
    flags: number;      // 无限
  };
  gameStatus: 'playing' | 'won' | 'lost' | 'shopping';
}
```

## Level Progression

| Level | Grid | Traps | Treasures | Special |
|-------|------|-------|-----------|---------|
| 1-5   | 5×5  | 3-5   | 2-3       | Tutorial |
| 6-10  | 6×6  | 6-8   | 3-4       | Obstacles |
| 11-20 | 7×7  | 8-12  | 4-5       | Multi-treasure |
| 21-30 | 8×8  | 12-16 | 5-6       | Hidden rooms |
| 31+   | 9×9  | 16+   | 6+        | Elite traps |

## Item Effects

| Item | Effect | Cost |
|------|--------|------|
| Map  | Reveal 3×3 area safely | 50💰 |
| Pick | Dig one cell safely (no trap trigger) | 80💰 |
| Flag | Mark suspected trap (free) | - |

## UI Layout

```
┌─────────────────────────────────┐
│  Level 5    ❤️❤️❤️   💰120 💎3  │
├─────────────────────────────────┤
│                                 │
│    Grid Area (5×5 to 9×9)       │
│                                 │
├─────────────────────────────────┤
│  [🗺️×2] [⛏️×1] [🚩]  [💡提示]   │
└─────────────────────────────────┘
```

## Events & Rewards

### On Cell Reveal
- Number: Show count
- Treasure: +coins, play sfx
- Gem: +1 gem, play sfx
- Trap: -1 life, shake screen
- Exit: Level complete

### On Level Complete
- Restore lives to max
- Show rewards summary
- +1 random item (20% chance)
- Every 5 levels: Enter shop

### On Game Over (lives = 0)
- Show total score
- Offer continue (watch ad)
- Return to minigame menu
