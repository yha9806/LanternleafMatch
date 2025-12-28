/**
 * 关卡选择页面对象
 *
 * 封装关卡选择页面的所有交互和验证逻辑。
 */

import { BasePage, type ElementLocator } from './BasePage';
import { config } from '../config';

/**
 * 关卡网格布局常量
 */
export const LEVEL_GRID = {
  /** 按钮尺寸 */
  buttonSize: 160,
  /** 按钮间距 */
  spacing: 20,
  /** 每行按钮数 */
  columns: 5,
  /** 总行数 */
  rows: 10,
  /** 总关卡数 */
  totalLevels: 50,
  /** 网格起始 X */
  startX: 50,
  /** 网格起始 Y */
  startY: 200,
};

/**
 * 关卡选择页面
 */
export class LevelSelectPage extends BasePage {
  readonly url = `file://${config.projectRoot}/demo/level-select.html`;
  readonly name = 'level-select';
  readonly description = '关卡选择页面 - 50 关地图';

  /**
   * 页面元素定位器
   */
  static readonly Locators = {
    /** 标题 */
    title: {
      description: 'Level Select Title',
      role: 'heading',
    } as ElementLocator,

    /** 返回按钮 */
    backButton: {
      description: 'Back Button',
      role: 'button',
      name: 'back',
    } as ElementLocator,

    /** 进度显示 */
    progressDisplay: {
      description: 'Progress Display',
      name: 'progress',
    } as ElementLocator,

    /** 总星数显示 */
    totalStars: {
      description: 'Total Stars Display',
      name: 'totalStars',
    } as ElementLocator,

    /** 关卡网格容器 */
    levelGrid: {
      description: 'Level Grid Container',
      name: 'levelGrid',
    } as ElementLocator,

    /** 滚动容器 */
    scrollView: {
      description: 'Scroll View',
      role: 'scrollbar',
    } as ElementLocator,
  };

  /**
   * 等待页面就绪
   */
  waitForReady() {
    return { time: 2 };
  }

  /**
   * 获取关键元素
   */
  getKeyElements(): ElementLocator[] {
    return [
      LevelSelectPage.Locators.title,
      LevelSelectPage.Locators.backButton,
      LevelSelectPage.Locators.levelGrid,
    ];
  }

  /**
   * 验证页面状态
   */
  validateState(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    return { valid: errors.length === 0, errors };
  }

  /**
   * 计算关卡按钮位置
   */
  getLevelButtonPosition(level: number): { x: number; y: number } {
    if (level < 1 || level > LEVEL_GRID.totalLevels) {
      throw new Error(`无效的关卡: ${level}，必须在 1-${LEVEL_GRID.totalLevels} 之间`);
    }

    const index = level - 1;
    const row = Math.floor(index / LEVEL_GRID.columns);
    const col = index % LEVEL_GRID.columns;

    const x = LEVEL_GRID.startX + col * (LEVEL_GRID.buttonSize + LEVEL_GRID.spacing) + LEVEL_GRID.buttonSize / 2;
    const y = LEVEL_GRID.startY + row * (LEVEL_GRID.buttonSize + LEVEL_GRID.spacing) + LEVEL_GRID.buttonSize / 2;

    return { x, y };
  }

  /**
   * 获取关卡按钮定位器
   */
  getLevelButtonLocator(level: number): ElementLocator {
    return {
      description: `Level ${level} Button`,
      role: 'button',
      name: `level-${level}`,
    };
  }

  /**
   * 获取返回按钮信息
   */
  getBackButtonInfo() {
    return {
      element: 'Back Button',
      ref: LevelSelectPage.Locators.backButton.name,
    };
  }

  /**
   * 检查关卡是否在可见区域
   * (用于判断是否需要滚动)
   */
  isLevelVisible(level: number, viewportHeight: number): boolean {
    const position = this.getLevelButtonPosition(level);
    // 假设顶部有 180px 的固定区域
    const visibleTop = 180;
    const visibleBottom = viewportHeight;
    return position.y >= visibleTop && position.y <= visibleBottom;
  }

  /**
   * 计算滚动到指定关卡需要的偏移
   */
  getScrollOffsetForLevel(level: number, viewportHeight: number): number {
    const position = this.getLevelButtonPosition(level);
    // 将关卡按钮滚动到视口中央
    const targetY = viewportHeight / 2;
    return position.y - targetY;
  }
}

export default LevelSelectPage;
