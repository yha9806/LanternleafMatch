// ============================================
// 可复现随机数生成器（基于 Mulberry32）
// ============================================

import type { IRNG } from './interfaces';

/**
 * Mulberry32 - 快速、可复现的 PRNG
 * 同一 seed 永远产生相同序列
 */
export class RNG implements IRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * 生成 [0, 1) 的随机数
   */
  random(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * 生成 [min, max] 的整数
   */
  randInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * 从数组中随机选择 k 个元素（不重复）
   */
  sample<T>(array: T[], k: number): T[] {
    const n = array.length;
    if (k >= n) return this.shuffle([...array]);

    const result: T[] = [];
    const indices = new Set<number>();

    while (result.length < k) {
      const idx = this.randInt(0, n - 1);
      if (!indices.has(idx)) {
        indices.add(idx);
        result.push(array[idx]);
      }
    }
    return result;
  }

  /**
   * Fisher-Yates 洗牌
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 根据权重随机选择
   */
  weightedChoice<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = this.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

/**
 * 生成稳定 seed（同一 player + level 永远相同）
 */
export function stableHash(playerId: string, levelIndex: number): number {
  let hash = 0;
  const str = `${playerId}:${levelIndex}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
