/**
 * 设置页面视图
 *
 * 提供音量、震动等设置选项。
 */

import {
  _decorator,
  Component,
  Node,
  Label,
  Button,
  Slider,
  Toggle,
  Color,
  tween,
  Vec3,
} from 'cc';
import { settingsManager, sceneManager, SceneName, playerProgress } from '../core';

const { ccclass, property } = _decorator;

@ccclass('SettingsView')
export class SettingsView extends Component {
  // ==================== 属性绑定 ====================

  @property(Label)
  titleLabel: Label | null = null;

  @property(Button)
  backButton: Button | null = null;

  // 背景音乐设置
  @property(Slider)
  bgmSlider: Slider | null = null;

  @property(Label)
  bgmValueLabel: Label | null = null;

  // 音效设置
  @property(Slider)
  sfxSlider: Slider | null = null;

  @property(Label)
  sfxValueLabel: Label | null = null;

  // 震动设置
  @property(Toggle)
  vibrationToggle: Toggle | null = null;

  @property(Label)
  vibrationLabel: Label | null = null;

  // 语言设置（预留）
  @property(Node)
  languageRow: Node | null = null;

  @property(Label)
  languageLabel: Label | null = null;

  // 重置按钮
  @property(Button)
  resetButton: Button | null = null;

  // 确认弹窗
  @property(Node)
  confirmModal: Node | null = null;

  @property(Button)
  confirmYesButton: Button | null = null;

  @property(Button)
  confirmNoButton: Button | null = null;

  // ==================== 生命周期 ====================

  onLoad() {
    // 初始化 UI
    this._initUI();

    // 绑定事件
    this._bindEvents();

    // 加载当前设置
    this._loadSettings();
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化 UI
   */
  private _initUI(): void {
    if (this.titleLabel) {
      this.titleLabel.string = '设置';
    }

    // 隐藏确认弹窗
    if (this.confirmModal) {
      this.confirmModal.active = false;
    }

    // 禁用语言选择（预留）
    if (this.languageRow) {
      // 显示"即将推出"
      if (this.languageLabel) {
        this.languageLabel.string = '简体中文 (即将推出)';
        this.languageLabel.color = new Color(150, 150, 150);
      }
    }
  }

  /**
   * 绑定事件
   */
  private _bindEvents(): void {
    // 返回按钮
    if (this.backButton) {
      this.backButton.node.on('click', this._onBackClick, this);
    }

    // BGM 滑块
    if (this.bgmSlider) {
      this.bgmSlider.node.on('slide', this._onBgmSlide, this);
    }

    // SFX 滑块
    if (this.sfxSlider) {
      this.sfxSlider.node.on('slide', this._onSfxSlide, this);
    }

    // 震动开关
    if (this.vibrationToggle) {
      this.vibrationToggle.node.on('toggle', this._onVibrationToggle, this);
    }

    // 重置按钮
    if (this.resetButton) {
      this.resetButton.node.on('click', this._onResetClick, this);
    }

    // 确认弹窗按钮
    if (this.confirmYesButton) {
      this.confirmYesButton.node.on('click', this._onConfirmYes, this);
    }

    if (this.confirmNoButton) {
      this.confirmNoButton.node.on('click', this._onConfirmNo, this);
    }
  }

  /**
   * 加载当前设置
   */
  private _loadSettings(): void {
    const settings = settingsManager.getData();

    // BGM 音量
    if (this.bgmSlider) {
      this.bgmSlider.progress = settings.bgmVolume;
    }
    this._updateBgmLabel(settings.bgmVolume);

    // SFX 音量
    if (this.sfxSlider) {
      this.sfxSlider.progress = settings.sfxVolume;
    }
    this._updateSfxLabel(settings.sfxVolume);

    // 震动
    if (this.vibrationToggle) {
      this.vibrationToggle.isChecked = settings.vibration;
    }
    this._updateVibrationLabel(settings.vibration);
  }

  /**
   * 更新 BGM 标签
   */
  private _updateBgmLabel(volume: number): void {
    if (this.bgmValueLabel) {
      this.bgmValueLabel.string = `${Math.round(volume * 100)}%`;
    }
  }

  /**
   * 更新 SFX 标签
   */
  private _updateSfxLabel(volume: number): void {
    if (this.sfxValueLabel) {
      this.sfxValueLabel.string = `${Math.round(volume * 100)}%`;
    }
  }

  /**
   * 更新震动标签
   */
  private _updateVibrationLabel(enabled: boolean): void {
    if (this.vibrationLabel) {
      this.vibrationLabel.string = enabled ? 'ON' : 'OFF';
      this.vibrationLabel.color = enabled
        ? new Color(100, 255, 100)
        : new Color(150, 150, 150);
    }
  }

  /**
   * 显示确认弹窗
   */
  private _showConfirmModal(): void {
    if (!this.confirmModal) return;

    this.confirmModal.active = true;
    this.confirmModal.setScale(new Vec3(0.8, 0.8, 1));

    tween(this.confirmModal)
      .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }

  /**
   * 隐藏确认弹窗
   */
  private _hideConfirmModal(): void {
    if (!this.confirmModal) return;

    tween(this.confirmModal)
      .to(0.15, { scale: new Vec3(0.8, 0.8, 1) })
      .call(() => {
        this.confirmModal!.active = false;
      })
      .start();
  }

  // ==================== 事件处理 ====================

  /**
   * 返回按钮点击
   */
  private async _onBackClick(): Promise<void> {
    await sceneManager.loadScene(SceneName.Menu);
  }

  /**
   * BGM 滑块变化
   */
  private _onBgmSlide(slider: Slider): void {
    const volume = slider.progress;
    settingsManager.setBgmVolume(volume);
    this._updateBgmLabel(volume);
  }

  /**
   * SFX 滑块变化
   */
  private _onSfxSlide(slider: Slider): void {
    const volume = slider.progress;
    settingsManager.setSfxVolume(volume);
    this._updateSfxLabel(volume);

    // 播放测试音效
    // audioManager.playSFX('sfx_button');
  }

  /**
   * 震动开关变化
   */
  private _onVibrationToggle(toggle: Toggle): void {
    const enabled = toggle.isChecked;
    settingsManager.setVibration(enabled);
    this._updateVibrationLabel(enabled);
  }

  /**
   * 重置按钮点击
   */
  private _onResetClick(): void {
    this._showConfirmModal();
  }

  /**
   * 确认重置
   */
  private _onConfirmYes(): void {
    // 重置进度（不重置设置）
    playerProgress.reset();

    // 隐藏弹窗
    this._hideConfirmModal();

    // 显示提示
    console.log('游戏进度已重置');
    // TODO: 显示 Toast 提示
  }

  /**
   * 取消重置
   */
  private _onConfirmNo(): void {
    this._hideConfirmModal();
  }

  // ==================== 公共方法 ====================

  /**
   * 刷新设置显示
   */
  refresh(): void {
    this._loadSettings();
  }
}

export default SettingsView;
