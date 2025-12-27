// ============================================
// 苔藓生成器
// ============================================

import type { IMossGenerator, IRNG } from './interfaces';
import type { Cell, PatternType } from '../types';

// 预计算的 BaseMask（6x6 棋盘）
const BASE_MASKS: Record<PatternType, Cell[]> = {
  none: [],

  edge_ring: [
    {row:0,col:0},{row:0,col:1},{row:0,col:2},{row:0,col:3},{row:0,col:4},{row:0,col:5},
    {row:1,col:0},{row:1,col:5},
    {row:2,col:0},{row:2,col:5},
    {row:3,col:0},{row:3,col:5},
    {row:4,col:0},{row:4,col:5},
    {row:5,col:0},{row:5,col:1},{row:5,col:2},{row:5,col:3},{row:5,col:4},{row:5,col:5},
  ],

  corners: [
    // 左上
    {row:0,col:0},{row:0,col:1},{row:1,col:0},{row:1,col:1},
    // 右上
    {row:0,col:4},{row:0,col:5},{row:1,col:4},{row:1,col:5},
    // 左下
    {row:4,col:0},{row:4,col:1},{row:5,col:0},{row:5,col:1},
    // 右下
    {row:4,col:4},{row:4,col:5},{row:5,col:4},{row:5,col:5},
  ],

  diagonal: [
    // 主对角线
    {row:0,col:0},{row:1,col:1},{row:2,col:2},{row:3,col:3},{row:4,col:4},{row:5,col:5},
    // 旁线
    {row:0,col:1},{row:1,col:2},{row:2,col:3},{row:3,col:4},{row:4,col:5},
  ],

  center_blob: [
    {row:2,col:2},{row:2,col:3},{row:2,col:4},
    {row:3,col:2},{row:3,col:3},{row:3,col:4},
    {row:4,col:2},{row:4,col:3},{row:4,col:4},
  ],

  center_cross: [
    // 中心两行
    {row:2,col:0},{row:2,col:1},{row:2,col:2},{row:2,col:3},{row:2,col:4},{row:2,col:5},
    {row:3,col:0},{row:3,col:1},{row:3,col:2},{row:3,col:3},{row:3,col:4},{row:3,col:5},
    // 中心两列（去重）
    {row:0,col:2},{row:1,col:2},{row:4,col:2},{row:5,col:2},
    {row:0,col:3},{row:1,col:3},{row:4,col:3},{row:5,col:3},
  ],

  stripes_h: [
    // 隔行：1, 3, 5
    {row:1,col:0},{row:1,col:1},{row:1,col:2},{row:1,col:3},{row:1,col:4},{row:1,col:5},
    {row:3,col:0},{row:3,col:1},{row:3,col:2},{row:3,col:3},{row:3,col:4},{row:3,col:5},
    {row:5,col:0},{row:5,col:1},{row:5,col:2},{row:5,col:3},{row:5,col:4},{row:5,col:5},
  ],

  stripes_v: [
    // 隔列：1, 3, 5
    {row:0,col:1},{row:1,col:1},{row:2,col:1},{row:3,col:1},{row:4,col:1},{row:5,col:1},
    {row:0,col:3},{row:1,col:3},{row:2,col:3},{row:3,col:3},{row:4,col:3},{row:5,col:3},
    {row:0,col:5},{row:1,col:5},{row:2,col:5},{row:3,col:5},{row:4,col:5},{row:5,col:5},
  ],

  scattered: [], // 特殊处理：全格 - 安全区
};

// 中心安全区（scattered 模式禁止放置）
const CENTER_SAFE_ZONE: Cell[] = [
  {row:2,col:2},{row:2,col:3},{row:3,col:2},{row:3,col:3},
];

export class MossGenerator implements IMossGenerator {

  getBaseMask(pattern: PatternType): Cell[] {
    if (pattern === 'scattered') {
      // 全格减去安全区
      const all: Cell[] = [];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const isSafe = CENTER_SAFE_ZONE.some(s => s.row === r && s.col === c);
          if (!isSafe) {
            all.push({row: r, col: c});
          }
        }
      }
      return all;
    }
    return BASE_MASKS[pattern] || [];
  }

  generateMossCells(pattern: PatternType, density: number, rng: IRNG): Cell[] {
    if (pattern === 'none' || density <= 0) {
      return [];
    }

    const baseMask = this.getBaseMask(pattern);
    if (baseMask.length === 0) {
      return [];
    }

    const k = Math.round(baseMask.length * density);
    if (k <= 0) {
      return [];
    }

    if (pattern === 'scattered') {
      return this.constrainedSampleScattered(baseMask, k, rng);
    }

    return rng.sample(baseMask, k);
  }

  /**
   * scattered 模式：受控散点（行列限额）
   */
  private constrainedSampleScattered(baseMask: Cell[], k: number, rng: IRNG): Cell[] {
    const ROW_CAP = 2;
    const COL_CAP = 2;

    const rowCount = new Map<number, number>();
    const colCount = new Map<number, number>();
    const result: Cell[] = [];

    // 打乱候选顺序
    const shuffled = rng.shuffle([...baseMask]);

    for (const cell of shuffled) {
      if (result.length >= k) break;

      const rCnt = rowCount.get(cell.row) || 0;
      const cCnt = colCount.get(cell.col) || 0;

      if (rCnt < ROW_CAP && cCnt < COL_CAP) {
        result.push(cell);
        rowCount.set(cell.row, rCnt + 1);
        colCount.set(cell.col, cCnt + 1);
      }
    }

    return result;
  }
}
