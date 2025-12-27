import {
  _decorator, Component, Node, Label, Button, tween, Vec3, UIOpacity
} from 'cc';

const { ccclass, property } = _decorator;

export interface PauseModalOptions {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export interface WinModalOptions {
  level: number;
  movesLeft: number;
  onNext: () => void;
  onReplay: () => void;
}

export interface LoseModalOptions {
  level: number;
  onRetry: () => void;
  onQuit: () => void;
}

export interface EnergyGateOptions {
  nextRegenSeconds: number;
  onWatchAd: () => void;
  onWait: () => void;
}

/**
 * 弹窗管理器
 * 管理所有游戏弹窗（暂停、胜利、失败、体力不足等）
 */
@ccclass('ModalManager')
export class ModalManager extends Component {
  @property(Node)
  overlay: Node = null!;

  @property(Node)
  pauseModal: Node = null!;

  @property(Node)
  winModal: Node = null!;

  @property(Node)
  loseModal: Node = null!;

  @property(Node)
  energyGateModal: Node = null!;

  private currentModal: Node | null = null;
  private regenTimer: number = 0;

  onLoad() {
    this.hideAll();
  }

  update(dt: number) {
    // 更新体力回充倒计时
    if (this.regenTimer > 0) {
      this.regenTimer -= dt;
      this.updateRegenCountdown();
    }
  }

  // ============================================
  // 暂停弹窗
  // ============================================

  showPauseModal(options: PauseModalOptions) {
    this.showModal(this.pauseModal);

    const resumeBtn = this.pauseModal.getChildByName('ResumeButton');
    const restartBtn = this.pauseModal.getChildByName('RestartButton');
    const quitBtn = this.pauseModal.getChildByName('QuitButton');

    this.bindButton(resumeBtn, () => {
      this.hideModal();
      options.onResume();
    });
    this.bindButton(restartBtn, () => {
      this.hideModal();
      options.onRestart();
    });
    this.bindButton(quitBtn, () => {
      this.hideModal();
      options.onQuit();
    });
  }

  // ============================================
  // 胜利弹窗
  // ============================================

  showWinModal(options: WinModalOptions) {
    this.showModal(this.winModal);

    const titleLabel = this.winModal.getChildByName('TitleLabel')?.getComponent(Label);
    const movesLabel = this.winModal.getChildByName('MovesLabel')?.getComponent(Label);
    const nextBtn = this.winModal.getChildByName('NextButton');
    const replayBtn = this.winModal.getChildByName('ReplayButton');

    if (titleLabel) {
      titleLabel.string = `第 ${options.level} 关 通关!`;
    }
    if (movesLabel) {
      movesLabel.string = `剩余步数: ${options.movesLeft}`;
    }

    this.bindButton(nextBtn, () => {
      this.hideModal();
      options.onNext();
    });
    this.bindButton(replayBtn, () => {
      this.hideModal();
      options.onReplay();
    });
  }

  // ============================================
  // 失败弹窗
  // ============================================

  showLoseModal(options: LoseModalOptions) {
    this.showModal(this.loseModal);

    const titleLabel = this.loseModal.getChildByName('TitleLabel')?.getComponent(Label);
    const retryBtn = this.loseModal.getChildByName('RetryButton');
    const quitBtn = this.loseModal.getChildByName('QuitButton');

    if (titleLabel) {
      titleLabel.string = `第 ${options.level} 关 失败`;
    }

    this.bindButton(retryBtn, () => {
      this.hideModal();
      options.onRetry();
    });
    this.bindButton(quitBtn, () => {
      this.hideModal();
      options.onQuit();
    });
  }

  // ============================================
  // 体力不足弹窗
  // ============================================

  showEnergyGateModal(options: EnergyGateOptions) {
    this.showModal(this.energyGateModal);
    this.regenTimer = options.nextRegenSeconds;

    const watchAdBtn = this.energyGateModal.getChildByName('WatchAdButton');
    const waitBtn = this.energyGateModal.getChildByName('WaitButton');

    this.bindButton(watchAdBtn, () => {
      this.hideModal();
      options.onWatchAd();
    });
    this.bindButton(waitBtn, () => {
      this.hideModal();
      options.onWait();
    });

    this.updateRegenCountdown();
  }

  // ============================================
  // 私有方法
  // ============================================

  private showModal(modal: Node) {
    if (!modal) return;

    this.hideAll();
    this.currentModal = modal;

    // 显示遮罩
    if (this.overlay) {
      this.overlay.active = true;
      const opacity = this.overlay.getComponent(UIOpacity);
      if (opacity) {
        opacity.opacity = 0;
        tween(opacity).to(0.2, { opacity: 150 }).start();
      }
    }

    // 显示弹窗
    modal.active = true;
    modal.setScale(new Vec3(0.8, 0.8, 1));
    tween(modal)
      .to(0.25, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }

  private hideModal() {
    if (!this.currentModal) return;

    const modal = this.currentModal;

    tween(modal)
      .to(0.15, { scale: new Vec3(0.8, 0.8, 1) })
      .call(() => {
        modal.active = false;
      })
      .start();

    if (this.overlay) {
      const opacity = this.overlay.getComponent(UIOpacity);
      if (opacity) {
        tween(opacity)
          .to(0.15, { opacity: 0 })
          .call(() => { this.overlay.active = false; })
          .start();
      }
    }

    this.currentModal = null;
    this.regenTimer = 0;
  }

  private hideAll() {
    if (this.overlay) this.overlay.active = false;
    if (this.pauseModal) this.pauseModal.active = false;
    if (this.winModal) this.winModal.active = false;
    if (this.loseModal) this.loseModal.active = false;
    if (this.energyGateModal) this.energyGateModal.active = false;
    this.currentModal = null;
  }

  private bindButton(node: Node | null, callback: () => void) {
    if (!node) return;
    const button = node.getComponent(Button);
    if (button) {
      node.off(Button.EventType.CLICK);
      node.on(Button.EventType.CLICK, callback);
    }
  }

  private updateRegenCountdown() {
    if (!this.energyGateModal) return;

    const countdownLabel = this.energyGateModal.getChildByName('CountdownLabel')?.getComponent(Label);
    if (countdownLabel && this.regenTimer > 0) {
      const minutes = Math.floor(this.regenTimer / 60);
      const seconds = Math.floor(this.regenTimer % 60);
      countdownLabel.string = `下次回充: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
}
