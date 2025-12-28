import {
  _decorator, Component, Node, Label, Button, Sprite, Color,
  tween, Vec3, UIOpacity, ParticleSystem2D
} from 'cc';
import { TweenEffects } from '../effects/TweenEffects';
import { getAnalyticsTracker } from '../analytics/AnalyticsTracker';

const { ccclass, property } = _decorator;

/**
 * 游戏结果类型
 */
export type GameResult = 'win' | 'lose';

/**
 * 结果弹窗操作
 */
export type ResultAction =
  | 'next_level'     // 下一关
  | 'retry'          // 重试
  | 'home'           // 返回主页
  | 'share'          // 分享
  | 'extra_moves';   // 续命（看广告加步数）

/**
 * 结果数据
 */
export interface ResultData {
  result: GameResult;
  levelIndex: number;
  score?: number;
  stars?: number;        // 1-3 星
  movesUsed: number;
  movesRemaining: number;
  goalProgress: number;
  goalTotal: number;
  isNewBest?: boolean;
}

/**
 * WinLoseModal - 游戏结果弹窗
 */
@ccclass('WinLoseModal')
export class WinLoseModal extends Component {
  // ============================================
  // UI 引用 - 通用
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
  // UI 引用 - 胜利
  // ============================================

  @property(Node)
  winContent: Node = null!;

  @property(Node)
  starsContainer: Node = null!;

  @property(Label)
  scoreLabel: Label = null!;

  @property(Button)
  nextLevelButton: Button = null!;

  @property(Node)
  confettiNode: Node = null!;

  // ============================================
  // UI 引用 - 失败
  // ============================================

  @property(Node)
  loseContent: Node = null!;

  @property(Label)
  progressLabel: Label = null!;

  @property(Button)
  retryButton: Button = null!;

  @property(Button)
  extraMovesButton: Button = null!;

  @property(Label)
  extraMovesLabel: Label = null!;

  // ============================================
  // UI 引用 - 通用按钮
  // ============================================

  @property(Button)
  homeButton: Button = null!;

  @property(Button)
  shareButton: Button = null!;

  // ============================================
  // 配置
  // ============================================

  @property
  extraMovesCount: number = 5;

  @property
  starAnimationDelay: number = 0.3;

  // ============================================
  // 状态
  // ============================================

  private currentData: ResultData | null = null;
  private resolveCallback: ((action: ResultAction) => void) | null = null;

  // ============================================
  // 生命周期
  // ============================================

  onLoad() {
    this.setupButtons();
    this.hide(false);
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 显示结果弹窗
   */
  show(data: ResultData): Promise<ResultAction> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.currentData = data;
      this.node.active = true;

      this.updateUI(data);
      this.playShowAnimation(data.result);

      // 埋点
      const tracker = getAnalyticsTracker();
      if (tracker) {
        tracker.trackButtonClick(`result_${data.result}_shown`, `level_${data.levelIndex}`);
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

  // ============================================
  // UI 更新
  // ============================================

  private updateUI(data: ResultData) {
    // 标题
    if (this.titleLabel) {
      this.titleLabel.string = data.result === 'win' ? '恭喜过关！' : '再接再厉！';
      this.titleLabel.color = data.result === 'win'
        ? new Color(255, 215, 0, 255)
        : new Color(200, 150, 150, 255);
    }

    // 关卡
    if (this.levelLabel) {
      this.levelLabel.string = `第 ${data.levelIndex} 关`;
    }

    // 胜利/失败内容切换
    if (this.winContent) {
      this.winContent.active = data.result === 'win';
    }
    if (this.loseContent) {
      this.loseContent.active = data.result === 'lose';
    }

    if (data.result === 'win') {
      this.updateWinUI(data);
    } else {
      this.updateLoseUI(data);
    }
  }

  private updateWinUI(data: ResultData) {
    // 分数
    if (this.scoreLabel && data.score !== undefined) {
      this.scoreLabel.string = `${data.score}`;
    }

    // 星级（暂时隐藏，稍后动画显示）
    if (this.starsContainer) {
      const stars = this.starsContainer.children;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.setScale(new Vec3(0, 0, 1));
      }
    }

    // 按钮
    if (this.nextLevelButton) {
      this.nextLevelButton.node.active = true;
    }
    if (this.retryButton) {
      this.retryButton.node.active = false;
    }
    if (this.extraMovesButton) {
      this.extraMovesButton.node.active = false;
    }
  }

  private updateLoseUI(data: ResultData) {
    // 进度
    if (this.progressLabel) {
      const percent = Math.floor((data.goalProgress / data.goalTotal) * 100);
      this.progressLabel.string = `进度: ${data.goalProgress}/${data.goalTotal} (${percent}%)`;
    }

    // 按钮
    if (this.nextLevelButton) {
      this.nextLevelButton.node.active = false;
    }
    if (this.retryButton) {
      this.retryButton.node.active = true;
    }
    if (this.extraMovesButton) {
      this.extraMovesButton.node.active = true;
      if (this.extraMovesLabel) {
        this.extraMovesLabel.string = `+${this.extraMovesCount} 步`;
      }
    }
  }

  // ============================================
  // 动画
  // ============================================

  private playShowAnimation(result: GameResult) {
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

    // 胜利特效
    if (result === 'win') {
      this.playWinEffects();
    }
  }

  private playWinEffects() {
    // 星星动画
    if (this.starsContainer && this.currentData?.stars) {
      const stars = this.starsContainer.children;
      const starCount = Math.min(this.currentData.stars, stars.length);

      for (let i = 0; i < starCount; i++) {
        const star = stars[i];
        const delay = this.starAnimationDelay * (i + 1);

        tween(star)
          .delay(delay)
          .to(0.3, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' })
          .to(0.15, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' })
          .start();
      }
    }

    // 彩带/粒子
    if (this.confettiNode) {
      this.confettiNode.active = true;
      const particles = this.confettiNode.getComponent(ParticleSystem2D);
      if (particles) {
        particles.resetSystem();
      }
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

    // 停止粒子
    if (this.confettiNode) {
      const particles = this.confettiNode.getComponent(ParticleSystem2D);
      if (particles) {
        particles.stopSystem();
      }
    }
  }

  // ============================================
  // 按钮事件
  // ============================================

  private setupButtons() {
    if (this.nextLevelButton) {
      this.nextLevelButton.node.on('click', () => this.onAction('next_level'), this);
    }
    if (this.retryButton) {
      this.retryButton.node.on('click', () => this.onAction('retry'), this);
    }
    if (this.homeButton) {
      this.homeButton.node.on('click', () => this.onAction('home'), this);
    }
    if (this.shareButton) {
      this.shareButton.node.on('click', () => this.onAction('share'), this);
    }
    if (this.extraMovesButton) {
      this.extraMovesButton.node.on('click', () => this.onAction('extra_moves'), this);
    }
  }

  private onAction(action: ResultAction) {
    // 埋点
    const tracker = getAnalyticsTracker();
    if (tracker && this.currentData) {
      tracker.trackButtonClick(`result_${action}`, `level_${this.currentData.levelIndex}`);
    }

    if (this.resolveCallback) {
      this.resolveCallback(action);
      this.resolveCallback = null;
    }

    this.hide();
  }

  // ============================================
  // 工具方法
  // ============================================

  /**
   * 计算星级
   */
  static calculateStars(movesRemaining: number, totalMoves: number): number {
    const ratio = movesRemaining / totalMoves;

    if (ratio >= 0.5) return 3;     // 剩余 50% 以上步数
    if (ratio >= 0.25) return 2;    // 剩余 25% 以上步数
    return 1;                        // 完成即可
  }
}

// ============================================
// 便捷函数
// ============================================

let _winLoseModal: WinLoseModal | null = null;

export function registerWinLoseModal(modal: WinLoseModal) {
  _winLoseModal = modal;
}

export function getWinLoseModal(): WinLoseModal | null {
  return _winLoseModal;
}

export async function showGameResult(data: ResultData): Promise<ResultAction> {
  if (!_winLoseModal) {
    console.warn('[WinLoseModal] Modal not registered');
    return 'home';
  }

  return _winLoseModal.show(data);
}
