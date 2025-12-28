import {
  _decorator, Component, Node, Label, Sprite, Color, UIOpacity,
  tween, Vec3, Vec2, UITransform, Graphics, size, Rect
} from 'cc';
import { TutorialStepDef } from './TutorialStep';

const { ccclass, property } = _decorator;

/**
 * TutorialOverlay - 新手引导 UI 层
 * 负责显示遮罩、高亮、手指指引、对话框
 */
@ccclass('TutorialOverlay')
export class TutorialOverlay extends Component {
  // ============================================
  // UI 引用
  // ============================================

  @property(Node)
  maskNode: Node = null!;

  @property(Node)
  highlightNode: Node = null!;

  @property(Node)
  fingerNode: Node = null!;

  @property(Node)
  dialogNode: Node = null!;

  @property(Label)
  dialogLabel: Label = null!;

  @property(Node)
  tapToContinueNode: Node = null!;

  @property(Graphics)
  maskGraphics: Graphics = null!;

  // ============================================
  // 配置
  // ============================================

  @property
  fingerLoopDuration: number = 1.2;

  @property
  highlightPadding: number = 20;

  // ============================================
  // 状态
  // ============================================

  private isShowing: boolean = false;
  private currentStep: TutorialStepDef | null = null;
  private fingerTween: any = null;
  private tapCallback: (() => void) | null = null;

  // ============================================
  // 生命周期
  // ============================================

  onLoad() {
    this.hide();
    this.setupTapListener();
  }

  onDestroy() {
    this.stopFingerAnimation();
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 显示引导步骤
   */
  showStep(step: TutorialStepDef, context?: TutorialContext): Promise<void> {
    return new Promise((resolve) => {
      this.currentStep = step;
      this.isShowing = true;
      this.node.active = true;

      // 重置所有元素
      this.hideAllElements();

      // 根据步骤类型显示不同内容
      switch (step.type) {
        case 'show_dialog':
          this.showDialog(step, resolve);
          break;

        case 'highlight_swap':
          this.showSwapHighlight(step, context, resolve);
          break;

        case 'highlight_tile':
          this.showTileHighlight(step, context, resolve);
          break;

        case 'highlight_hud':
          this.showHudHighlight(step, context, resolve);
          break;

        case 'wait_action':
          this.waitForAction(step, resolve);
          break;

        case 'auto_swap':
          this.showAutoSwap(step, context, resolve);
          break;

        case 'free_play':
          this.hide();
          resolve();
          break;

        default:
          resolve();
      }
    });
  }

  /**
   * 隐藏引导层
   */
  hide() {
    this.isShowing = false;
    this.currentStep = null;
    this.node.active = false;
    this.stopFingerAnimation();
    this.tapCallback = null;
  }

  /**
   * 设置点击回调
   */
  setTapCallback(callback: () => void) {
    this.tapCallback = callback;
  }

  /**
   * 通知操作完成
   */
  notifyActionComplete() {
    if (this.tapCallback) {
      this.tapCallback();
      this.tapCallback = null;
    }
  }

  // ============================================
  // 内部方法 - 对话框
  // ============================================

  private showDialog(step: TutorialStepDef, onComplete: () => void) {
    // 显示半透明遮罩
    this.showMask(0.7);

    // 显示对话框
    if (this.dialogNode && this.dialogLabel) {
      this.dialogNode.active = true;
      this.dialogLabel.string = step.text || '';

      // 定位对话框
      this.positionDialog(step.textPosition || 'center');

      // 动画进入
      this.dialogNode.setScale(new Vec3(0.8, 0.8, 1));
      const opacity = this.dialogNode.getComponent(UIOpacity) || this.dialogNode.addComponent(UIOpacity);
      opacity.opacity = 0;

      tween(this.dialogNode)
        .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();

      tween(opacity)
        .to(0.2, { opacity: 255 })
        .start();
    }

    // 显示点击继续提示
    if (step.requireTap && this.tapToContinueNode) {
      this.tapToContinueNode.active = true;
      this.animateTapToContinue();
    }

    // 设置完成条件
    if (step.requireTap) {
      this.tapCallback = () => {
        this.hideDialog(() => onComplete());
      };
    } else if (step.delay) {
      setTimeout(() => {
        this.hideDialog(() => onComplete());
      }, step.delay);
    } else {
      onComplete();
    }
  }

  private hideDialog(onComplete: () => void) {
    if (!this.dialogNode) {
      onComplete();
      return;
    }

    const opacity = this.dialogNode.getComponent(UIOpacity);
    if (opacity) {
      tween(opacity)
        .to(0.15, { opacity: 0 })
        .call(() => {
          this.dialogNode.active = false;
          if (this.tapToContinueNode) {
            this.tapToContinueNode.active = false;
          }
          onComplete();
        })
        .start();
    } else {
      this.dialogNode.active = false;
      onComplete();
    }
  }

  private positionDialog(position: 'top' | 'bottom' | 'center') {
    if (!this.dialogNode) return;

    const transform = this.dialogNode.getComponent(UITransform);
    if (!transform) return;

    const y = position === 'top' ? 300 :
              position === 'bottom' ? -300 : 0;

    this.dialogNode.setPosition(new Vec3(0, y, 0));
  }

  private animateTapToContinue() {
    if (!this.tapToContinueNode) return;

    const opacity = this.tapToContinueNode.getComponent(UIOpacity) ||
                    this.tapToContinueNode.addComponent(UIOpacity);

    tween(opacity)
      .repeatForever(
        tween()
          .to(0.8, { opacity: 100 })
          .to(0.8, { opacity: 255 })
      )
      .start();
  }

  // ============================================
  // 内部方法 - 高亮交换
  // ============================================

  private showSwapHighlight(step: TutorialStepDef, context: TutorialContext | undefined, onComplete: () => void) {
    // 显示带孔遮罩
    if (step.swapFrom && step.swapTo && context) {
      const fromWorld = context.gridToWorld(step.swapFrom);
      const toWorld = context.gridToWorld(step.swapTo);

      // 创建两个格子的高亮区域
      const minX = Math.min(fromWorld.x, toWorld.x) - context.tileSize / 2;
      const maxX = Math.max(fromWorld.x, toWorld.x) + context.tileSize / 2;
      const minY = Math.min(fromWorld.y, toWorld.y) - context.tileSize / 2;
      const maxY = Math.max(fromWorld.y, toWorld.y) + context.tileSize / 2;

      this.showMaskWithHole(new Rect(
        minX - this.highlightPadding,
        minY - this.highlightPadding,
        (maxX - minX) + this.highlightPadding * 2,
        (maxY - minY) + this.highlightPadding * 2
      ));

      // 显示手指指引
      this.showFingerSwipe(fromWorld, toWorld);
    }

    // 显示提示文本
    if (step.text) {
      this.showTextHint(step.text, step.textPosition || 'top');
    }

    // 等待玩家完成交换
    this.tapCallback = onComplete;
  }

  private showFingerSwipe(from: Vec3, to: Vec3) {
    if (!this.fingerNode) return;

    this.fingerNode.active = true;
    this.fingerNode.setPosition(from);

    this.stopFingerAnimation();

    // 循环滑动动画
    this.fingerTween = tween(this.fingerNode)
      .repeatForever(
        tween()
          .to(0, { position: from })
          .delay(0.3)
          .to(this.fingerLoopDuration * 0.5, { position: to }, { easing: 'sineInOut' })
          .delay(0.3)
          .to(0, { position: from })
          .delay(0.2)
      )
      .start();
  }

  // ============================================
  // 内部方法 - 高亮格子
  // ============================================

  private showTileHighlight(step: TutorialStepDef, context: TutorialContext | undefined, onComplete: () => void) {
    // 特殊处理：高亮苔藓格子
    if (step.highlightTarget === 'moss_tiles' && context?.getMossTiles) {
      const mossTiles = context.getMossTiles();
      if (mossTiles.length > 0) {
        const positions = mossTiles.map(t => context.gridToWorld(new Vec2(t.x, t.y)));
        this.showMultipleTileHighlight(positions, context.tileSize);
      }
    } else if (step.highlightTarget instanceof Vec2) {
      // 单个格子
      if (context) {
        const pos = context.gridToWorld(step.highlightTarget);
        this.showSingleTileHighlight(pos, context.tileSize);
      }
    } else if (Array.isArray(step.highlightTarget)) {
      // 多个格子
      if (context) {
        const positions = (step.highlightTarget as Vec2[]).map(t => context.gridToWorld(t));
        this.showMultipleTileHighlight(positions, context.tileSize);
      }
    }

    // 显示提示文本
    if (step.text) {
      this.showTextHint(step.text, step.textPosition || 'top');
    }

    // 等待点击继续
    if (step.requireTap) {
      this.tapCallback = onComplete;
    } else if (step.delay) {
      setTimeout(onComplete, step.delay);
    } else {
      onComplete();
    }
  }

  private showSingleTileHighlight(pos: Vec3, tileSize: number) {
    this.showMaskWithHole(new Rect(
      pos.x - tileSize / 2 - this.highlightPadding,
      pos.y - tileSize / 2 - this.highlightPadding,
      tileSize + this.highlightPadding * 2,
      tileSize + this.highlightPadding * 2
    ));

    // 显示高亮框
    if (this.highlightNode) {
      this.highlightNode.active = true;
      this.highlightNode.setPosition(pos);

      // 呼吸动画
      tween(this.highlightNode)
        .repeatForever(
          tween()
            .to(0.6, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineInOut' })
            .to(0.6, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
        )
        .start();
    }
  }

  private showMultipleTileHighlight(positions: Vec3[], tileSize: number) {
    if (positions.length === 0) return;

    // 计算包围盒
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const pos of positions) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }

    this.showMaskWithHole(new Rect(
      minX - tileSize / 2 - this.highlightPadding,
      minY - tileSize / 2 - this.highlightPadding,
      (maxX - minX) + tileSize + this.highlightPadding * 2,
      (maxY - minY) + tileSize + this.highlightPadding * 2
    ));
  }

  // ============================================
  // 内部方法 - 高亮 HUD
  // ============================================

  private showHudHighlight(step: TutorialStepDef, context: TutorialContext | undefined, onComplete: () => void) {
    if (typeof step.highlightTarget === 'string' && context?.getHudElement) {
      const hudNode = context.getHudElement(step.highlightTarget);
      if (hudNode) {
        const transform = hudNode.getComponent(UITransform);
        if (transform) {
          const worldPos = hudNode.worldPosition;
          this.showMaskWithHole(new Rect(
            worldPos.x - transform.width / 2 - this.highlightPadding,
            worldPos.y - transform.height / 2 - this.highlightPadding,
            transform.width + this.highlightPadding * 2,
            transform.height + this.highlightPadding * 2
          ));
        }
      }
    }

    // 显示提示文本
    if (step.text) {
      this.showTextHint(step.text, step.textPosition || 'bottom');
    }

    // 等待点击继续
    if (step.requireTap) {
      this.tapCallback = onComplete;
    } else {
      onComplete();
    }
  }

  // ============================================
  // 内部方法 - 等待操作
  // ============================================

  private waitForAction(step: TutorialStepDef, onComplete: () => void) {
    // 显示提示文本
    if (step.text) {
      this.showTextHint(step.text, step.textPosition || 'top');
    }

    // 显示轻遮罩
    this.showMask(0.3);

    this.tapCallback = onComplete;
  }

  // ============================================
  // 内部方法 - 自动演示
  // ============================================

  private showAutoSwap(step: TutorialStepDef, context: TutorialContext | undefined, onComplete: () => void) {
    if (!step.swapFrom || !step.swapTo || !context) {
      onComplete();
      return;
    }

    const fromWorld = context.gridToWorld(step.swapFrom);
    const toWorld = context.gridToWorld(step.swapTo);

    // 显示手指从 from 滑动到 to
    this.showMask(0.5);

    if (this.fingerNode) {
      this.fingerNode.active = true;
      this.fingerNode.setPosition(fromWorld);

      tween(this.fingerNode)
        .delay(0.5)
        .to(0.5, { position: toWorld }, { easing: 'sineInOut' })
        .call(() => {
          // 触发实际交换
          if (context.performSwap) {
            context.performSwap(step.swapFrom!, step.swapTo!);
          }
        })
        .delay(0.5)
        .call(() => {
          this.fingerNode.active = false;
          onComplete();
        })
        .start();
    } else {
      onComplete();
    }
  }

  // ============================================
  // 内部方法 - 遮罩
  // ============================================

  private showMask(alpha: number) {
    if (!this.maskNode) return;

    this.maskNode.active = true;

    let opacity = this.maskNode.getComponent(UIOpacity);
    if (!opacity) {
      opacity = this.maskNode.addComponent(UIOpacity);
    }
    opacity.opacity = Math.floor(alpha * 255);

    // 如果有 Graphics，清除
    if (this.maskGraphics) {
      this.maskGraphics.clear();
      this.maskGraphics.fillColor = new Color(0, 0, 0, Math.floor(alpha * 255));
      this.maskGraphics.rect(-540, -960, 1080, 1920);
      this.maskGraphics.fill();
    }
  }

  private showMaskWithHole(holeRect: Rect) {
    if (!this.maskGraphics) {
      this.showMask(0.7);
      return;
    }

    this.maskNode.active = true;

    const g = this.maskGraphics;
    g.clear();

    // 绘制带孔遮罩（反向绘制）
    const alpha = 0.7;
    g.fillColor = new Color(0, 0, 0, Math.floor(alpha * 255));

    // 外框（整个屏幕）
    const screenW = 1080;
    const screenH = 1920;

    // 使用路径挖孔
    g.moveTo(-screenW / 2, -screenH / 2);
    g.lineTo(screenW / 2, -screenH / 2);
    g.lineTo(screenW / 2, screenH / 2);
    g.lineTo(-screenW / 2, screenH / 2);
    g.close();

    // 孔（反向）
    const cornerRadius = 12;
    g.roundRect(holeRect.x, holeRect.y, holeRect.width, holeRect.height, cornerRadius);

    g.fill();
  }

  // ============================================
  // 内部方法 - 文本提示
  // ============================================

  private showTextHint(text: string, position: 'top' | 'bottom' | 'center') {
    if (!this.dialogNode || !this.dialogLabel) return;

    this.dialogNode.active = true;
    this.dialogLabel.string = text;
    this.positionDialog(position);

    const opacity = this.dialogNode.getComponent(UIOpacity) || this.dialogNode.addComponent(UIOpacity);
    opacity.opacity = 255;
    this.dialogNode.setScale(new Vec3(1, 1, 1));
  }

  // ============================================
  // 内部方法 - 辅助
  // ============================================

  private hideAllElements() {
    if (this.maskNode) this.maskNode.active = false;
    if (this.highlightNode) {
      this.highlightNode.active = false;
      this.highlightNode.setScale(new Vec3(1, 1, 1));
    }
    if (this.fingerNode) this.fingerNode.active = false;
    if (this.dialogNode) this.dialogNode.active = false;
    if (this.tapToContinueNode) this.tapToContinueNode.active = false;

    this.stopFingerAnimation();
  }

  private stopFingerAnimation() {
    if (this.fingerTween) {
      this.fingerTween.stop();
      this.fingerTween = null;
    }
  }

  private setupTapListener() {
    this.node.on(Node.EventType.TOUCH_END, () => {
      if (this.tapCallback) {
        const callback = this.tapCallback;
        this.tapCallback = null;
        callback();
      }
    }, this);
  }
}

/**
 * 引导上下文 - 由 GameManager 提供
 */
export interface TutorialContext {
  // 格子坐标转世界坐标
  gridToWorld: (grid: Vec2) => Vec3;

  // 格子尺寸
  tileSize: number;

  // 获取苔藓格子
  getMossTiles?: () => Array<{ x: number; y: number }>;

  // 获取 HUD 元素
  getHudElement?: (name: string) => Node | null;

  // 执行交换
  performSwap?: (from: Vec2, to: Vec2) => void;
}
