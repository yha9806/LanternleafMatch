/**
 * 页面对象基类
 *
 * Page Object Model (POM) 模式的基类，
 * 定义所有页面对象的通用接口和方法。
 */

import { config, type ViewportConfig, type WaitConfig } from '../config';

/**
 * 页面状态
 */
export interface PageState {
  url: string;
  title: string;
  loaded: boolean;
  viewport: ViewportConfig;
}

/**
 * 页面元素定位器
 */
export interface ElementLocator {
  /** 元素描述（用于日志和报告） */
  description: string;
  /** 元素引用（来自 accessibility snapshot） */
  ref?: string;
  /** 角色（用于查找） */
  role?: string;
  /** 名称（用于查找） */
  name?: string;
}

/**
 * 页面对象基类
 */
export abstract class BasePage {
  /** 页面 URL */
  abstract readonly url: string;

  /** 页面名称（用于截图命名） */
  abstract readonly name: string;

  /** 页面描述 */
  abstract readonly description: string;

  /** 默认视口尺寸 */
  viewport: ViewportConfig = config.defaultViewport;

  /** 页面等待配置 */
  waitConfig: WaitConfig = { time: 2 };

  /**
   * 获取导航 URL
   */
  getUrl(): string {
    return this.url;
  }

  /**
   * 获取截图文件名
   */
  getScreenshotName(suffix?: string): string {
    const base = this.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    return suffix ? `${base}_${suffix}.png` : `${base}.png`;
  }

  /**
   * 获取页面配置（用于审查系统）
   */
  getPageConfig() {
    return {
      name: this.name,
      url: this.url,
      viewport: this.viewport,
      waitFor: this.waitConfig,
      description: this.description,
    };
  }

  /**
   * 等待页面就绪（子类实现具体逻辑）
   *
   * 在实际测试中，这个方法应该：
   * 1. 等待关键元素出现
   * 2. 等待动画完成
   * 3. 确保页面交互就绪
   */
  abstract waitForReady(): WaitConfig;

  /**
   * 获取页面关键元素定位器（子类实现）
   */
  abstract getKeyElements(): ElementLocator[];

  /**
   * 验证页面状态（子类实现）
   */
  abstract validateState(): { valid: boolean; errors: string[] };
}

/**
 * 可交互页面接口
 */
export interface InteractivePage {
  /**
   * 点击指定元素
   */
  click(locator: ElementLocator): void;

  /**
   * 输入文本
   */
  type(locator: ElementLocator, text: string): void;

  /**
   * 获取元素文本
   */
  getText(locator: ElementLocator): string;
}

/**
 * 游戏页面接口（Canvas 特有）
 */
export interface GamePage {
  /**
   * 点击棋盘格子
   */
  clickTile(row: number, col: number): { x: number; y: number };

  /**
   * 交换两个格子
   */
  swapTiles(from: { row: number; col: number }, to: { row: number; col: number }): void;

  /**
   * 获取棋盘状态（如果可获取）
   */
  getBoardState(): unknown;
}

export default BasePage;
