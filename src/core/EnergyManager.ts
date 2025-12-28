// ============================================
// 体力管理器
// ============================================

import type { IEnergyManager } from './interfaces';
import type { EnergyState } from '../types';

// 从 assets/resources/configs/energy.json 加载
import energyConfig from '../../assets/resources/configs/energy.json';

export class EnergyManager implements IEnergyManager {
  private config = energyConfig;

  /**
   * 获取当前体力（含离线回充计算）
   */
  getCurrentEnergy(state: EnergyState, now: number): EnergyState {
    // 重置小时/日计数器
    let newState = this.resetCountersIfNeeded(state, now);

    // 计算离线回充
    if (newState.current < newState.max) {
      const elapsed = now - newState.lastRegenTimestamp;
      const regenCount = Math.floor(elapsed / (this.config.energy_regen_seconds * 1000));

      if (regenCount > 0) {
        newState = {
          ...newState,
          current: Math.min(newState.current + regenCount, newState.max),
          lastRegenTimestamp: now - (elapsed % (this.config.energy_regen_seconds * 1000)),
        };
      }
    }

    return newState;
  }

  /**
   * 消耗体力
   */
  consumeEnergy(state: EnergyState): { success: boolean; newState: EnergyState } {
    if (state.current < this.config.consume_per_play) {
      return { success: false, newState: state };
    }

    const wasFull = state.current >= state.max;

    return {
      success: true,
      newState: {
        ...state,
        current: state.current - this.config.consume_per_play,
        // 如果之前满血，开始计时回充
        lastRegenTimestamp: wasFull ? Date.now() : state.lastRegenTimestamp,
      },
    };
  }

  /**
   * 广告奖励体力
   */
  rewardFromAd(state: EnergyState, now: number): { success: boolean; newState: EnergyState } {
    // 检查频控
    if (state.adCountHourly >= this.config.ad_hourly_cap) {
      return { success: false, newState: state };
    }
    if (state.adCountDaily >= this.config.ad_daily_cap) {
      return { success: false, newState: state };
    }

    // 溢出检查
    let newCurrent = state.current + this.config.ad_reward_energy;
    if (!this.config.overflow_allowed) {
      newCurrent = Math.min(newCurrent, state.max);
    }

    return {
      success: true,
      newState: {
        ...state,
        current: newCurrent,
        adCountHourly: state.adCountHourly + 1,
        adCountDaily: state.adCountDaily + 1,
      },
    };
  }

  /**
   * 获取下次回充的剩余秒数
   */
  getNextRegenSeconds(state: EnergyState, now: number): number {
    if (state.current >= state.max) {
      return 0;
    }

    const elapsed = now - state.lastRegenTimestamp;
    const regenMs = this.config.energy_regen_seconds * 1000;
    const remaining = regenMs - (elapsed % regenMs);

    return Math.ceil(remaining / 1000);
  }

  /**
   * 检查是否在新手保护期
   */
  isInNewbieProtection(currentLevel: number): boolean {
    if (!this.config.newbie_protection.enabled) {
      return false;
    }
    return currentLevel <= this.config.newbie_protection.free_levels;
  }

  /**
   * 创建初始体力状态
   */
  createInitialState(): EnergyState {
    const now = Date.now();
    return {
      current: this.config.energy_max,
      max: this.config.energy_max,
      lastRegenTimestamp: now,
      adCountHourly: 0,
      adCountDaily: 0,
      hourlyResetTimestamp: now,
      dailyResetTimestamp: now,
    };
  }

  // --- 私有方法 ---

  private resetCountersIfNeeded(state: EnergyState, now: number): EnergyState {
    let newState = { ...state };

    // 小时重置
    const hourMs = 60 * 60 * 1000;
    if (now - state.hourlyResetTimestamp >= hourMs) {
      newState = {
        ...newState,
        adCountHourly: 0,
        hourlyResetTimestamp: now,
      };
    }

    // 日重置（简化：24小时）
    const dayMs = 24 * 60 * 60 * 1000;
    if (now - state.dailyResetTimestamp >= dayMs) {
      newState = {
        ...newState,
        adCountDaily: 0,
        dailyResetTimestamp: now,
      };
    }

    return newState;
  }
}
