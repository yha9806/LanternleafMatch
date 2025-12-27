// ============================================
// 目标追踪器
// 职责：更新目标进度、判断完成状态
// ============================================

import type { IGoalTracker } from './interfaces';
import type { Goal, GoalCollect, GoalClearMoss, GoalCombo, MatchResult, Cell } from '../types';

export class GoalTracker implements IGoalTracker {

  /**
   * 更新目标进度
   */
  updateProgress(goals: Goal[], result: MatchResult, totalMossCount?: number): Goal[] {
    return goals.map(goal => {
      switch (goal.type) {
        case 'collect':
          return this.updateCollectGoal(goal, result);

        case 'clear_moss':
          return this.updateClearMossGoal(goal, result);

        case 'combo':
          return this.updateComboGoal(goal, result);

        default:
          return goal;
      }
    });
  }

  /**
   * 检查是否全部完成
   */
  isAllCompleted(goals: Goal[]): boolean {
    return goals.every(goal => this.isGoalCompleted(goal));
  }

  /**
   * 获取目标完成百分比（0-1）
   */
  getProgress(goals: Goal[]): number {
    if (goals.length === 0) return 1;

    const progresses = goals.map(goal => this.getGoalProgress(goal));
    return progresses.reduce((a, b) => a + b, 0) / goals.length;
  }

  /**
   * 初始化苔藓目标的总数（用于 clear_moss 目标）
   */
  initializeMossGoal(goals: Goal[], mossCells: Cell[]): Goal[] {
    return goals.map(goal => {
      if (goal.type === 'clear_moss' && goal.count === 0) {
        // count=0 表示清除全部，设置实际数量
        return { ...goal, count: mossCells.length };
      }
      if (goal.type === 'combo' && goal.clearMoss.count === 0) {
        return {
          ...goal,
          clearMoss: { ...goal.clearMoss, count: mossCells.length }
        };
      }
      return goal;
    });
  }

  // --- 私有方法 ---

  private updateCollectGoal(goal: GoalCollect, result: MatchResult): GoalCollect {
    const collected = result.collectedTiles[goal.item] || 0;
    return {
      ...goal,
      current: Math.min(goal.current + collected, goal.count),
    };
  }

  private updateClearMossGoal(goal: GoalClearMoss, result: MatchResult): GoalClearMoss {
    const cleared = result.clearedMoss.length;
    return {
      ...goal,
      current: goal.current + cleared,
    };
  }

  private updateComboGoal(goal: GoalCombo, result: MatchResult): GoalCombo {
    return {
      ...goal,
      collect: this.updateCollectGoal(goal.collect, result),
      clearMoss: this.updateClearMossGoal(goal.clearMoss, result),
    };
  }

  private isGoalCompleted(goal: Goal): boolean {
    switch (goal.type) {
      case 'collect':
        return goal.current >= goal.count;

      case 'clear_moss':
        return goal.current >= goal.count;

      case 'combo':
        return (
          goal.collect.current >= goal.collect.count &&
          goal.clearMoss.current >= goal.clearMoss.count
        );

      default:
        return false;
    }
  }

  private getGoalProgress(goal: Goal): number {
    switch (goal.type) {
      case 'collect':
        return Math.min(goal.current / goal.count, 1);

      case 'clear_moss':
        return goal.count > 0 ? Math.min(goal.current / goal.count, 1) : 1;

      case 'combo': {
        const collectProgress = goal.collect.current / goal.collect.count;
        const mossProgress = goal.clearMoss.count > 0
          ? goal.clearMoss.current / goal.clearMoss.count
          : 1;
        return Math.min((collectProgress + mossProgress) / 2, 1);
      }

      default:
        return 0;
    }
  }
}
