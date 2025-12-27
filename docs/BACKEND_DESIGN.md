# 后端开发设计 & 关卡数值调优体系

## 一、系统架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端 (Cocos/H5)                         │
├─────────────────────────────────────────────────────────────────┤
│  GameController  │  LevelGenerator  │  EnergyManager  │  RNG    │
└────────┬────────────────┬─────────────────┬────────────────────┘
         │                │                 │
         ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      核心算法层 (Pure TypeScript)                │
├─────────────────────────────────────────────────────────────────┤
│  LevelValidator    │  DifficultyEstimator  │  BalanceSimulator  │
│  (可玩性验证)       │  (难度评估)            │  (蒙特卡洛模拟)     │
└────────┬────────────────┬─────────────────┬────────────────────┘
         │                │                 │
         ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据层 (JSON/云端)                          │
├─────────────────────────────────────────────────────────────────┤
│  levels.json  │  balance_config.json  │  analytics_events.json  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、关卡可玩性验证系统

### 2.1 核心问题

**问题**：如何保证生成的关卡 100% 可解？

**当前方案缺陷**：
- 只检查"是否有有效移动"，不验证"是否能在步数内完成目标"
- 无法评估关卡实际难度
- 无法检测"死局陷阱"（前几步看似有解，后面无解）

### 2.2 解决方案：蒙特卡洛模拟验证

```typescript
// src/core/LevelValidator.ts

interface ValidationResult {
  isPlayable: boolean;           // 是否可玩
  winRate: number;               // 模拟胜率 (0-1)
  avgMovesUsed: number;          // 平均使用步数
  avgMovesRemaining: number;     // 平均剩余步数
  difficultyScore: number;       // 难度评分 (1-10)
  minMovesToWin: number;         // 最少步数通关
  deadlockRate: number;          // 死局率
  specialTileUsage: number;      // 特殊块使用率
}

interface SimulationConfig {
  iterations: number;            // 模拟次数 (推荐 1000)
  strategies: SimStrategy[];     // 模拟策略池
  timeoutMs: number;             // 单次模拟超时
}

type SimStrategy =
  | 'random'           // 随机选择有效移动
  | 'greedy_goal'      // 优先消除目标物
  | 'greedy_cascade'   // 优先触发连消
  | 'special_first'    // 优先使用特殊块
  | 'mixed';           // 混合策略 (最接近真实玩家)

class LevelValidator {
  /**
   * 验证关卡可玩性
   * @returns 验证结果，包含胜率、难度评分等
   */
  validate(levelDef: LevelDef, config: SimulationConfig): ValidationResult {
    const results: SimulationRun[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const strategy = this.pickStrategy(config.strategies);
      const run = this.simulateGame(levelDef, strategy, i);
      results.push(run);
    }

    return this.aggregateResults(results);
  }

  /**
   * 单次模拟游戏
   */
  private simulateGame(
    levelDef: LevelDef,
    strategy: SimStrategy,
    runSeed: number
  ): SimulationRun {
    const rng = new RNG(levelDef.seed + runSeed);
    const state = this.levelGen.createLevelState(levelDef);

    let moves = 0;
    let deadlocks = 0;
    let specialsUsed = 0;

    while (state.movesLeft > 0 && !state.isCompleted) {
      // 获取所有有效移动
      const validMoves = this.matchFinder.getAllValidMoves(state.board);

      if (validMoves.length === 0) {
        deadlocks++;
        this.shuffleBoard(state, rng);
        continue;
      }

      // 根据策略选择移动
      const move = this.selectMove(validMoves, state, strategy, rng);

      // 执行移动
      const result = this.executeMove(state, move);
      moves++;

      if (result.specialsTriggered > 0) specialsUsed++;

      // 检查胜利
      if (this.goalTracker.isCompleted(state.goals)) {
        state.isCompleted = true;
      }
    }

    return {
      won: state.isCompleted,
      movesUsed: moves,
      movesRemaining: state.movesLeft,
      deadlocks,
      specialsUsed,
    };
  }

  /**
   * 策略：选择最佳移动
   */
  private selectMove(
    moves: ValidMove[],
    state: LevelState,
    strategy: SimStrategy,
    rng: IRNG
  ): ValidMove {
    switch (strategy) {
      case 'random':
        return moves[rng.randInt(0, moves.length - 1)];

      case 'greedy_goal':
        // 评分：消除目标物数量
        return this.scoreMoves(moves, state, (m) => {
          const preview = this.previewMatch(state.board, m);
          return preview.goalItemsCleared;
        });

      case 'greedy_cascade':
        // 评分：预期连消次数
        return this.scoreMoves(moves, state, (m) => {
          const preview = this.previewMatch(state.board, m);
          return preview.expectedCascades;
        });

      case 'special_first':
        // 优先触发特殊块
        const specialMoves = moves.filter(m =>
          this.involvesSpecialTile(state.board, m)
        );
        if (specialMoves.length > 0) {
          return specialMoves[rng.randInt(0, specialMoves.length - 1)];
        }
        return moves[rng.randInt(0, moves.length - 1)];

      case 'mixed':
      default:
        // 70% 贪心目标，20% 贪心连消，10% 随机
        const roll = rng.random();
        if (roll < 0.7) return this.selectMove(moves, state, 'greedy_goal', rng);
        if (roll < 0.9) return this.selectMove(moves, state, 'greedy_cascade', rng);
        return this.selectMove(moves, state, 'random', rng);
    }
  }
}
```

### 2.3 难度评分算法

```typescript
// src/core/DifficultyEstimator.ts

interface DifficultyFactors {
  movePressure: number;      // 步数压力 (目标/步数 比值)
  boardComplexity: number;   // 棋盘复杂度 (苔藓密度+分布)
  goalDifficulty: number;    // 目标难度 (收集稀有物 > 清苔藓)
  cascadePotential: number;  // 连消潜力 (低=难)
  specialReliability: number; // 特殊块依赖度 (高=难)
}

class DifficultyEstimator {
  /**
   * 估算关卡难度 (1-10 分)
   */
  estimate(levelDef: LevelDef): number {
    const factors = this.calculateFactors(levelDef);

    // 加权计算
    const score =
      factors.movePressure * 0.35 +
      factors.boardComplexity * 0.25 +
      factors.goalDifficulty * 0.20 +
      (1 - factors.cascadePotential) * 0.10 +
      factors.specialReliability * 0.10;

    // 归一化到 1-10
    return Math.min(10, Math.max(1, score * 10));
  }

  private calculateFactors(levelDef: LevelDef): DifficultyFactors {
    // 步数压力：每步需要完成的目标量
    const movePressure = this.calcMovePressure(levelDef);

    // 棋盘复杂度：苔藓覆盖率 + 分布难度
    const boardComplexity = this.calcBoardComplexity(levelDef);

    // 目标难度：不同目标类型的基础难度
    const goalDifficulty = this.calcGoalDifficulty(levelDef);

    // 连消潜力：基于棋盘开放度估算
    const cascadePotential = this.calcCascadePotential(levelDef);

    // 特殊块依赖：是否需要特殊块才能通关
    const specialReliability = this.calcSpecialReliability(levelDef);

    return {
      movePressure,
      boardComplexity,
      goalDifficulty,
      cascadePotential,
      specialReliability,
    };
  }

  /**
   * 步数压力计算
   * 公式：(目标数量 / 步数) / 基准效率
   * 基准效率 = 3 (平均每步消除3个目标物)
   */
  private calcMovePressure(levelDef: LevelDef): number {
    const BASE_EFFICIENCY = 3.0;

    let targetCount = 0;
    for (const goal of levelDef.goals) {
      if (goal.type === 'collect') {
        targetCount += goal.count;
      } else if (goal.type === 'clear_moss') {
        targetCount += levelDef.blockers.cells.length;
      }
    }

    const pressure = (targetCount / levelDef.moves) / BASE_EFFICIENCY;
    return Math.min(1, pressure);
  }

  /**
   * 棋盘复杂度计算
   */
  private calcBoardComplexity(levelDef: LevelDef): number {
    const density = levelDef.blockers.density;

    // 不同 pattern 的额外难度系数
    const patternDifficulty: Record<string, number> = {
      'none': 0,
      'edge_ring': 0.1,
      'corners': 0.15,
      'diagonal': 0.2,
      'center_blob': 0.25,
      'center_cross': 0.3,
      'stripes_h': 0.2,
      'stripes_v': 0.2,
      'scattered': 0.35,
    };

    const patternBonus = patternDifficulty[levelDef.blockers.pattern] || 0;

    return Math.min(1, density + patternBonus);
  }
}
```

---

## 三、难度曲线设计系统

### 3.1 理想难度曲线

```
难度
10 ┤                                          ╭───
   │                                     ╭────╯
 8 ┤                                ╭────╯
   │                           ╭────╯
 6 ┤                      ╭────╯
   │               ╭──────╯        ← 波动周期
 4 ┤          ╭────╯
   │     ╭────╯
 2 ┤╭────╯
   │
 0 ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────
   1   10   20   30   40   50   60   70   80   90  100
                        关卡

   │←新手期→│←成长期→│←挑战期→│←大师期→│←无限期→│
```

### 3.2 分段难度参数

```typescript
// src/core/DifficultyConfig.ts

interface DifficultyPhase {
  name: string;
  levelRange: [number, number];
  parameters: {
    moves: { base: number; variance: number; trend: number };
    goalCount: { base: number; variance: number; trend: number };
    density: { base: number; variance: number; trend: number };
    patterns: string[];
    goalTypes: { type: string; weight: number }[];
  };
  constraints: {
    minWinRate: number;      // 最低胜率要求
    maxWinRate: number;      // 最高胜率要求
    targetDifficulty: number; // 目标难度分
  };
}

const DIFFICULTY_PHASES: DifficultyPhase[] = [
  {
    name: '新手期',
    levelRange: [1, 10],
    parameters: {
      moves: { base: 14, variance: 1, trend: -0.1 },
      goalCount: { base: 8, variance: 1, trend: 0.2 },
      density: { base: 0, variance: 0.02, trend: 0.008 },
      patterns: ['none', 'edge_ring', 'corners'],
      goalTypes: [
        { type: 'collect', weight: 0.9 },
        { type: 'clear_moss', weight: 0.1 },
      ],
    },
    constraints: {
      minWinRate: 0.95,
      maxWinRate: 1.0,
      targetDifficulty: 2,
    },
  },
  {
    name: '成长期',
    levelRange: [11, 25],
    parameters: {
      moves: { base: 12, variance: 1, trend: -0.05 },
      goalCount: { base: 10, variance: 2, trend: 0.3 },
      density: { base: 0.10, variance: 0.02, trend: 0.005 },
      patterns: ['edge_ring', 'corners', 'diagonal', 'center_blob'],
      goalTypes: [
        { type: 'collect', weight: 0.6 },
        { type: 'clear_moss', weight: 0.25 },
        { type: 'combo', weight: 0.15 },
      ],
    },
    constraints: {
      minWinRate: 0.80,
      maxWinRate: 0.95,
      targetDifficulty: 4,
    },
  },
  {
    name: '挑战期',
    levelRange: [26, 40],
    parameters: {
      moves: { base: 11, variance: 1, trend: -0.03 },
      goalCount: { base: 13, variance: 2, trend: 0.2 },
      density: { base: 0.17, variance: 0.03, trend: 0.008 },
      patterns: ['diagonal', 'center_blob', 'center_cross', 'stripes_h', 'stripes_v'],
      goalTypes: [
        { type: 'collect', weight: 0.5 },
        { type: 'clear_moss', weight: 0.25 },
        { type: 'combo', weight: 0.25 },
      ],
    },
    constraints: {
      minWinRate: 0.60,
      maxWinRate: 0.85,
      targetDifficulty: 6,
    },
  },
  {
    name: '大师期',
    levelRange: [41, 50],
    parameters: {
      moves: { base: 10, variance: 1, trend: 0 },
      goalCount: { base: 15, variance: 2, trend: 0.1 },
      density: { base: 0.26, variance: 0.03, trend: 0.004 },
      patterns: ['center_blob', 'center_cross', 'stripes_h', 'stripes_v', 'scattered'],
      goalTypes: [
        { type: 'collect', weight: 0.4 },
        { type: 'clear_moss', weight: 0.3 },
        { type: 'combo', weight: 0.3 },
      ],
    },
    constraints: {
      minWinRate: 0.45,
      maxWinRate: 0.70,
      targetDifficulty: 8,
    },
  },
  {
    name: '无限期',
    levelRange: [51, Infinity],
    parameters: {
      moves: { base: 8, variance: 2, trend: -0.01 }, // 缓慢降低
      goalCount: { base: 18, variance: 3, trend: 0.05 },
      density: { base: 0.30, variance: 0.05, trend: 0.002 },
      patterns: ['center_cross', 'stripes_h', 'stripes_v', 'scattered'],
      goalTypes: [
        { type: 'collect', weight: 0.35 },
        { type: 'clear_moss', weight: 0.30 },
        { type: 'combo', weight: 0.35 },
      ],
    },
    constraints: {
      minWinRate: 0.30,
      maxWinRate: 0.60,
      targetDifficulty: 9,
    },
  },
];
```

### 3.3 关卡生成器优化

```typescript
// src/core/BalancedLevelGenerator.ts

class BalancedLevelGenerator extends LevelGenerator {
  private validator = new LevelValidator();
  private estimator = new DifficultyEstimator();

  /**
   * 生成平衡的关卡（带验证）
   */
  generateBalancedLevel(
    levelIndex: number,
    playerId: string,
    maxAttempts: number = 10
  ): LevelDef {
    const phase = this.getPhase(levelIndex);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 生成候选关卡
      const candidate = this.generateCandidate(levelIndex, playerId, attempt);

      // 快速难度估算
      const estimatedDiff = this.estimator.estimate(candidate);

      // 检查是否在目标范围内
      if (Math.abs(estimatedDiff - phase.constraints.targetDifficulty) > 2) {
        continue; // 难度偏差太大，重新生成
      }

      // 蒙特卡洛验证（轻量版，100次模拟）
      const validation = this.validator.validate(candidate, {
        iterations: 100,
        strategies: ['mixed'],
        timeoutMs: 5000,
      });

      // 检查胜率约束
      if (validation.winRate >= phase.constraints.minWinRate &&
          validation.winRate <= phase.constraints.maxWinRate) {
        return candidate;
      }

      // 根据验证结果调整参数重试
      this.adjustParameters(candidate, validation, phase);
    }

    // 兜底：返回最后一次尝试，附带警告标记
    console.warn(`Level ${levelIndex}: 未能满足平衡约束，使用最后生成的版本`);
    return this.generateCandidate(levelIndex, playerId, maxAttempts);
  }

  /**
   * 根据验证结果调整参数
   */
  private adjustParameters(
    candidate: LevelDef,
    validation: ValidationResult,
    phase: DifficultyPhase
  ): void {
    if (validation.winRate < phase.constraints.minWinRate) {
      // 太难了，降低难度
      candidate.moves += 1;
      candidate.blockers.density *= 0.9;
    } else if (validation.winRate > phase.constraints.maxWinRate) {
      // 太简单了，增加难度
      candidate.moves -= 1;
      candidate.blockers.density *= 1.1;
    }
  }
}
```

---

## 四、数值平衡配置系统

### 4.1 核心数值公式

```typescript
// src/core/BalanceFormulas.ts

/**
 * 核心数值公式文档
 *
 * 1. 步数计算
 *    moves = floor(base - level * decay + wave * amplitude)
 *    - base: 基础步数 (14)
 *    - decay: 每关衰减 (0.08)
 *    - wave: sin(level * 0.3) 波动因子
 *    - amplitude: 波动幅度 (1)
 *    - 下限: 4, 上限: 15
 *
 * 2. 目标数量计算
 *    count = floor(base + level * growth * goalMultiplier)
 *    - base: 基础数量 (8)
 *    - growth: 增长率 (0.15)
 *    - goalMultiplier: 目标类型系数
 *      - collect: 1.0
 *      - clear_moss: 0.8 (苔藓数由 density 决定)
 *      - combo: 0.9
 *    - 下限: 6, 上限: 35
 *
 * 3. 苔藓密度计算
 *    density = min(base + level * growth, cap)
 *    - base: 基础密度 (0)
 *    - growth: 增长率 (0.006)
 *    - cap: 密度上限 (0.35)
 *
 * 4. 每步期望收益
 *    expectedPerMove = 3.0 + cascadeBonus
 *    - cascadeBonus: 连消加成 (0.5-1.5)
 *    - 考虑目标权重加成 (1.08x)
 *
 * 5. 关卡胜率预估
 *    winRate = sigmoid((moves * expectedPerMove - totalGoal) / volatility)
 *    - volatility: 波动系数 (5.0)
 */

const BALANCE_CONSTANTS = {
  // 步数
  MOVES_BASE: 14,
  MOVES_DECAY: 0.08,
  MOVES_WAVE_AMPLITUDE: 1,
  MOVES_MIN: 4,
  MOVES_MAX: 15,

  // 目标
  GOAL_BASE: 8,
  GOAL_GROWTH: 0.15,
  GOAL_MIN: 6,
  GOAL_MAX: 35,

  // 苔藓
  DENSITY_BASE: 0,
  DENSITY_GROWTH: 0.006,
  DENSITY_CAP: 0.35,

  // 收益
  EXPECTED_PER_MOVE: 3.0,
  CASCADE_BONUS_MIN: 0.5,
  CASCADE_BONUS_MAX: 1.5,
  GOAL_WEIGHT_BOOST: 1.08,

  // 胜率
  WIN_RATE_VOLATILITY: 5.0,
};

function calculateMoves(level: number): number {
  const wave = Math.sin(level * 0.3);
  const raw = BALANCE_CONSTANTS.MOVES_BASE
    - level * BALANCE_CONSTANTS.MOVES_DECAY
    + wave * BALANCE_CONSTANTS.MOVES_WAVE_AMPLITUDE;

  return Math.floor(
    Math.max(BALANCE_CONSTANTS.MOVES_MIN,
    Math.min(BALANCE_CONSTANTS.MOVES_MAX, raw))
  );
}

function calculateGoalCount(level: number, goalType: string): number {
  const multiplier = goalType === 'collect' ? 1.0
    : goalType === 'clear_moss' ? 0.8
    : 0.9;

  const raw = BALANCE_CONSTANTS.GOAL_BASE
    + level * BALANCE_CONSTANTS.GOAL_GROWTH * multiplier;

  return Math.floor(
    Math.max(BALANCE_CONSTANTS.GOAL_MIN,
    Math.min(BALANCE_CONSTANTS.GOAL_MAX, raw))
  );
}

function calculateDensity(level: number): number {
  const raw = BALANCE_CONSTANTS.DENSITY_BASE
    + level * BALANCE_CONSTANTS.DENSITY_GROWTH;

  return Math.min(raw, BALANCE_CONSTANTS.DENSITY_CAP);
}

function estimateWinRate(moves: number, totalGoal: number): number {
  const expected = moves * BALANCE_CONSTANTS.EXPECTED_PER_MOVE;
  const x = (expected - totalGoal) / BALANCE_CONSTANTS.WIN_RATE_VOLATILITY;
  return 1 / (1 + Math.exp(-x)); // sigmoid
}
```

### 4.2 配置热更新系统

```typescript
// src/core/BalanceConfig.ts

interface BalanceConfig {
  version: string;
  lastUpdated: string;

  // 可热更新的数值
  constants: typeof BALANCE_CONSTANTS;

  // 分段配置
  phases: DifficultyPhase[];

  // 特殊事件
  events: {
    bossLevels: number[];      // Boss 关卡列表
    easyLevels: number[];      // 简单关卡（节日活动）
    hardLevels: number[];      // 困难关卡（挑战活动）
  };

  // A/B 测试分组
  abTests: {
    testId: string;
    parameter: string;
    variants: { name: string; value: any; weight: number }[];
  }[];
}

class BalanceConfigManager {
  private config: BalanceConfig;
  private listeners: Set<(config: BalanceConfig) => void> = new Set();

  /**
   * 从云端加载配置
   */
  async loadFromRemote(): Promise<void> {
    try {
      const response = await fetch('/api/balance-config');
      const newConfig = await response.json();

      if (newConfig.version !== this.config.version) {
        this.config = newConfig;
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to load remote config, using local');
    }
  }

  /**
   * 获取玩家的 A/B 测试分组
   */
  getABTestVariant(playerId: string, testId: string): any {
    const test = this.config.abTests.find(t => t.testId === testId);
    if (!test) return null;

    // 使用 playerId 哈希确定分组（稳定分配）
    const hash = this.hashString(playerId + testId);
    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    let roll = (hash % 1000) / 1000 * totalWeight;

    for (const variant of test.variants) {
      roll -= variant.weight;
      if (roll <= 0) return variant.value;
    }

    return test.variants[0].value;
  }
}
```

---

## 五、数据埋点与分析系统

### 5.1 核心埋点事件

```typescript
// src/core/Analytics.ts

interface AnalyticsEvent {
  eventName: string;
  timestamp: number;
  playerId: string;
  sessionId: string;
  data: Record<string, any>;
}

const ANALYTICS_EVENTS = {
  // 关卡事件
  LEVEL_START: 'level_start',
  LEVEL_END: 'level_end',
  LEVEL_RETRY: 'level_retry',

  // 操作事件
  MOVE_MADE: 'move_made',
  SPECIAL_CREATED: 'special_created',
  SPECIAL_TRIGGERED: 'special_triggered',
  CASCADE_TRIGGERED: 'cascade_triggered',
  SHUFFLE_TRIGGERED: 'shuffle_triggered',

  // 体力事件
  ENERGY_CONSUMED: 'energy_consumed',
  ENERGY_RECOVERED: 'energy_recovered',
  AD_WATCHED: 'ad_watched',

  // 流失点
  ENERGY_GATE_SHOWN: 'energy_gate_shown',
  ENERGY_GATE_CLOSED: 'energy_gate_closed',
  GAME_QUIT: 'game_quit',
};

interface LevelEndData {
  level: number;
  result: 'win' | 'lose' | 'quit';
  movesUsed: number;
  movesRemaining: number;
  goalProgress: number;
  goalTotal: number;
  duration: number;        // 游戏时长（秒）
  cascadeCount: number;
  shuffleCount: number;
  specialsCreated: number;
  specialsTriggered: number;
  retryCount: number;
}

class AnalyticsManager {
  private queue: AnalyticsEvent[] = [];
  private flushInterval = 30000; // 30秒批量上报

  /**
   * 记录关卡结束
   */
  trackLevelEnd(data: LevelEndData): void {
    this.track(ANALYTICS_EVENTS.LEVEL_END, {
      ...data,
      // 计算派生指标
      efficiency: data.goalProgress / data.movesUsed,
      timePerMove: data.duration / data.movesUsed,
      cascadeRate: data.cascadeCount / data.movesUsed,
    });
  }

  /**
   * 上报到后端
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // 失败则重新入队
      this.queue.unshift(...events);
    }
  }
}
```

### 5.2 关卡难度分析仪表盘

```typescript
// 数据分析查询示例 (SQL-like)

/**
 * 1. 各关卡胜率分布
 */
const QUERY_WIN_RATE_BY_LEVEL = `
  SELECT
    level,
    COUNT(*) as attempts,
    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) / COUNT(*) as win_rate,
    AVG(moves_used) as avg_moves,
    AVG(duration) as avg_duration
  FROM level_end_events
  WHERE timestamp > NOW() - INTERVAL '7 days'
  GROUP BY level
  ORDER BY level
`;

/**
 * 2. 难度异常检测
 * 找出胜率突然下降的关卡（流失点）
 */
const QUERY_DIFFICULTY_SPIKES = `
  WITH level_stats AS (
    SELECT
      level,
      win_rate,
      LAG(win_rate) OVER (ORDER BY level) as prev_win_rate
    FROM level_win_rates
  )
  SELECT
    level,
    win_rate,
    prev_win_rate,
    (prev_win_rate - win_rate) as drop
  FROM level_stats
  WHERE (prev_win_rate - win_rate) > 0.15  -- 胜率下降超过15%
  ORDER BY drop DESC
`;

/**
 * 3. 步数效率分析
 * 找出"步数浪费"较多的关卡（可能太简单）
 */
const QUERY_MOVES_EFFICIENCY = `
  SELECT
    level,
    AVG(moves_remaining) as avg_remaining,
    AVG(moves_used) as avg_used,
    AVG(moves_remaining) / AVG(moves_used + moves_remaining) as waste_ratio
  FROM level_end_events
  WHERE result = 'win'
  GROUP BY level
  HAVING waste_ratio > 0.3  -- 超过30%步数剩余
  ORDER BY waste_ratio DESC
`;

/**
 * 4. 特殊块依赖度分析
 */
const QUERY_SPECIAL_DEPENDENCY = `
  SELECT
    level,
    AVG(specials_created) as avg_created,
    AVG(specials_triggered) as avg_triggered,
    -- 胜利局 vs 失败局的特殊块使用差异
    AVG(CASE WHEN result = 'win' THEN specials_triggered ELSE 0 END) -
    AVG(CASE WHEN result = 'lose' THEN specials_triggered ELSE 0 END) as special_impact
  FROM level_end_events
  GROUP BY level
  ORDER BY special_impact DESC
`;
```

---

## 六、开发路线图

### Phase 1: 验证系统 (Week 1-2)

```
□ 实现 LevelValidator 蒙特卡洛模拟
  ├─ SimulationRun 数据结构
  ├─ 4种策略实现 (random, greedy_goal, greedy_cascade, mixed)
  └─ 结果聚合和统计

□ 实现 DifficultyEstimator 难度评估
  ├─ 5个难度因子计算
  ├─ 加权评分算法
  └─ 单元测试覆盖

□ 集成到关卡生成流程
  ├─ 生成时验证
  ├─ 不满足约束时重试
  └─ 性能优化（Web Worker）
```

### Phase 2: 数值平衡 (Week 3-4)

```
□ 难度曲线配置化
  ├─ 5个阶段参数配置
  ├─ 公式参数化
  └─ 配置热更新机制

□ A/B 测试框架
  ├─ 分组算法
  ├─ 配置下发
  └─ 结果收集

□ 关卡批量验证工具
  ├─ 命令行工具: npm run validate:levels
  ├─ 输出报告 (CSV/JSON)
  └─ CI 集成
```

### Phase 3: 数据系统 (Week 5-6)

```
□ 埋点系统实现
  ├─ 事件定义
  ├─ 批量上报
  └─ 离线缓存

□ 分析仪表盘
  ├─ 胜率曲线图
  ├─ 难度异常告警
  └─ 实时监控

□ 自动调优建议
  ├─ 基于数据的参数建议
  ├─ 异常关卡标记
  └─ 一键修复脚本
```

### Phase 4: 优化迭代 (Week 7+)

```
□ 动态难度调整 (DDA)
  ├─ 玩家技能评估
  ├─ 实时难度微调
  └─ 个性化关卡变体

□ 机器学习辅助
  ├─ 训练难度预测模型
  ├─ 自动生成平衡关卡
  └─ 异常检测
```

---

## 七、关键指标 (KPIs)

| 指标 | 目标值 | 当前值 | 说明 |
|------|--------|--------|------|
| 新手期胜率 | 95%+ | - | 关卡 1-10 |
| 成长期胜率 | 80-95% | - | 关卡 11-25 |
| 挑战期胜率 | 60-85% | - | 关卡 26-40 |
| 大师期胜率 | 45-70% | - | 关卡 41-50 |
| 关卡流失率 | <5% | - | 连续3次失败后流失 |
| 平均游戏时长 | 3-5分钟 | - | 单关卡 |
| 步数浪费率 | <25% | - | 胜利时剩余步数占比 |
| 特殊块触发率 | 30-50% | - | 每局游戏 |

---

## 八、文件结构

```
src/
├── core/
│   ├── LevelGenerator.ts        # 关卡生成（已有）
│   ├── LevelValidator.ts        # [新] 可玩性验证
│   ├── DifficultyEstimator.ts   # [新] 难度评估
│   ├── BalanceFormulas.ts       # [新] 数值公式
│   ├── BalanceConfig.ts         # [新] 配置管理
│   └── Analytics.ts             # [新] 埋点系统
├── tools/
│   ├── validate-levels.ts       # [新] 批量验证工具
│   ├── generate-report.ts       # [新] 报告生成
│   └── tune-parameters.ts       # [新] 参数调优
└── config/
    ├── levels.json              # 关卡配置（已有）
    ├── balance.json             # [新] 平衡配置
    └── analytics.json           # [新] 埋点配置
```
