/**
 * 设置页面对象
 *
 * 封装设置页面的所有交互和验证逻辑。
 */

import { BasePage, type ElementLocator } from './BasePage';
import { config } from '../config';

/**
 * 设置页面
 */
export class SettingsPage extends BasePage {
  readonly url = `file://${config.projectRoot}/demo/settings.html`;
  readonly name = 'settings';
  readonly description = '设置页面 - 游戏设置';

  /**
   * 页面元素定位器
   */
  static readonly Locators = {
    /** 标题 */
    title: {
      description: 'Settings Title',
      role: 'heading',
    } as ElementLocator,

    /** 返回按钮 */
    backButton: {
      description: 'Back Button',
      role: 'button',
      name: 'back',
    } as ElementLocator,

    /** BGM 音量滑块 */
    bgmSlider: {
      description: 'BGM Volume Slider',
      role: 'slider',
      name: 'bgmVolume',
    } as ElementLocator,

    /** BGM 音量数值 */
    bgmValue: {
      description: 'BGM Volume Value',
      name: 'bgmValue',
    } as ElementLocator,

    /** SFX 音量滑块 */
    sfxSlider: {
      description: 'SFX Volume Slider',
      role: 'slider',
      name: 'sfxVolume',
    } as ElementLocator,

    /** SFX 音量数值 */
    sfxValue: {
      description: 'SFX Volume Value',
      name: 'sfxValue',
    } as ElementLocator,

    /** 震动开关 */
    vibrationToggle: {
      description: 'Vibration Toggle',
      role: 'switch',
      name: 'vibration',
    } as ElementLocator,

    /** 震动状态标签 */
    vibrationLabel: {
      description: 'Vibration Label',
      name: 'vibrationLabel',
    } as ElementLocator,

    /** 语言选择 */
    languageSelect: {
      description: 'Language Select',
      name: 'language',
    } as ElementLocator,

    /** 重置按钮 */
    resetButton: {
      description: 'Reset Progress Button',
      role: 'button',
      name: 'reset',
    } as ElementLocator,

    /** 确认弹窗 */
    confirmModal: {
      description: 'Confirm Modal',
      role: 'dialog',
      name: 'confirmModal',
    } as ElementLocator,

    /** 确认按钮 */
    confirmYes: {
      description: 'Confirm Yes Button',
      role: 'button',
      name: 'confirmYes',
    } as ElementLocator,

    /** 取消按钮 */
    confirmNo: {
      description: 'Confirm No Button',
      role: 'button',
      name: 'confirmNo',
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
      SettingsPage.Locators.title,
      SettingsPage.Locators.backButton,
      SettingsPage.Locators.bgmSlider,
      SettingsPage.Locators.sfxSlider,
      SettingsPage.Locators.vibrationToggle,
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
   * 获取返回按钮信息
   */
  getBackButtonInfo() {
    return {
      element: 'Back Button',
      ref: SettingsPage.Locators.backButton.name,
    };
  }

  /**
   * 获取 BGM 滑块信息
   */
  getBgmSliderInfo() {
    return {
      element: 'BGM Volume Slider',
      ref: SettingsPage.Locators.bgmSlider.name,
    };
  }

  /**
   * 获取 SFX 滑块信息
   */
  getSfxSliderInfo() {
    return {
      element: 'SFX Volume Slider',
      ref: SettingsPage.Locators.sfxSlider.name,
    };
  }

  /**
   * 获取震动开关信息
   */
  getVibrationToggleInfo() {
    return {
      element: 'Vibration Toggle',
      ref: SettingsPage.Locators.vibrationToggle.name,
    };
  }

  /**
   * 获取重置按钮信息
   */
  getResetButtonInfo() {
    return {
      element: 'Reset Progress Button',
      ref: SettingsPage.Locators.resetButton.name,
    };
  }

  /**
   * 计算滑块值对应的位置
   * (假设滑块宽度为 400px)
   */
  getSliderPositionForValue(value: number, sliderWidth: number = 400): number {
    if (value < 0 || value > 1) {
      throw new Error(`无效的滑块值: ${value}，必须在 0-1 之间`);
    }
    return value * sliderWidth;
  }
}

export default SettingsPage;
