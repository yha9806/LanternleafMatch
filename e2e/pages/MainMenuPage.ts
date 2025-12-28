/**
 * 主菜单页面对象
 *
 * 封装主菜单页面的所有交互和验证逻辑。
 */

import { BasePage, type ElementLocator } from './BasePage';
import { config } from '../config';

/**
 * 主菜单页面
 */
export class MainMenuPage extends BasePage {
  readonly url = `file://${config.projectRoot}/demo/menu.html`;
  readonly name = 'main-menu';
  readonly description = '主菜单页面 - 游戏入口';

  /**
   * 页面元素定位器
   */
  static readonly Locators = {
    /** 游戏标题 */
    title: {
      description: 'Game Title',
      role: 'heading',
    } as ElementLocator,

    /** 开始游戏按钮 */
    startButton: {
      description: 'Start Game Button',
      role: 'button',
      name: 'start',
    } as ElementLocator,

    /** 设置按钮 */
    settingsButton: {
      description: 'Settings Button',
      role: 'button',
      name: 'settings',
    } as ElementLocator,

    /** 当前关卡显示 */
    currentLevel: {
      description: 'Current Level Display',
      name: 'currentLevel',
    } as ElementLocator,

    /** 总星数显示 */
    totalStars: {
      description: 'Total Stars Display',
      name: 'totalStars',
    } as ElementLocator,

    /** 体力显示 */
    energyDisplay: {
      description: 'Energy Display',
      name: 'energy',
    } as ElementLocator,

    /** 角色展示区 */
    characterArea: {
      description: 'Character Display Area',
      name: 'character',
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
      MainMenuPage.Locators.title,
      MainMenuPage.Locators.startButton,
      MainMenuPage.Locators.settingsButton,
    ];
  }

  /**
   * 验证页面状态
   */
  validateState(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    // 验证将在运行时通过 snapshot 进行
    return { valid: errors.length === 0, errors };
  }

  /**
   * 获取开始按钮信息
   */
  getStartButtonInfo() {
    return {
      element: 'Start Game Button',
      ref: MainMenuPage.Locators.startButton.name,
    };
  }

  /**
   * 获取设置按钮信息
   */
  getSettingsButtonInfo() {
    return {
      element: 'Settings Button',
      ref: MainMenuPage.Locators.settingsButton.name,
    };
  }
}

export default MainMenuPage;
