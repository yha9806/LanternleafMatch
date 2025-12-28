import { _decorator, Component, Node, Vec2, Vec3 } from 'cc';
import {
  TutorialStepDef,
  LevelTutorialConfig,
  getTutorialForLevel,
  TutorialCompleteCondition
} from './TutorialStep';
import { TutorialOverlay, TutorialContext } from './TutorialOverlay';

const { ccclass, property } = _decorator;

/**
 * 引导进度存储键
 */
const TUTORIAL_PROGRESS_KEY = 'lanternleaf_tutorial_progress';

/**
 * 引导进度
 */
interface TutorialProgress {
  // 已完成的关卡引导
  completedLevels: number[];

  // 当前关卡进度（如果中途退出）
  currentLevel: number | null;
  currentStepIndex: number;

  // 是否跳过所有引导
  skipAll: boolean;
}

/**
 * TutorialManager - 新手引导管理器
 * 管理引导流程、进度、与游戏交互
 */
@ccclass('TutorialManager')
export class TutorialManager extends Component {
  private static _instance: TutorialManager | null = null;

  // ============================================
  // 引用
  // ============================================

  @property(TutorialOverlay)
  overlay: TutorialOverlay = null!;

  // ============================================
  // 状态
  // ============================================

  private progress: TutorialProgress = {
    completedLevels: [],
    currentLevel: null,
    currentStepIndex: 0,
    skipAll: false,
  };

  private isRunning: boolean = false;
  private currentConfig: LevelTutorialConfig | null = null;
  private currentStepIndex: number = 0;
  private context: TutorialContext | null = null;

  private actionResolve: (() => void) | null = null;
  private listeners: Array<(event: TutorialEvent) => void> = [];

  // ============================================
  // 单例
  // ============================================

  static getInstance(): TutorialManager | null {
    return TutorialManager._instance;
  }

  onLoad() {
    if (TutorialManager._instance && TutorialManager._instance !== this) {
      this.destroy();
      return;
    }
    TutorialManager._instance = this;

    this.loadProgress();
  }

  onDestroy() {
    if (TutorialManager._instance === this) {
      TutorialManager._instance = null;
    }
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 检查关卡是否需要引导
   */
  needsTutorial(levelIndex: number): boolean {
    if (this.progress.skipAll) return false;
    if (this.progress.completedLevels.includes(levelIndex)) return false;

    const config = getTutorialForLevel(levelIndex);
    return config !== null;
  }

  /**
   * 开始关卡引导
   */
  async startTutorial(levelIndex: number, context: TutorialContext): Promise<void> {
    const config = getTutorialForLevel(levelIndex);
    if (!config) return;

    // 检查是否已完成
    if (this.progress.completedLevels.includes(levelIndex)) {
      return;
    }

    this.isRunning = true;
    this.currentConfig = config;
    this.context = context;

    // 恢复进度或从头开始
    if (this.progress.currentLevel === levelIndex) {
      this.currentStepIndex = this.progress.currentStepIndex;
    } else {
      this.currentStepIndex = 0;
      this.progress.currentLevel = levelIndex;
      this.progress.currentStepIndex = 0;
      this.saveProgress();
    }

    this.emitEvent({ type: 'tutorial_start', levelIndex });

    // 执行引导步骤
    await this.runSteps();

    // 完成引导
    this.completeTutorial(levelIndex);
  }

  /**
   * 跳过当前引导
   */
  skipCurrentTutorial() {
    if (!this.isRunning || !this.currentConfig) return;

    // 强制引导不可跳过
    if (this.currentConfig.mandatory) {
      console.log('[Tutorial] Cannot skip mandatory tutorial');
      return;
    }

    this.isRunning = false;

    if (this.overlay) {
      this.overlay.hide();
    }

    if (this.currentConfig) {
      this.completeTutorial(this.currentConfig.levelIndex);
    }

    this.emitEvent({ type: 'tutorial_skip', levelIndex: this.currentConfig?.levelIndex || 0 });
  }

  /**
   * 跳过所有引导
   */
  skipAllTutorials() {
    this.progress.skipAll = true;
    this.saveProgress();

    if (this.isRunning) {
      this.isRunning = false;
      if (this.overlay) {
        this.overlay.hide();
      }
    }
  }

  /**
   * 重置引导进度
   */
  resetProgress() {
    this.progress = {
      completedLevels: [],
      currentLevel: null,
      currentStepIndex: 0,
      skipAll: false,
    };
    this.saveProgress();
  }

  /**
   * 通知玩家完成了操作
   */
  notifyAction(action: TutorialAction) {
    if (!this.isRunning) return;

    const currentStep = this.getCurrentStep();
    if (!currentStep || !currentStep.completeCondition) return;

    if (this.checkCondition(currentStep.completeCondition, action)) {
      // 通知 overlay
      if (this.overlay) {
        this.overlay.notifyActionComplete();
      }

      // 触发 resolve
      if (this.actionResolve) {
        this.actionResolve();
        this.actionResolve = null;
      }
    }
  }

  /**
   * 监听引导事件
   */
  onTutorialEvent(listener: (event: TutorialEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 检查是否正在运行引导
   */
  isTutorialRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep(): TutorialStepDef | null {
    if (!this.currentConfig) return null;
    return this.currentConfig.steps[this.currentStepIndex] || null;
  }

  // ============================================
  // 内部方法 - 步骤执行
  // ============================================

  private async runSteps() {
    if (!this.currentConfig || !this.overlay) return;

    while (this.isRunning && this.currentStepIndex < this.currentConfig.steps.length) {
      const step = this.currentConfig.steps[this.currentStepIndex];

      // 检查跳过条件
      if (step.skipCondition && step.skipCondition()) {
        this.currentStepIndex++;
        continue;
      }

      // 执行步骤
      await this.executeStep(step);

      // 更新进度
      this.currentStepIndex++;
      this.progress.currentStepIndex = this.currentStepIndex;
      this.saveProgress();
    }
  }

  private async executeStep(step: TutorialStepDef): Promise<void> {
    if (!this.overlay || !this.context) return;

    this.emitEvent({
      type: 'step_start',
      levelIndex: this.currentConfig?.levelIndex || 0,
      stepId: step.id
    });

    // 处理延迟
    if (step.delay && step.type !== 'show_dialog') {
      await this.delay(step.delay);
    }

    // 显示步骤
    await this.overlay.showStep(step, this.context);

    // 如果有完成条件，等待
    if (step.completeCondition && step.completeCondition.type !== 'tap' && step.completeCondition.type !== 'delay') {
      await this.waitForCondition(step.completeCondition);
    }

    this.emitEvent({
      type: 'step_complete',
      levelIndex: this.currentConfig?.levelIndex || 0,
      stepId: step.id
    });
  }

  private async waitForCondition(condition: TutorialCompleteCondition): Promise<void> {
    if (condition.type === 'delay') {
      await this.delay(condition.ms);
      return;
    }

    return new Promise((resolve) => {
      this.actionResolve = resolve;
    });
  }

  private checkCondition(condition: TutorialCompleteCondition, action: TutorialAction): boolean {
    switch (condition.type) {
      case 'tap':
        return action.type === 'tap';

      case 'swap':
        if (action.type !== 'swap') return false;
        return (
          (action.from.equals(condition.from) && action.to.equals(condition.to)) ||
          (action.from.equals(condition.to) && action.to.equals(condition.from))
        );

      case 'any_swap':
        return action.type === 'swap';

      case 'match':
        if (action.type !== 'match') return false;
        if (condition.count) {
          return action.count >= condition.count;
        }
        return true;

      case 'goal_progress':
        return action.type === 'goal_progress';

      default:
        return false;
    }
  }

  // ============================================
  // 内部方法 - 进度管理
  // ============================================

  private completeTutorial(levelIndex: number) {
    if (!this.progress.completedLevels.includes(levelIndex)) {
      this.progress.completedLevels.push(levelIndex);
    }
    this.progress.currentLevel = null;
    this.progress.currentStepIndex = 0;
    this.saveProgress();

    this.isRunning = false;
    this.currentConfig = null;
    this.context = null;

    if (this.overlay) {
      this.overlay.hide();
    }

    this.emitEvent({ type: 'tutorial_complete', levelIndex });
  }

  private loadProgress() {
    try {
      const data = localStorage.getItem(TUTORIAL_PROGRESS_KEY);
      if (data) {
        this.progress = { ...this.progress, ...JSON.parse(data) };
      }
    } catch {
      // 使用默认值
    }
  }

  private saveProgress() {
    try {
      localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(this.progress));
    } catch {
      console.warn('[Tutorial] Failed to save progress');
    }
  }

  // ============================================
  // 内部方法 - 辅助
  // ============================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitEvent(event: TutorialEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

// ============================================
// 类型定义
// ============================================

/**
 * 玩家操作
 */
export type TutorialAction =
  | { type: 'tap' }
  | { type: 'swap'; from: Vec2; to: Vec2 }
  | { type: 'match'; count: number }
  | { type: 'goal_progress' };

/**
 * 引导事件
 */
export type TutorialEvent =
  | { type: 'tutorial_start'; levelIndex: number }
  | { type: 'tutorial_complete'; levelIndex: number }
  | { type: 'tutorial_skip'; levelIndex: number }
  | { type: 'step_start'; levelIndex: number; stepId: string }
  | { type: 'step_complete'; levelIndex: number; stepId: string };

// ============================================
// 便捷函数
// ============================================

export function getTutorialManager(): TutorialManager | null {
  return TutorialManager.getInstance();
}

/**
 * 检查并启动关卡引导
 */
export async function checkAndStartTutorial(levelIndex: number, context: TutorialContext): Promise<boolean> {
  const manager = getTutorialManager();
  if (!manager) return false;

  if (manager.needsTutorial(levelIndex)) {
    await manager.startTutorial(levelIndex, context);
    return true;
  }

  return false;
}
