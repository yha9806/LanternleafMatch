import { Vec2 } from 'cc';

/**
 * 道具类型
 */
export type BoosterType =
  | 'hammer'        // 锤子：消除单个格子
  | 'shuffle'       // 洗牌：重新排列棋盘
  | 'hint'          // 提示：显示可消除位置
  | 'row_clear'     // 横扫：清除一整行
  | 'col_clear'     // 纵扫：清除一整列
  | 'color_bomb';   // 颜色炸弹：消除所有同色

/**
 * 道具定义
 */
export interface BoosterDef {
  // 道具类型
  type: BoosterType;

  // 显示名称
  name: string;

  // 描述
  description: string;

  // 图标资源路径
  icon: string;

  // 使用时是否需要选择目标
  requiresTarget: boolean;

  // 目标类型
  targetType?: 'tile' | 'row' | 'column' | 'color';

  // 消耗步数（通常为 0）
  moveCost: number;

  // 基础价格（钻石/金币）
  basePrice: number;

  // 广告观看奖励数量
  adRewardCount: number;

  // 每日免费次数
  dailyFreeCount: number;

  // 新手保护期内免费次数
  newbieBonus: number;
}

/**
 * 道具配置表
 */
export const BOOSTER_DEFS: Record<BoosterType, BoosterDef> = {
  hammer: {
    type: 'hammer',
    name: '小锤子',
    description: '点击消除任意一个格子',
    icon: 'textures/ui/booster_hammer',
    requiresTarget: true,
    targetType: 'tile',
    moveCost: 0,
    basePrice: 50,
    adRewardCount: 1,
    dailyFreeCount: 0,
    newbieBonus: 3,
  },

  shuffle: {
    type: 'shuffle',
    name: '洗牌',
    description: '重新排列所有普通格子',
    icon: 'textures/ui/booster_shuffle',
    requiresTarget: false,
    moveCost: 0,
    basePrice: 30,
    adRewardCount: 1,
    dailyFreeCount: 1,
    newbieBonus: 5,
  },

  hint: {
    type: 'hint',
    name: '提示',
    description: '显示一个可消除的位置',
    icon: 'textures/ui/booster_hint',
    requiresTarget: false,
    moveCost: 0,
    basePrice: 20,
    adRewardCount: 2,
    dailyFreeCount: 3,
    newbieBonus: 10,
  },

  row_clear: {
    type: 'row_clear',
    name: '横扫',
    description: '选择一行，清除整行格子',
    icon: 'textures/ui/booster_row',
    requiresTarget: true,
    targetType: 'row',
    moveCost: 0,
    basePrice: 80,
    adRewardCount: 1,
    dailyFreeCount: 0,
    newbieBonus: 2,
  },

  col_clear: {
    type: 'col_clear',
    name: '纵扫',
    description: '选择一列，清除整列格子',
    icon: 'textures/ui/booster_col',
    requiresTarget: true,
    targetType: 'column',
    moveCost: 0,
    basePrice: 80,
    adRewardCount: 1,
    dailyFreeCount: 0,
    newbieBonus: 2,
  },

  color_bomb: {
    type: 'color_bomb',
    name: '颜色炸弹',
    description: '选择一种颜色，消除所有同色格子',
    icon: 'textures/ui/booster_color',
    requiresTarget: true,
    targetType: 'color',
    moveCost: 0,
    basePrice: 120,
    adRewardCount: 1,
    dailyFreeCount: 0,
    newbieBonus: 1,
  },
};

/**
 * 获取道具定义
 */
export function getBoosterDef(type: BoosterType): BoosterDef {
  return BOOSTER_DEFS[type];
}

/**
 * 获取所有道具类型
 */
export function getAllBoosterTypes(): BoosterType[] {
  return Object.keys(BOOSTER_DEFS) as BoosterType[];
}

/**
 * 道具使用结果
 */
export interface BoosterUseResult {
  success: boolean;
  boosterType: BoosterType;
  target?: Vec2 | number | string;  // 目标位置/行/列/颜色
  tilesAffected: Vec2[];
  error?: string;
}

/**
 * 道具库存
 */
export interface BoosterInventory {
  [key: string]: number;
}

/**
 * 道具使用记录
 */
export interface BoosterUsageRecord {
  type: BoosterType;
  timestamp: number;
  levelIndex: number;
  source: 'inventory' | 'ad' | 'free' | 'purchase';
}
