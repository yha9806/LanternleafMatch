/**
 * ColorSortMiniGame - 颜色排序迷你游戏
 * 按正确顺序点击彩色方块
 */

// ============================================
// 类型定义
// ============================================

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ColorSortConfig {
  difficulty: Difficulty;
  colors: string[];
  shuffledOrder: number[];
  correctOrder: number[];
  timeLimit: number;
  maxMistakes: number;
  rewards: {
    perfect: ColorSortReward;
    partial: ColorSortReward;
    fail: ColorSortReward;
  };
}

export interface ColorSortReward {
  coins: number;
  gems?: number;
}

export interface ColorSortResult {
  success: boolean;
  perfect: boolean;
  difficulty: Difficulty;
  mistakes: number;
  timeUsed: number;
  reward: ColorSortReward;
}

export type ColorSortGameState = 'idle' | 'playing' | 'success' | 'fail';

export interface ColorSortGameEvent {
  type: 'start' | 'tick' | 'correct' | 'wrong' | 'complete';
  state: ColorSortGameState;
  timeRemaining?: number;
  selectedCount?: number;
  mistakes?: number;
  result?: ColorSortResult;
}

// ============================================
// 常量
// ============================================

const DIFFICULTY_CONFIG: Record<Difficulty, { colorCount: number; timeLimit: number }> = {
  easy: { colorCount: 4, timeLimit: 15 },
  medium: { colorCount: 5, timeLimit: 12 },
  hard: { colorCount: 6, timeLimit: 10 },
};

const COLORS = [
  { id: 'leaf', icon: '🟢', name: '叶子' },
  { id: 'acorn', icon: '🟤', name: '橡果' },
  { id: 'star', icon: '🟡', name: '星屑' },
  { id: 'fish', icon: '🔵', name: '鱼干' },
  { id: 'bone', icon: '⚪', name: '骨头' },
  { id: 'flower', icon: '🟣', name: '花朵' },
];

const REWARDS: Record<Difficulty, { perfect: ColorSortReward; partial: ColorSortReward; fail: ColorSortReward }> = {
  easy: {
    perfect: { coins: 60 },
    partial: { coins: 40 },
    fail: { coins: 10 },
  },
  medium: {
    perfect: { coins: 100 },
    partial: { coins: 70 },
    fail: { coins: 15 },
  },
  hard: {
    perfect: { coins: 150, gems: 1 },
    partial: { coins: 100 },
    fail: { coins: 20 },
  },
};

// ============================================
// ColorSortMiniGame 类
// ============================================

export class ColorSortMiniGame {
  private config: ColorSortConfig;
  private state: ColorSortGameState = 'idle';
  private selectedIndices: number[] = [];
  private mistakes: number = 0;
  private timeRemaining: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private listeners: Array<(event: ColorSortGameEvent) => void> = [];

  constructor(difficulty: Difficulty = 'medium') {
    this.config = this.generateConfig(difficulty);
    this.timeRemaining = this.config.timeLimit;
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 获取配置
   */
  getConfig(): ColorSortConfig {
    return this.config;
  }

  /**
   * 获取颜色列表（按正确顺序）
   */
  getTargetOrder(): Array<{ id: string; icon: string; name: string }> {
    return this.config.correctOrder.map((i) => ({
      id: this.config.colors[i],
      icon: COLORS.find((c) => c.id === this.config.colors[i])?.icon || '⬜',
      name: COLORS.find((c) => c.id === this.config.colors[i])?.name || '',
    }));
  }

  /**
   * 获取打乱后的颜色列表
   */
  getShuffledOrder(): Array<{ id: string; icon: string; name: string; originalIndex: number }> {
    return this.config.shuffledOrder.map((i, shuffledIndex) => ({
      id: this.config.colors[i],
      icon: COLORS.find((c) => c.id === this.config.colors[i])?.icon || '⬜',
      name: COLORS.find((c) => c.id === this.config.colors[i])?.name || '',
      originalIndex: shuffledIndex,
    }));
  }

  /**
   * 获取当前状态
   */
  getState(): ColorSortGameState {
    return this.state;
  }

  /**
   * 获取已选择的数量
   */
  getSelectedCount(): number {
    return this.selectedIndices.length;
  }

  /**
   * 获取错误次数
   */
  getMistakes(): number {
    return this.mistakes;
  }

  /**
   * 获取剩余错误次数
   */
  getRemainingMistakes(): number {
    return this.config.maxMistakes - this.mistakes;
  }

  /**
   * 获取剩余时间
   */
  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * 检查某个位置是否已被选中
   */
  isSelected(shuffledIndex: number): boolean {
    return this.selectedIndices.includes(shuffledIndex);
  }

  /**
   * 开始游戏
   */
  start(): void {
    if (this.state !== 'idle') return;

    this.state = 'playing';
    this.startTime = Date.now();
    this.timeRemaining = this.config.timeLimit;

    this.emitEvent({
      type: 'start',
      state: this.state,
      timeRemaining: this.timeRemaining,
      selectedCount: 0,
      mistakes: 0,
    });

    this.timer = setInterval(() => {
      this.timeRemaining--;
      this.emitEvent({
        type: 'tick',
        state: this.state,
        timeRemaining: this.timeRemaining,
        selectedCount: this.selectedIndices.length,
        mistakes: this.mistakes,
      });

      if (this.timeRemaining <= 0) {
        this.onTimeout();
      }
    }, 1000);
  }

  /**
   * 选择颜色
   * @param shuffledIndex 在打乱顺序中的索引
   */
  selectColor(shuffledIndex: number): 'correct' | 'wrong' | 'already_selected' | 'game_over' | null {
    if (this.state !== 'playing') return null;
    if (this.isSelected(shuffledIndex)) return 'already_selected';

    // 获取当前应该选择的正确颜色
    const expectedPosition = this.selectedIndices.length;
    const expectedColorIndex = this.config.correctOrder[expectedPosition];

    // 获取玩家选择的颜色
    const selectedColorIndex = this.config.shuffledOrder[shuffledIndex];

    if (selectedColorIndex === expectedColorIndex) {
      // 正确
      this.selectedIndices.push(shuffledIndex);

      // 检查是否完成
      if (this.selectedIndices.length === this.config.colors.length) {
        this.onComplete();
        return 'correct';
      }

      this.emitEvent({
        type: 'correct',
        state: this.state,
        selectedCount: this.selectedIndices.length,
        mistakes: this.mistakes,
      });

      return 'correct';
    } else {
      // 错误
      this.mistakes++;

      if (this.mistakes >= this.config.maxMistakes) {
        this.onFail();
        return 'game_over';
      }

      this.emitEvent({
        type: 'wrong',
        state: this.state,
        selectedCount: this.selectedIndices.length,
        mistakes: this.mistakes,
      });

      return 'wrong';
    }
  }

  /**
   * 销毁游戏
   */
  destroy(): void {
    this.stopTimer();
    this.listeners = [];
  }

  // ============================================
  // 事件系统
  // ============================================

  /**
   * 监听游戏事件
   */
  onEvent(listener: (event: ColorSortGameEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emitEvent(event: ColorSortGameEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[ColorSortMiniGame] Listener error:', e);
      }
    }
  }

  // ============================================
  // 内部方法
  // ============================================

  private generateConfig(difficulty: Difficulty): ColorSortConfig {
    const { colorCount, timeLimit } = DIFFICULTY_CONFIG[difficulty];

    // 选择颜色
    const shuffledColors = [...COLORS].sort(() => Math.random() - 0.5);
    const selectedColors = shuffledColors.slice(0, colorCount).map((c) => c.id);

    // 生成正确顺序（0, 1, 2, ...）
    const correctOrder = Array.from({ length: colorCount }, (_, i) => i);

    // 生成打乱顺序
    const shuffledOrder = [...correctOrder].sort(() => Math.random() - 0.5);

    // 确保打乱后不是原顺序
    while (shuffledOrder.every((v, i) => v === correctOrder[i])) {
      shuffledOrder.sort(() => Math.random() - 0.5);
    }

    return {
      difficulty,
      colors: selectedColors,
      shuffledOrder,
      correctOrder,
      timeLimit,
      maxMistakes: 2,
      rewards: REWARDS[difficulty],
    };
  }

  private onComplete(): void {
    this.stopTimer();
    this.state = 'success';

    const timeUsed = Math.round((Date.now() - this.startTime) / 1000);
    const isPerfect = this.mistakes === 0;

    const result: ColorSortResult = {
      success: true,
      perfect: isPerfect,
      difficulty: this.config.difficulty,
      mistakes: this.mistakes,
      timeUsed,
      reward: isPerfect ? this.config.rewards.perfect : this.config.rewards.partial,
    };

    this.emitEvent({ type: 'complete', state: this.state, result });
  }

  private onFail(): void {
    this.stopTimer();
    this.state = 'fail';

    const timeUsed = Math.round((Date.now() - this.startTime) / 1000);

    const result: ColorSortResult = {
      success: false,
      perfect: false,
      difficulty: this.config.difficulty,
      mistakes: this.mistakes,
      timeUsed,
      reward: this.config.rewards.fail,
    };

    this.emitEvent({ type: 'complete', state: this.state, result });
  }

  private onTimeout(): void {
    this.onFail();
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建颜色排序游戏
 */
export function createColorSortMiniGame(difficulty?: Difficulty): ColorSortMiniGame {
  return new ColorSortMiniGame(difficulty || 'medium');
}

/**
 * 根据玩家等级获取推荐难度
 */
export function getRecommendedDifficulty(playerLevel: number): Difficulty {
  if (playerLevel < 10) return 'easy';
  if (playerLevel < 25) return 'medium';
  return 'hard';
}
