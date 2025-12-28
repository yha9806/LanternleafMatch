import {
  _decorator, Component, Node, Label, Button, Sprite, Color,
  tween, Vec3, UIOpacity
} from 'cc';
import { EnergyManager, getEnergyManager } from '../core/EnergyManager';
import { RewardedAdManager, getRewardedAdManager, AdShowResult } from '../ads/RewardedAdManager';
import { TweenEffects } from '../effects/TweenEffects';

const { ccclass, property } = _decorator;

/**
 * 体力门户结果
 */
export type EnergyGateResult =
  | 'watch_ad'      // 看广告获得体力
  | 'wait'         // 选择等待
  | 'purchase'     // 购买体力（IAP）
  | 'cancel';      // 关闭弹窗

/**
 * EnergyGateModal - 体力门户弹窗
 * 当玩家体力不足时显示，提供看广告、等待、购买选项
 */
@ccclass('EnergyGateModal')
export class EnergyGateModal extends Component {
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
  energyCountLabel: Label = null!;

  @property(Label)
  timerLabel: Label = null!;

  @property(Label)
  adRemainingLabel: Label = null!;

  @property(Button)
  watchAdButton: Button = null!;

  @property(Button)
  waitButton: Button = null!;

  @property(Button)
  purchaseButton: Button = null!;

  @property(Button)
  closeButton: Button = null!;

  @property(Node)
  energyIconsContainer: Node = null!;

  @property(Node)
  loadingIndicator: Node = null!;

  // ============================================
  // 配置
  // ============================================

  @property
  adRewardEnergy: number = 1;

  @property
  purchaseEnergy: number = 5;

  @property
  purchasePrice: string = '¥6';

  // ============================================
  // 内部状态
  // ============================================

  private isShowing: boolean = false;
  private timerInterval: any = null;
  private resolveCallback: ((result: EnergyGateResult) => void) | null = null;

  // ============================================
  // 生命周期
  // ============================================

  onLoad() {
    this.setupButtons();
    this.hide(false);
  }

  onDestroy() {
    this.stopTimer();
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 显示体力门户
   * @returns Promise，解析为用户选择的结果
   */
  show(): Promise<EnergyGateResult> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.isShowing = true;
      this.node.active = true;

      this.updateUI();
      this.startTimer();
      this.playShowAnimation();
    });
  }

  /**
   * 隐藏弹窗
   */
  hide(animated: boolean = true) {
    this.isShowing = false;
    this.stopTimer();

    if (animated) {
      this.playHideAnimation(() => {
        this.node.active = false;
      });
    } else {
      this.node.active = false;
    }
  }

  /**
   * 检查是否需要显示体力门户
   */
  static shouldShow(): boolean {
    const energyManager = getEnergyManager();
    return energyManager ? !energyManager.canPlay() : false;
  }

  // ============================================
  // UI 更新
  // ============================================

  private updateUI() {
    const energyManager = getEnergyManager();
    const adManager = getRewardedAdManager();

    if (energyManager) {
      const state = energyManager.getState();

      // 更新体力显示
      if (this.energyCountLabel) {
        this.energyCountLabel.string = `${state.current}/${state.max}`;
      }

      // 更新体力图标
      this.updateEnergyIcons(state.current, state.max);

      // 更新恢复时间
      this.updateTimerDisplay(state.nextRegenTime);
    }

    // 更新广告按钮状态
    if (adManager && this.watchAdButton) {
      const adAvailable = adManager.isAdAvailable('energy_refill');
      const remaining = adManager.getRemainingWatches();

      this.watchAdButton.interactable = adAvailable;

      if (this.adRemainingLabel) {
        if (remaining.hourly > 0) {
          this.adRemainingLabel.string = `今日剩余 ${remaining.hourly} 次`;
          this.adRemainingLabel.color = new Color(255, 255, 255, 255);
        } else {
          this.adRemainingLabel.string = '已达上限';
          this.adRemainingLabel.color = new Color(200, 100, 100, 255);
        }
      }
    }

    // 更新购买按钮
    if (this.purchaseButton) {
      const btnLabel = this.purchaseButton.node.getComponentInChildren(Label);
      if (btnLabel) {
        btnLabel.string = `购买 ${this.purchaseEnergy} 体力 ${this.purchasePrice}`;
      }
    }
  }

  private updateEnergyIcons(current: number, max: number) {
    if (!this.energyIconsContainer) return;

    const icons = this.energyIconsContainer.children;
    for (let i = 0; i < icons.length; i++) {
      const icon = icons[i];
      const sprite = icon.getComponent(Sprite);
      if (sprite) {
        // 有体力的图标亮，没体力的图标暗
        sprite.color = i < current
          ? new Color(255, 255, 255, 255)
          : new Color(100, 100, 100, 150);
      }
    }
  }

  private updateTimerDisplay(nextRegenTime: number | null) {
    if (!this.timerLabel) return;

    if (nextRegenTime === null) {
      this.timerLabel.string = '体力已满';
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, nextRegenTime - now);

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    this.timerLabel.string = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // ============================================
  // 计时器
  // ============================================

  private startTimer() {
    this.stopTimer();

    this.timerInterval = setInterval(() => {
      if (!this.isShowing) {
        this.stopTimer();
        return;
      }

      const energyManager = getEnergyManager();
      if (energyManager) {
        energyManager.update(); // 检查是否恢复了体力
        const state = energyManager.getState();

        this.updateTimerDisplay(state.nextRegenTime);
        this.updateEnergyIcons(state.current, state.max);

        // 如果体力恢复了，更新计数
        if (this.energyCountLabel) {
          this.energyCountLabel.string = `${state.current}/${state.max}`;
        }

        // 如果体力已足够，可以自动关闭或更新按钮
        if (state.current > 0) {
          // 可选：自动关闭弹窗
          // this.onWait();
        }
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ============================================
  // 按钮事件
  // ============================================

  private setupButtons() {
    if (this.watchAdButton) {
      this.watchAdButton.node.on('click', this.onWatchAd, this);
    }
    if (this.waitButton) {
      this.waitButton.node.on('click', this.onWait, this);
    }
    if (this.purchaseButton) {
      this.purchaseButton.node.on('click', this.onPurchase, this);
    }
    if (this.closeButton) {
      this.closeButton.node.on('click', this.onClose, this);
    }
    if (this.maskNode) {
      this.maskNode.on(Node.EventType.TOUCH_END, this.onClose, this);
    }
  }

  private async onWatchAd() {
    const adManager = getRewardedAdManager();
    if (!adManager) {
      this.showError('广告系统未就绪');
      return;
    }

    // 显示加载中
    this.setLoading(true);
    this.watchAdButton.interactable = false;

    try {
      const result: AdShowResult = await adManager.show('energy_refill');

      if (result.rewarded) {
        // 广告看完，发放奖励
        const energyManager = getEnergyManager();
        if (energyManager) {
          energyManager.addEnergy(this.adRewardEnergy, 'ad_reward');
        }

        this.showSuccess(`获得 ${this.adRewardEnergy} 点体力！`);

        // 延迟关闭
        setTimeout(() => {
          this.resolveAndClose('watch_ad');
        }, 1000);
      } else if (result.error) {
        this.showError(result.error.errMsg);
      } else {
        // 用户提前关闭
        this.showError('观看完整视频才能获得奖励哦');
      }
    } catch (error) {
      this.showError('广告加载失败，请稍后重试');
    } finally {
      this.setLoading(false);
      this.updateUI();
    }
  }

  private onWait() {
    this.resolveAndClose('wait');
  }

  private onPurchase() {
    // IAP 购买逻辑（需要平台适配）
    console.log('[EnergyGate] Purchase clicked');

    // 模拟购买成功
    const energyManager = getEnergyManager();
    if (energyManager) {
      energyManager.addEnergy(this.purchaseEnergy, 'iap');
    }

    this.showSuccess(`购买成功！获得 ${this.purchaseEnergy} 点体力`);

    setTimeout(() => {
      this.resolveAndClose('purchase');
    }, 1000);
  }

  private onClose() {
    this.resolveAndClose('cancel');
  }

  private resolveAndClose(result: EnergyGateResult) {
    if (this.resolveCallback) {
      this.resolveCallback(result);
      this.resolveCallback = null;
    }
    this.hide();
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
      tween(opacity).to(0.2, { opacity: 180 }).start();
    }

    // 面板弹入
    if (this.modalPanel) {
      this.modalPanel.setScale(new Vec3(0.5, 0.5, 1));
      TweenEffects.spring(this.modalPanel, 1, 0.4);
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
      TweenEffects.scaleTo(this.modalPanel, 0.5, { duration: 0.15, easing: 'backIn' })
        .then(onComplete);
    } else {
      setTimeout(onComplete, 150);
    }
  }

  // ============================================
  // 提示
  // ============================================

  private setLoading(loading: boolean) {
    if (this.loadingIndicator) {
      this.loadingIndicator.active = loading;
    }
  }

  private showSuccess(message: string) {
    // TODO: 显示成功提示
    console.log('[EnergyGate] Success:', message);
  }

  private showError(message: string) {
    // TODO: 显示错误提示
    console.log('[EnergyGate] Error:', message);
  }
}

// 便捷函数
export async function showEnergyGate(): Promise<EnergyGateResult> {
  // 需要在场景中查找 EnergyGateModal 实例
  // 或者动态创建
  return 'cancel';
}
