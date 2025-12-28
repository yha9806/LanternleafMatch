import {
  _decorator, Component, Node, Label, Button, Sprite, Color,
  tween, Vec3, UIOpacity, ProgressBar
} from 'cc';
import { TweenEffects } from '../effects/TweenEffects';
import { getRewardedAdManager } from '../ads/RewardedAdManager';
import { getAnalyticsTracker } from '../analytics/AnalyticsTracker';

const { ccclass, property } = _decorator;

/**
 * 续命结果
 */
export type ExtraMovesResult =
  | 'continue'    // 续命成功
  | 'decline'     // 放弃
  | 'timeout';    // 超时

/**
 * ExtraMovesModal - 续命弹窗（Near-Miss 变现）
 *
 * 设计原理：
 * - 当玩家差一点就赢时显示
 * - 利用"近失效应"提高广告观看意愿
 * - 首次免费或观看广告获得 +5 步
 */
@ccclass('ExtraMovesModal')
export class ExtraMovesModal extends Component {
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
  progressLabel: Label = null!;

  @property(ProgressBar)
  progressBar: ProgressBar = null!;

  @property(Label)
  encourageLabel: Label = null!;

  @property(Button)
  continueButton: Button = null!;

  @property(Label)
  continueButtonLabel: Label = null!;

  @property(Button)
  declineButton: Button = null!;

  @property(Label)
  countdownLabel: Label = null!;

  @property(Node)
  adIcon: Node = null!;

  // ============================================
  // 配置
  // ============================================

  @property
  extraMoves: number = 5;

  @property
  countdownSeconds: number = 10;

  @property
  nearMissThreshold: number = 0.8;  // 80% 进度才显示

  @property
  freeTriesPerDay: number = 1;  // 每日首次免费

  // ============================================
  // 状态
  // ============================================

  private resolveCallback: ((result: ExtraMovesResult) => void) | null = null;
  private countdownTimer: any = null;
  private remainingSeconds: number = 0;
  private levelIndex: number = 0;
  private goalProgress: number = 0;
  private goalTotal: number = 0;

  private static dailyFreeUsed: number = 0;
  private static lastFreeDate: string = '';

  // ============================================
  // 鼓励语句池
  // ============================================

  private encourageMessages = [
    '差一点就赢了！',
    '就差最后一步！',
    '胜利就在眼前！',
    '再试一次吧！',
    '你可以的！',
    '马上就能过关了！',
  ];

  // ============================================
  // 生命周期
  // ============================================

  onLoad() {
    this.setupButtons();
    this.hide(false);
    this.checkDailyReset();
  }

  onDestroy() {
    this.stopCountdown();
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 检查是否应该显示续命弹窗
   */
  static shouldShow(goalProgress: number, goalTotal: number, threshold: number = 0.8): boolean {
    if (goalTotal <= 0) return false;
    const ratio = goalProgress / goalTotal;
    return ratio >= threshold && ratio < 1;
  }

  /**
   * 显示续命弹窗
   */
  show(levelIndex: number, goalProgress: number, goalTotal: number): Promise<ExtraMovesResult> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.levelIndex = levelIndex;
      this.goalProgress = goalProgress;
      this.goalTotal = goalTotal;
      this.remainingSeconds = this.countdownSeconds;

      this.node.active = true;
      this.updateUI();
      this.startCountdown();
      this.playShowAnimation();

      // 埋点
      const tracker = getAnalyticsTracker();
      if (tracker) {
        tracker.trackButtonClick('extra_moves_shown', `level_${levelIndex}_progress_${Math.round(goalProgress/goalTotal*100)}`);
      }
    });
  }

  /**
   * 隐藏弹窗
   */
  hide(animated: boolean = true) {
    this.stopCountdown();

    if (animated) {
      this.playHideAnimation(() => {
        this.node.active = false;
      });
    } else {
      this.node.active = false;
    }
  }

  /**
   * 获取额外步数
   */
  getExtraMoves(): number {
    return this.extraMoves;
  }

  // ============================================
  // UI 更新
  // ============================================

  private updateUI() {
    // 标题
    if (this.titleLabel) {
      this.titleLabel.string = '步数用完了';
    }

    // 进度
    const progressPercent = Math.round((this.goalProgress / this.goalTotal) * 100);
    if (this.progressLabel) {
      this.progressLabel.string = `进度: ${this.goalProgress}/${this.goalTotal} (${progressPercent}%)`;
    }
    if (this.progressBar) {
      this.progressBar.progress = this.goalProgress / this.goalTotal;
    }

    // 鼓励语
    if (this.encourageLabel) {
      const randomMsg = this.encourageMessages[Math.floor(Math.random() * this.encourageMessages.length)];
      this.encourageLabel.string = randomMsg;
    }

    // 继续按钮
    this.updateContinueButton();

    // 倒计时
    this.updateCountdownDisplay();
  }

  private updateContinueButton() {
    const isFree = this.isFreeAvailable();

    if (this.continueButtonLabel) {
      if (isFree) {
        this.continueButtonLabel.string = `免费续命 +${this.extraMoves} 步`;
      } else {
        this.continueButtonLabel.string = `看广告 +${this.extraMoves} 步`;
      }
    }

    // 广告图标
    if (this.adIcon) {
      this.adIcon.active = !isFree;
    }

    // 按钮颜色
    if (this.continueButton) {
      const btnSprite = this.continueButton.node.getComponent(Sprite);
      if (btnSprite) {
        btnSprite.color = isFree
          ? new Color(100, 200, 100, 255)   // 绿色（免费）
          : new Color(255, 180, 50, 255);   // 橙色（广告）
      }
    }
  }

  private updateCountdownDisplay() {
    if (this.countdownLabel) {
      this.countdownLabel.string = `${this.remainingSeconds}`;

      // 最后 3 秒变红
      if (this.remainingSeconds <= 3) {
        this.countdownLabel.color = new Color(255, 100, 100, 255);

        // 脉冲动画
        tween(this.countdownLabel.node)
          .to(0.1, { scale: new Vec3(1.3, 1.3, 1) })
          .to(0.1, { scale: new Vec3(1, 1, 1) })
          .start();
      } else {
        this.countdownLabel.color = new Color(255, 255, 255, 255);
      }
    }
  }

  // ============================================
  // 免费次数管理
  // ============================================

  private checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    if (ExtraMovesModal.lastFreeDate !== today) {
      ExtraMovesModal.lastFreeDate = today;
      ExtraMovesModal.dailyFreeUsed = 0;
    }
  }

  private isFreeAvailable(): boolean {
    this.checkDailyReset();
    return ExtraMovesModal.dailyFreeUsed < this.freeTriesPerDay;
  }

  private consumeFree() {
    ExtraMovesModal.dailyFreeUsed++;
  }

  // ============================================
  // 倒计时
  // ============================================

  private startCountdown() {
    this.stopCountdown();

    this.countdownTimer = setInterval(() => {
      this.remainingSeconds--;
      this.updateCountdownDisplay();

      if (this.remainingSeconds <= 0) {
        this.onTimeout();
      }
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  // ============================================
  // 按钮事件
  // ============================================

  private setupButtons() {
    if (this.continueButton) {
      this.continueButton.node.on('click', this.onContinue, this);
    }
    if (this.declineButton) {
      this.declineButton.node.on('click', this.onDecline, this);
    }
  }

  private async onContinue() {
    this.stopCountdown();

    const tracker = getAnalyticsTracker();
    const isFree = this.isFreeAvailable();

    if (isFree) {
      // 免费续命
      this.consumeFree();

      if (tracker) {
        tracker.trackButtonClick('extra_moves_free', `level_${this.levelIndex}`);
      }

      this.resolveAndClose('continue');
    } else {
      // 需要看广告
      const adManager = getRewardedAdManager();
      if (!adManager) {
        this.resolveAndClose('decline');
        return;
      }

      // 禁用按钮防止重复点击
      this.continueButton.interactable = false;

      const result = await adManager.show('extra_moves');

      if (result.rewarded) {
        if (tracker) {
          tracker.trackButtonClick('extra_moves_ad_completed', `level_${this.levelIndex}`);
        }
        this.resolveAndClose('continue');
      } else {
        if (tracker) {
          tracker.trackButtonClick('extra_moves_ad_failed', `level_${this.levelIndex}`);
        }
        this.continueButton.interactable = true;
        this.startCountdown();  // 重新开始倒计时
      }
    }
  }

  private onDecline() {
    const tracker = getAnalyticsTracker();
    if (tracker) {
      tracker.trackButtonClick('extra_moves_declined', `level_${this.levelIndex}`);
    }

    this.resolveAndClose('decline');
  }

  private onTimeout() {
    const tracker = getAnalyticsTracker();
    if (tracker) {
      tracker.trackButtonClick('extra_moves_timeout', `level_${this.levelIndex}`);
    }

    this.resolveAndClose('timeout');
  }

  private resolveAndClose(result: ExtraMovesResult) {
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
      tween(opacity).to(0.2, { opacity: 200 }).start();
    }

    // 面板从下方弹入
    if (this.modalPanel) {
      this.modalPanel.setPosition(new Vec3(0, -500, 0));
      this.modalPanel.setScale(new Vec3(0.9, 0.9, 1));

      tween(this.modalPanel)
        .to(0.3, {
          position: new Vec3(0, 0, 0),
          scale: new Vec3(1, 1, 1)
        }, { easing: 'backOut' })
        .start();
    }

    // 继续按钮呼吸动画
    if (this.continueButton) {
      tween(this.continueButton.node)
        .repeatForever(
          tween()
            .to(0.8, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'sineInOut' })
            .to(0.8, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
        )
        .start();
    }
  }

  private playHideAnimation(onComplete: () => void) {
    // 停止按钮动画
    if (this.continueButton) {
      tween(this.continueButton.node).stop();
    }

    // 遮罩淡出
    if (this.maskNode) {
      const opacity = this.maskNode.getComponent(UIOpacity);
      if (opacity) {
        tween(opacity).to(0.15, { opacity: 0 }).start();
      }
    }

    // 面板滑出
    if (this.modalPanel) {
      tween(this.modalPanel)
        .to(0.2, { position: new Vec3(0, -500, 0) }, { easing: 'backIn' })
        .call(onComplete)
        .start();
    } else {
      setTimeout(onComplete, 200);
    }
  }
}

// ============================================
// 便捷函数
// ============================================

let _extraMovesModal: ExtraMovesModal | null = null;

export function registerExtraMovesModal(modal: ExtraMovesModal) {
  _extraMovesModal = modal;
}

export function getExtraMovesModal(): ExtraMovesModal | null {
  return _extraMovesModal;
}

/**
 * 检查并显示续命弹窗
 * @returns 额外步数（0 表示玩家拒绝）
 */
export async function checkAndShowExtraMoves(
  levelIndex: number,
  goalProgress: number,
  goalTotal: number
): Promise<number> {
  if (!_extraMovesModal) {
    console.warn('[ExtraMovesModal] Modal not registered');
    return 0;
  }

  // 检查是否满足近失条件
  if (!ExtraMovesModal.shouldShow(goalProgress, goalTotal)) {
    return 0;
  }

  const result = await _extraMovesModal.show(levelIndex, goalProgress, goalTotal);

  if (result === 'continue') {
    return _extraMovesModal.getExtraMoves();
  }

  return 0;
}
