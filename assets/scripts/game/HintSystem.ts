import {
  _decorator, Component, Node, Vec2, Vec3, Color,
  tween, Sprite, UIOpacity
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * 提示优先级
 */
export enum HintPriority {
  SPECIAL_POSSIBLE = 100,    // 可形成特殊块
  GOAL_MATCH = 80,           // 目标物可消除
  LARGE_COMBO = 60,          // 大连消潜力
  BLOCKER_CLEAR = 40,        // 可清除障碍
  ANY_MATCH = 10,            // 任意有效消除
}

/**
 * 提示信息
 */
export interface HintInfo {
  from: Vec2;
  to: Vec2;
  priority: HintPriority;
  matchSize: number;
  isGoalItem: boolean;
  canCreateSpecial: boolean;
}

/**
 * 提示配置
 */
export interface HintConfig {
  // 无操作多久后显示提示（秒）
  idleTimeToHint: number;

  // 提示动画持续时间（秒）
  hintDuration: number;

  // 提示后的冷却时间（秒）
  hintCooldown: number;

  // 是否高亮最优解
  showBestMove: boolean;

  // 连续无进展多少步后强制提示
  forcedHintAfterMoves: number;

  // 提示手指的颜色
  fingerColor: Color;

  // 提示高亮的颜色
  highlightColor: Color;
}

/**
 * HintSystem - 自动提示系统
 *
 * 功能：
 * - 玩家无操作 N 秒后自动显示提示
 * - 优先提示能形成特殊块或消除目标物的位置
 * - 手指滑动动画指引
 * - 格子呼吸高亮效果
 */
@ccclass('HintSystem')
export class HintSystem extends Component {
  // ============================================
  // 配置
  // ============================================

  @property
  idleTimeToHint: number = 8;

  @property
  hintDuration: number = 2;

  @property
  hintCooldown: number = 5;

  @property
  showBestMove: boolean = true;

  @property
  forcedHintAfterMoves: number = 5;

  @property(Node)
  fingerNode: Node = null!;

  @property(Node)
  highlightNodeFrom: Node = null!;

  @property(Node)
  highlightNodeTo: Node = null!;

  // ============================================
  // 状态
  // ============================================

  private isEnabled: boolean = true;
  private isShowing: boolean = false;
  private lastActionTime: number = 0;
  private movesWithoutProgress: number = 0;
  private currentHint: HintInfo | null = null;
  private hintTimer: any = null;
  private animationTween: any = null;

  // 回调
  private getHintsCallback: (() => HintInfo[]) | null = null;
  private gridToWorldCallback: ((grid: Vec2) => Vec3) | null = null;

  // ============================================
  // 生命周期
  // ============================================

  onLoad() {
    this.hideHint();
    this.resetIdleTimer();
  }

  onDestroy() {
    this.stopHintTimer();
    this.stopAnimation();
  }

  // ============================================
  // 公共 API - 配置
  // ============================================

  /**
   * 设置提示回调
   */
  setup(
    getHints: () => HintInfo[],
    gridToWorld: (grid: Vec2) => Vec3
  ) {
    this.getHintsCallback = getHints;
    this.gridToWorldCallback = gridToWorld;
  }

  /**
   * 启用/禁用提示系统
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.hideHint();
      this.stopHintTimer();
    } else {
      this.resetIdleTimer();
    }
  }

  // ============================================
  // 公共 API - 事件通知
  // ============================================

  /**
   * 通知玩家有操作
   */
  notifyAction() {
    this.lastActionTime = Date.now();
    this.hideHint();
    this.resetIdleTimer();
  }

  /**
   * 通知有消除发生
   */
  notifyMatch(hadProgress: boolean) {
    if (hadProgress) {
      this.movesWithoutProgress = 0;
    } else {
      this.movesWithoutProgress++;
    }
    this.notifyAction();
  }

  /**
   * 通知关卡开始
   */
  notifyLevelStart() {
    this.movesWithoutProgress = 0;
    this.notifyAction();
  }

  /**
   * 立即显示提示
   */
  showHintNow() {
    if (!this.isEnabled) return;
    this.triggerHint();
  }

  /**
   * 隐藏提示
   */
  hideHint() {
    if (!this.isShowing) return;

    this.isShowing = false;
    this.stopAnimation();

    if (this.fingerNode) {
      this.fingerNode.active = false;
    }
    if (this.highlightNodeFrom) {
      this.highlightNodeFrom.active = false;
    }
    if (this.highlightNodeTo) {
      this.highlightNodeTo.active = false;
    }
  }

  /**
   * 获取当前提示
   */
  getCurrentHint(): HintInfo | null {
    return this.currentHint;
  }

  // ============================================
  // 内部方法 - 定时器
  // ============================================

  private resetIdleTimer() {
    this.stopHintTimer();

    if (!this.isEnabled) return;

    this.hintTimer = setTimeout(() => {
      this.checkAndShowHint();
    }, this.idleTimeToHint * 1000);
  }

  private stopHintTimer() {
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
  }

  private checkAndShowHint() {
    if (!this.isEnabled || this.isShowing) return;

    const idleTime = (Date.now() - this.lastActionTime) / 1000;

    // 检查是否应该显示提示
    const shouldShow =
      idleTime >= this.idleTimeToHint ||
      this.movesWithoutProgress >= this.forcedHintAfterMoves;

    if (shouldShow) {
      this.triggerHint();
    }
  }

  // ============================================
  // 内部方法 - 提示逻辑
  // ============================================

  private triggerHint() {
    if (!this.getHintsCallback || !this.gridToWorldCallback) return;

    // 获取所有可能的提示
    const hints = this.getHintsCallback();
    if (hints.length === 0) return;

    // 选择最优提示
    const bestHint = this.selectBestHint(hints);
    if (!bestHint) return;

    this.currentHint = bestHint;
    this.isShowing = true;

    // 显示提示动画
    this.playHintAnimation(bestHint);

    // 设置冷却后再次检查
    setTimeout(() => {
      if (this.isShowing) {
        this.hideHint();
        this.resetIdleTimer();
      }
    }, this.hintDuration * 1000);
  }

  private selectBestHint(hints: HintInfo[]): HintInfo | null {
    if (hints.length === 0) return null;

    if (!this.showBestMove) {
      // 随机选择
      return hints[Math.floor(Math.random() * hints.length)];
    }

    // 按优先级排序
    hints.sort((a, b) => {
      // 优先级高的在前
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // 消除数量多的在前
      return b.matchSize - a.matchSize;
    });

    return hints[0];
  }

  // ============================================
  // 内部方法 - 动画
  // ============================================

  private playHintAnimation(hint: HintInfo) {
    if (!this.gridToWorldCallback) return;

    const fromWorld = this.gridToWorldCallback(hint.from);
    const toWorld = this.gridToWorldCallback(hint.to);

    // 显示高亮
    this.showHighlight(this.highlightNodeFrom, fromWorld, hint.canCreateSpecial);
    this.showHighlight(this.highlightNodeTo, toWorld, hint.canCreateSpecial);

    // 显示手指
    this.playFingerAnimation(fromWorld, toWorld);
  }

  private showHighlight(node: Node | null, position: Vec3, isSpecial: boolean) {
    if (!node) return;

    node.active = true;
    node.setPosition(position);

    // 设置颜色
    const sprite = node.getComponent(Sprite);
    if (sprite) {
      sprite.color = isSpecial
        ? new Color(255, 215, 0, 200)    // 金色（特殊）
        : new Color(255, 255, 255, 180); // 白色（普通）
    }

    // 呼吸动画
    node.setScale(new Vec3(1, 1, 1));
    this.animationTween = tween(node)
      .repeatForever(
        tween()
          .to(0.5, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'sineInOut' })
          .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
      )
      .start();
  }

  private playFingerAnimation(from: Vec3, to: Vec3) {
    if (!this.fingerNode) return;

    this.fingerNode.active = true;
    this.fingerNode.setPosition(from);

    // 确保可见
    let opacity = this.fingerNode.getComponent(UIOpacity);
    if (!opacity) {
      opacity = this.fingerNode.addComponent(UIOpacity);
    }
    opacity.opacity = 255;

    // 滑动动画
    this.animationTween = tween(this.fingerNode)
      .repeatForever(
        tween()
          .to(0, { position: from })
          .delay(0.2)
          .to(0.5, { position: to }, { easing: 'sineInOut' })
          .delay(0.3)
          .to(0.3, { position: from }, { easing: 'sineOut' })
          .delay(0.2)
      )
      .start();
  }

  private stopAnimation() {
    if (this.animationTween) {
      this.animationTween.stop();
      this.animationTween = null;
    }

    // 停止所有节点的 tween
    if (this.fingerNode) {
      tween(this.fingerNode).stop();
    }
    if (this.highlightNodeFrom) {
      tween(this.highlightNodeFrom).stop();
    }
    if (this.highlightNodeTo) {
      tween(this.highlightNodeTo).stop();
    }
  }
}

// ============================================
// 便捷函数
// ============================================

let _hintSystem: HintSystem | null = null;

export function registerHintSystem(system: HintSystem) {
  _hintSystem = system;
}

export function getHintSystem(): HintSystem | null {
  return _hintSystem;
}
