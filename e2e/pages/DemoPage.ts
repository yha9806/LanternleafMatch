/**
 * Demo 页面对象
 *
 * 封装 Demo 页面的所有交互和验证逻辑。
 */

import { BasePage, type ElementLocator, type GamePage } from './BasePage';
import { config, BOARD_LAYOUT, getTileCenter } from '../config';

/**
 * Demo 页面
 */
export class DemoPage extends BasePage implements GamePage {
  readonly url = config.demoPath;
  readonly name = 'demo';
  readonly description = 'Demo 演示页面 - 游戏核心玩法展示';

  /**
   * 页面元素定位器
   */
  static readonly Locators = {
    /** 游戏画布 */
    canvas: {
      description: 'Game Canvas',
      role: 'graphics-document',
    } as ElementLocator,

    /** 关卡标题 */
    levelTitle: {
      description: 'Level Title',
      role: 'heading',
    } as ElementLocator,

    /** 步数显示 */
    movesCounter: {
      description: 'Moves Counter',
      name: 'moves',
    } as ElementLocator,

    /** 目标显示 */
    goalDisplay: {
      description: 'Goal Display',
      name: 'goal',
    } as ElementLocator,

    /** 暂停按钮 */
    pauseButton: {
      description: 'Pause Button',
      role: 'button',
      name: 'pause',
    } as ElementLocator,
  };

  /**
   * 等待页面就绪
   */
  waitForReady() {
    // Canvas 游戏需要等待渲染完成
    return { time: 3 };
  }

  /**
   * 获取关键元素
   */
  getKeyElements(): ElementLocator[] {
    return [
      DemoPage.Locators.canvas,
    ];
  }

  /**
   * 验证页面状态
   */
  validateState(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    // 基本验证 - 实际验证在运行时通过 snapshot 进行
    return { valid: errors.length === 0, errors };
  }

  /**
   * 点击棋盘格子
   */
  clickTile(row: number, col: number): { x: number; y: number } {
    if (row < 0 || row >= BOARD_LAYOUT.rows || col < 0 || col >= BOARD_LAYOUT.cols) {
      throw new Error(`无效的格子坐标: (${row}, ${col})`);
    }
    return getTileCenter(row, col);
  }

  /**
   * 交换两个格子
   *
   * 返回两个点击坐标，实际操作需要依次点击
   */
  swapTiles(
    from: { row: number; col: number },
    to: { row: number; col: number }
  ): { from: { x: number; y: number }; to: { x: number; y: number } } {
    // 验证是相邻格子
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
      return {
        from: this.clickTile(from.row, from.col),
        to: this.clickTile(to.row, to.col),
      };
    }
    throw new Error(`无效的交换: 格子必须相邻`);
  }

  /**
   * 获取棋盘状态
   *
   * 通过 evaluate 执行 JS 获取游戏状态
   */
  getBoardState(): string {
    // 返回用于 evaluate 的 JS 代码
    return `() => {
      // 尝试从全局获取游戏状态
      if (typeof window !== 'undefined' && window.gameState) {
        return JSON.stringify(window.gameState);
      }
      return null;
    }`;
  }

  /**
   * 获取所有可能的交换位置
   */
  getAllSwapPositions(): Array<{
    from: { row: number; col: number };
    to: { row: number; col: number };
  }> {
    const swaps: Array<{
      from: { row: number; col: number };
      to: { row: number; col: number };
    }> = [];

    for (let row = 0; row < BOARD_LAYOUT.rows; row++) {
      for (let col = 0; col < BOARD_LAYOUT.cols; col++) {
        // 水平交换
        if (col < BOARD_LAYOUT.cols - 1) {
          swaps.push({
            from: { row, col },
            to: { row, col: col + 1 },
          });
        }
        // 垂直交换
        if (row < BOARD_LAYOUT.rows - 1) {
          swaps.push({
            from: { row, col },
            to: { row: row + 1, col },
          });
        }
      }
    }

    return swaps;
  }

  /**
   * 获取棋盘中心坐标（用于截图定位）
   */
  getBoardCenter(): { x: number; y: number } {
    return {
      x: BOARD_LAYOUT.offsetX + (BOARD_LAYOUT.cols * BOARD_LAYOUT.tileSize) / 2,
      y: BOARD_LAYOUT.offsetY + (BOARD_LAYOUT.rows * BOARD_LAYOUT.tileSize) / 2,
    };
  }

  /**
   * 检查是否是有效的关卡
   */
  isValidLevel(level: number): boolean {
    return level >= 1 && level <= 50;
  }
}

export default DemoPage;
