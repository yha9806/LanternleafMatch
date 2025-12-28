/**
 * RescueMiniGame - 救援迷你游戏
 * 10秒内选择正确的选项来救援猫/狗
 */

// ============================================
// 类型定义
// ============================================

export interface RescueScenario {
  id: string;
  name: string;
  description: string;
  character: 'cat' | 'dog' | 'both';
  backgroundImage: string;
  characterSprite: string;
  options: RescueOption[];
  correctOptionIndex: number;
  timeLimit: number;
  rewards: {
    success: RescueReward;
    fail: RescueReward;
  };
}

export interface RescueOption {
  id: string;
  icon: string;
  label: string;
}

export interface RescueReward {
  coins: number;
  gems?: number;
  booster?: string;
}

export interface RescueResult {
  success: boolean;
  scenario: RescueScenario;
  selectedOption: number;
  timeUsed: number;
  reward: RescueReward;
}

export type RescueGameState = 'idle' | 'playing' | 'success' | 'fail' | 'timeout';

export interface RescueGameEvent {
  type: 'start' | 'tick' | 'select' | 'timeout' | 'complete';
  state: RescueGameState;
  timeRemaining?: number;
  result?: RescueResult;
}

// ============================================
// 场景配置
// ============================================

const RESCUE_SCENARIOS: RescueScenario[] = [
  {
    id: 'cat_tree',
    name: '小猫爬树',
    description: '小猫爬到树上下不来，选择正确的梯子帮它下来！',
    character: 'cat',
    backgroundImage: 'rescue_bg_tree.png',
    characterSprite: 'cat_scared.png',
    options: [
      { id: 'short', icon: '🪜', label: '短梯' },
      { id: 'medium', icon: '🪜', label: '中梯' },
      { id: 'long', icon: '🪜', label: '长梯' },
    ],
    correctOptionIndex: 2,
    timeLimit: 10,
    rewards: {
      success: { coins: 100, booster: 'rocket' },
      fail: { coins: 20 },
    },
  },
  {
    id: 'dog_river',
    name: '小狗过河',
    description: '小狗想过河，选择正确的跳板路线！',
    character: 'dog',
    backgroundImage: 'rescue_bg_river.png',
    characterSprite: 'dog_worried.png',
    options: [
      { id: 'left', icon: '⬅️', label: '左边路线' },
      { id: 'middle', icon: '⬆️', label: '中间路线' },
      { id: 'right', icon: '➡️', label: '右边路线' },
    ],
    correctOptionIndex: 1,
    timeLimit: 10,
    rewards: {
      success: { coins: 100, booster: 'bomb' },
      fail: { coins: 20 },
    },
  },
  {
    id: 'cat_rain',
    name: '躲雨猫咪',
    description: '下雨了！帮猫咪找到正确颜色的伞！',
    character: 'cat',
    backgroundImage: 'rescue_bg_rain.png',
    characterSprite: 'cat_wet.png',
    options: [
      { id: 'red', icon: '🔴', label: '红伞' },
      { id: 'blue', icon: '🔵', label: '蓝伞' },
      { id: 'yellow', icon: '🟡', label: '黄伞' },
    ],
    correctOptionIndex: 1,
    timeLimit: 10,
    rewards: {
      success: { coins: 80, gems: 1 },
      fail: { coins: 15 },
    },
  },
  {
    id: 'dog_dig',
    name: '小狗挖宝',
    description: '小狗想找到埋藏的骨头，选择正确的挖掘位置！',
    character: 'dog',
    backgroundImage: 'rescue_bg_garden.png',
    characterSprite: 'dog_digging.png',
    options: [
      { id: 'spot1', icon: '🌱', label: '草丛边' },
      { id: 'spot2', icon: '🌳', label: '大树下' },
      { id: 'spot3', icon: '🪨', label: '石头旁' },
    ],
    correctOptionIndex: 1,
    timeLimit: 10,
    rewards: {
      success: { coins: 100, booster: 'shuffle' },
      fail: { coins: 20 },
    },
  },
  {
    id: 'cat_fish',
    name: '钓鱼猫咪',
    description: '猫咪想钓鱼，选择有鱼的水域！',
    character: 'cat',
    backgroundImage: 'rescue_bg_pond.png',
    characterSprite: 'cat_fishing.png',
    options: [
      { id: 'shallow', icon: '🌊', label: '浅水区' },
      { id: 'deep', icon: '🌊', label: '深水区' },
      { id: 'reeds', icon: '🌾', label: '芦苇边' },
    ],
    correctOptionIndex: 2,
    timeLimit: 10,
    rewards: {
      success: { coins: 90, gems: 1 },
      fail: { coins: 15 },
    },
  },
  {
    id: 'rescue_both',
    name: '双重救援',
    description: '猫和狗都需要帮助！选择正确的救援顺序！',
    character: 'both',
    backgroundImage: 'rescue_bg_both.png',
    characterSprite: 'cat_dog_trouble.png',
    options: [
      { id: 'cat_first', icon: '🐱➡️🐕', label: '先救猫' },
      { id: 'dog_first', icon: '🐕➡️🐱', label: '先救狗' },
      { id: 'together', icon: '🐱🐕', label: '一起救' },
    ],
    correctOptionIndex: 0,
    timeLimit: 10,
    rewards: {
      success: { coins: 150, gems: 2, booster: 'rainbow' },
      fail: { coins: 30 },
    },
  },
];

// ============================================
// RescueMiniGame 类
// ============================================

export class RescueMiniGame {
  private scenario: RescueScenario;
  private state: RescueGameState = 'idle';
  private timeRemaining: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private listeners: Array<(event: RescueGameEvent) => void> = [];

  constructor(scenario?: RescueScenario) {
    this.scenario = scenario || this.getRandomScenario();
    this.timeRemaining = this.scenario.timeLimit;
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 获取当前场景
   */
  getScenario(): RescueScenario {
    return this.scenario;
  }

  /**
   * 获取当前状态
   */
  getState(): RescueGameState {
    return this.state;
  }

  /**
   * 获取剩余时间
   */
  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * 开始游戏
   */
  start(): void {
    if (this.state !== 'idle') return;

    this.state = 'playing';
    this.startTime = Date.now();
    this.timeRemaining = this.scenario.timeLimit;

    this.emitEvent({ type: 'start', state: this.state, timeRemaining: this.timeRemaining });

    this.timer = setInterval(() => {
      this.timeRemaining--;
      this.emitEvent({ type: 'tick', state: this.state, timeRemaining: this.timeRemaining });

      if (this.timeRemaining <= 0) {
        this.onTimeout();
      }
    }, 1000);
  }

  /**
   * 选择选项
   */
  selectOption(optionIndex: number): RescueResult | null {
    if (this.state !== 'playing') return null;
    if (optionIndex < 0 || optionIndex >= this.scenario.options.length) return null;

    this.stopTimer();

    const timeUsed = Math.round((Date.now() - this.startTime) / 1000);
    const isCorrect = optionIndex === this.scenario.correctOptionIndex;

    this.state = isCorrect ? 'success' : 'fail';

    const result: RescueResult = {
      success: isCorrect,
      scenario: this.scenario,
      selectedOption: optionIndex,
      timeUsed,
      reward: isCorrect ? this.scenario.rewards.success : this.scenario.rewards.fail,
    };

    this.emitEvent({ type: 'complete', state: this.state, result });

    return result;
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
  onEvent(listener: (event: RescueGameEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emitEvent(event: RescueGameEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[RescueMiniGame] Listener error:', e);
      }
    }
  }

  // ============================================
  // 内部方法
  // ============================================

  private onTimeout(): void {
    this.stopTimer();
    this.state = 'timeout';

    const result: RescueResult = {
      success: false,
      scenario: this.scenario,
      selectedOption: -1,
      timeUsed: this.scenario.timeLimit,
      reward: this.scenario.rewards.fail,
    };

    this.emitEvent({ type: 'timeout', state: this.state, result });
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private getRandomScenario(): RescueScenario {
    const index = Math.floor(Math.random() * RESCUE_SCENARIOS.length);
    return RESCUE_SCENARIOS[index];
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建救援游戏实例
 */
export function createRescueMiniGame(scenarioId?: string): RescueMiniGame {
  let scenario: RescueScenario | undefined;

  if (scenarioId) {
    scenario = RESCUE_SCENARIOS.find((s) => s.id === scenarioId);
  }

  return new RescueMiniGame(scenario);
}

/**
 * 获取所有场景列表
 */
export function getAllRescueScenarios(): RescueScenario[] {
  return [...RESCUE_SCENARIOS];
}
