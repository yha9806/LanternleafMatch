import { Vec2 } from 'cc';

/**
 * 引导步骤类型
 */
export type TutorialStepType =
  | 'highlight_swap'     // 高亮交换操作
  | 'highlight_tile'     // 高亮特定格子
  | 'highlight_goal'     // 高亮目标区域
  | 'highlight_hud'      // 高亮 HUD 元素
  | 'show_dialog'        // 显示对话框
  | 'wait_action'        // 等待玩家操作
  | 'auto_swap'          // 自动演示交换
  | 'free_play';         // 自由操作（带提示）

/**
 * 引导步骤定义
 */
export interface TutorialStepDef {
  // 步骤 ID
  id: string;

  // 步骤类型
  type: TutorialStepType;

  // 显示文本
  text?: string;

  // 文本位置
  textPosition?: 'top' | 'bottom' | 'center';

  // 高亮目标（格子坐标或 UI 名称）
  highlightTarget?: Vec2 | Vec2[] | string;

  // 交换操作（起点和终点坐标）
  swapFrom?: Vec2;
  swapTo?: Vec2;

  // 延迟（毫秒）
  delay?: number;

  // 是否需要玩家确认
  requireTap?: boolean;

  // 完成条件
  completeCondition?: TutorialCompleteCondition;

  // 跳过条件
  skipCondition?: () => boolean;
}

/**
 * 完成条件类型
 */
export type TutorialCompleteCondition =
  | { type: 'tap' }                           // 点击任意位置
  | { type: 'swap'; from: Vec2; to: Vec2 }    // 完成指定交换
  | { type: 'any_swap' }                      // 完成任意交换
  | { type: 'match'; count?: number }         // 完成消除
  | { type: 'delay'; ms: number }             // 延迟后自动完成
  | { type: 'goal_progress' };                // 目标有进度

/**
 * 关卡引导配置
 */
export interface LevelTutorialConfig {
  // 关卡索引
  levelIndex: number;

  // 引导步骤
  steps: TutorialStepDef[];

  // 是否强制引导（不可跳过）
  mandatory?: boolean;

  // 引导主题
  theme?: string;
}

// ============================================
// 预定义关卡引导
// ============================================

/**
 * 第 1 关：基础交换教学
 */
export const LEVEL_1_TUTORIAL: LevelTutorialConfig = {
  levelIndex: 1,
  mandatory: true,
  theme: '基础交换',
  steps: [
    {
      id: 'welcome',
      type: 'show_dialog',
      text: '欢迎来到灯笼叶子消消乐！',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'explain_swap',
      type: 'show_dialog',
      text: '滑动交换相邻的图案，让三个或更多相同的图案连成一线',
      textPosition: 'bottom',
      requireTap: true,
    },
    {
      id: 'highlight_first_swap',
      type: 'highlight_swap',
      text: '试试滑动这两个格子',
      textPosition: 'top',
      swapFrom: new Vec2(2, 3),
      swapTo: new Vec2(3, 3),
      completeCondition: { type: 'any_swap' },
    },
    {
      id: 'good_job',
      type: 'show_dialog',
      text: '太棒了！继续消除来完成目标吧',
      textPosition: 'center',
      delay: 500,
      requireTap: true,
    },
    {
      id: 'free_play',
      type: 'free_play',
      text: '',
    },
  ],
};

/**
 * 第 2 关：消除目标教学
 */
export const LEVEL_2_TUTORIAL: LevelTutorialConfig = {
  levelIndex: 2,
  mandatory: true,
  theme: '收集目标',
  steps: [
    {
      id: 'explain_goal',
      type: 'show_dialog',
      text: '每一关都有收集目标',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'highlight_goal_area',
      type: 'highlight_hud',
      text: '看这里！这是本关需要收集的物品和数量',
      textPosition: 'bottom',
      highlightTarget: 'goal_widget',
      requireTap: true,
    },
    {
      id: 'highlight_moves',
      type: 'highlight_hud',
      text: '注意步数！用完步数前完成目标才能过关',
      textPosition: 'bottom',
      highlightTarget: 'moves_label',
      requireTap: true,
    },
    {
      id: 'free_play',
      type: 'free_play',
      text: '',
    },
  ],
};

/**
 * 第 3 关：苔藓清除教学
 */
export const LEVEL_3_TUTORIAL: LevelTutorialConfig = {
  levelIndex: 3,
  mandatory: true,
  theme: '苔藓障碍',
  steps: [
    {
      id: 'introduce_moss',
      type: 'show_dialog',
      text: '看到这些绿色的苔藓了吗？',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'highlight_moss',
      type: 'highlight_tile',
      text: '在苔藓上消除图案就能清理它',
      textPosition: 'top',
      highlightTarget: 'moss_tiles',
      requireTap: true,
    },
    {
      id: 'clear_moss_hint',
      type: 'show_dialog',
      text: '有时候目标就是清除所有苔藓哦',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'free_play',
      type: 'free_play',
      text: '',
    },
  ],
};

/**
 * 第 5 关：4 连特殊块教学
 */
export const LEVEL_5_TUTORIAL: LevelTutorialConfig = {
  levelIndex: 5,
  mandatory: false,
  theme: '旋风特殊块',
  steps: [
    {
      id: 'introduce_special',
      type: 'show_dialog',
      text: '连成 4 个会产生旋风特殊块！',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'explain_whirl',
      type: 'show_dialog',
      text: '旋风块可以清除整行或整列',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'show_direction',
      type: 'show_dialog',
      text: '横向连成的旋风清除整行\n竖向连成的旋风清除整列',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'free_play',
      type: 'free_play',
      text: '',
    },
  ],
};

/**
 * 第 8 关：5 连特殊块教学
 */
export const LEVEL_8_TUTORIAL: LevelTutorialConfig = {
  levelIndex: 8,
  mandatory: false,
  theme: '灯笼特殊块',
  steps: [
    {
      id: 'introduce_lantern',
      type: 'show_dialog',
      text: '哇！连成 5 个会产生灯笼！',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'explain_lantern',
      type: 'show_dialog',
      text: '灯笼会清除周围 3×3 范围的所有格子',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'tip',
      type: 'show_dialog',
      text: '尝试制造更多特殊块来轻松过关吧！',
      textPosition: 'center',
      requireTap: true,
    },
    {
      id: 'free_play',
      type: 'free_play',
      text: '',
    },
  ],
};

/**
 * 所有关卡引导配置
 */
export const LEVEL_TUTORIALS: LevelTutorialConfig[] = [
  LEVEL_1_TUTORIAL,
  LEVEL_2_TUTORIAL,
  LEVEL_3_TUTORIAL,
  LEVEL_5_TUTORIAL,
  LEVEL_8_TUTORIAL,
];

/**
 * 根据关卡索引获取引导配置
 */
export function getTutorialForLevel(levelIndex: number): LevelTutorialConfig | null {
  return LEVEL_TUTORIALS.find(t => t.levelIndex === levelIndex) || null;
}
