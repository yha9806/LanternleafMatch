import {
  _decorator, Component, Node, Label, Button, Toggle, Slider,
  tween, Vec3, UIOpacity
} from 'cc';
import { TweenEffects } from '../effects/TweenEffects';
import { getAnalyticsTracker } from '../analytics/AnalyticsTracker';

const { ccclass, property } = _decorator;

/**
 * 暂停弹窗操作
 */
export type PauseAction =
  | 'resume'        // 继续游戏
  | 'restart'       // 重新开始
  | 'home'          // 返回主页
  | 'settings';     // 打开设置

/**
 * 音频设置
 */
export interface AudioSettings {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  bgmVolume: number;
  sfxVolume: number;
}

/**
 * PauseModal - 暂停弹窗
 */
@ccclass('PauseModal')
export class PauseModal extends Component {
  // ============================================
  // UI 引用
  // ============================================

  @property(Node)
  modalPanel: Node = null!;

  @property(Node)
  maskNode: Node = null!;

  @property(Label)
  titleLabel: Label = null!;

  @property(Label)
  levelLabel: Label = null!;

  // ============================================
  // 按钮引用
  // ============================================

  @property(Button)
  resumeButton: Button = null!;

  @property(Button)
  restartButton: Button = null!;

  @property(Button)
  homeButton: Button = null!;

  // ============================================
  // 设置控件
  // ============================================

  @property(Node)
  settingsPanel: Node = null!;

  @property(Toggle)
  bgmToggle: Toggle = null!;

  @property(Toggle)
  sfxToggle: Toggle = null!;

  @property(Slider)
  bgmSlider: Slider = null!;

  @property(Slider)
  sfxSlider: Slider = null!;

  @property(Label)
  bgmVolumeLabel: Label = null!;

  @property(Label)
  sfxVolumeLabel: Label = null!;

  // ============================================
  // 状态
  // ============================================

  private currentLevel: number = 0;
  private resolveCallback: ((action: PauseAction) => void) | null = null;
  private audioSettings: AudioSettings = {
    bgmEnabled: true,
    sfxEnabled: true,
    bgmVolume: 0.7,
    sfxVolume: 1.0,
  };

  // ============================================
  // 生命周期
  // ============================================

  onLoad() {
    this.loadSettings();
    this.setupButtons();
    this.setupToggles();
    this.setupSliders();
    this.hide(false);
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 显示暂停弹窗
   */
  show(levelIndex: number): Promise<PauseAction> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.currentLevel = levelIndex;
      this.node.active = true;

      this.updateUI();
      this.playShowAnimation();

      // 埋点
      const tracker = getAnalyticsTracker();
      if (tracker) {
        tracker.trackButtonClick('pause_shown', `level_${levelIndex}`);
      }
    });
  }

  /**
   * 隐藏弹窗
   */
  hide(animated: boolean = true) {
    if (animated) {
      this.playHideAnimation(() => {
        this.node.active = false;
      });
    } else {
      this.node.active = false;
    }
  }

  /**
   * 获取音频设置
   */
  getAudioSettings(): AudioSettings {
    return { ...this.audioSettings };
  }

  // ============================================
  // UI 更新
  // ============================================

  private updateUI() {
    if (this.titleLabel) {
      this.titleLabel.string = '游戏暂停';
    }

    if (this.levelLabel) {
      this.levelLabel.string = `第 ${this.currentLevel} 关`;
    }

    // 更新音频控件
    this.updateAudioControls();
  }

  private updateAudioControls() {
    if (this.bgmToggle) {
      this.bgmToggle.isChecked = this.audioSettings.bgmEnabled;
    }
    if (this.sfxToggle) {
      this.sfxToggle.isChecked = this.audioSettings.sfxEnabled;
    }
    if (this.bgmSlider) {
      this.bgmSlider.progress = this.audioSettings.bgmVolume;
    }
    if (this.sfxSlider) {
      this.sfxSlider.progress = this.audioSettings.sfxVolume;
    }

    this.updateVolumeLabels();
  }

  private updateVolumeLabels() {
    if (this.bgmVolumeLabel) {
      const percent = Math.round(this.audioSettings.bgmVolume * 100);
      this.bgmVolumeLabel.string = `${percent}%`;
    }
    if (this.sfxVolumeLabel) {
      const percent = Math.round(this.audioSettings.sfxVolume * 100);
      this.sfxVolumeLabel.string = `${percent}%`;
    }
  }

  // ============================================
  // 动画
  // ============================================

  private playShowAnimation() {
    // 遮罩淡入
    if (this.maskNode) {
      let opacity = this.maskNode.getComponent(UIOpacity);
      if (!opacity) {
        opacity = this.maskNode.addComponent(UIOpacity);
      }
      opacity.opacity = 0;
      tween(opacity).to(0.2, { opacity: 200 }).start();
    }

    // 面板弹入
    if (this.modalPanel) {
      this.modalPanel.setScale(new Vec3(0.8, 0.8, 1));
      TweenEffects.spring(this.modalPanel, 1, 0.3);
    }
  }

  private playHideAnimation(onComplete: () => void) {
    // 遮罩淡出
    if (this.maskNode) {
      const opacity = this.maskNode.getComponent(UIOpacity);
      if (opacity) {
        tween(opacity).to(0.15, { opacity: 0 }).start();
      }
    }

    // 面板缩出
    if (this.modalPanel) {
      TweenEffects.scaleTo(this.modalPanel, 0.8, { duration: 0.15, easing: 'backIn' })
        .then(onComplete);
    } else {
      setTimeout(onComplete, 150);
    }
  }

  // ============================================
  // 按钮事件
  // ============================================

  private setupButtons() {
    if (this.resumeButton) {
      this.resumeButton.node.on('click', () => this.onAction('resume'), this);
    }
    if (this.restartButton) {
      this.restartButton.node.on('click', () => this.onAction('restart'), this);
    }
    if (this.homeButton) {
      this.homeButton.node.on('click', () => this.onAction('home'), this);
    }
  }

  private onAction(action: PauseAction) {
    // 埋点
    const tracker = getAnalyticsTracker();
    if (tracker) {
      tracker.trackButtonClick(`pause_${action}`, `level_${this.currentLevel}`);
    }

    // 保存设置
    this.saveSettings();

    if (this.resolveCallback) {
      this.resolveCallback(action);
      this.resolveCallback = null;
    }

    this.hide();
  }

  // ============================================
  // 音频控件事件
  // ============================================

  private setupToggles() {
    if (this.bgmToggle) {
      this.bgmToggle.node.on('toggle', this.onBgmToggle, this);
    }
    if (this.sfxToggle) {
      this.sfxToggle.node.on('toggle', this.onSfxToggle, this);
    }
  }

  private setupSliders() {
    if (this.bgmSlider) {
      this.bgmSlider.node.on('slide', this.onBgmSlide, this);
    }
    if (this.sfxSlider) {
      this.sfxSlider.node.on('slide', this.onSfxSlide, this);
    }
  }

  private onBgmToggle() {
    this.audioSettings.bgmEnabled = this.bgmToggle?.isChecked ?? true;
    this.applyAudioSettings();
  }

  private onSfxToggle() {
    this.audioSettings.sfxEnabled = this.sfxToggle?.isChecked ?? true;
    this.applyAudioSettings();
  }

  private onBgmSlide() {
    if (this.bgmSlider) {
      this.audioSettings.bgmVolume = this.bgmSlider.progress;
      this.updateVolumeLabels();
      this.applyAudioSettings();
    }
  }

  private onSfxSlide() {
    if (this.sfxSlider) {
      this.audioSettings.sfxVolume = this.sfxSlider.progress;
      this.updateVolumeLabels();
      this.applyAudioSettings();
    }
  }

  private applyAudioSettings() {
    // 通知 AudioManager 应用设置
    // 这里可以直接调用 AudioManager，或者通过事件系统
    this.node.emit('audio-settings-changed', this.audioSettings);
  }

  // ============================================
  // 设置持久化
  // ============================================

  private loadSettings() {
    try {
      const data = localStorage.getItem('lanternleaf_audio_settings');
      if (data) {
        this.audioSettings = { ...this.audioSettings, ...JSON.parse(data) };
      }
    } catch {
      // 使用默认值
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('lanternleaf_audio_settings', JSON.stringify(this.audioSettings));
    } catch {
      console.warn('[PauseModal] Failed to save audio settings');
    }
  }
}

// ============================================
// 便捷函数
// ============================================

let _pauseModal: PauseModal | null = null;

export function registerPauseModal(modal: PauseModal) {
  _pauseModal = modal;
}

export function getPauseModal(): PauseModal | null {
  return _pauseModal;
}

export async function showPauseMenu(levelIndex: number): Promise<PauseAction> {
  if (!_pauseModal) {
    console.warn('[PauseModal] Modal not registered');
    return 'resume';
  }

  return _pauseModal.show(levelIndex);
}
