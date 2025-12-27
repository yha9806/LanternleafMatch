import {
  _decorator, Component, Node, UITransform, Widget, view, screen
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * 分屏布局管理器
 * 管理竖屏游戏的上下分屏布局
 *
 * 布局结构：
 * - 动画区域：上半部分 (50%) - 960px
 * - HUD 区域：中间 - 80px
 * - 游戏区域：下半部分 - 880px
 */
@ccclass('SplitScreenLayout')
export class SplitScreenLayout extends Component {
  // 区域节点
  @property({ type: Node })
  animationArea: Node = null!;

  @property({ type: Node })
  hudArea: Node = null!;

  @property({ type: Node })
  gameArea: Node = null!;

  // 布局配置
  @property
  designWidth: number = 1080;

  @property
  designHeight: number = 1920;

  @property
  animationAreaHeight: number = 960;

  @property
  hudHeight: number = 80;

  // 计算出的游戏区域高度
  private gameAreaHeight: number = 880;

  onLoad() {
    this.calculateLayout();
    this.applyLayout();

    // 监听屏幕尺寸变化
    view.on('design-resolution-changed', this.onResize, this);
  }

  onDestroy() {
    view.off('design-resolution-changed', this.onResize, this);
  }

  // ============================================
  // 布局计算
  // ============================================

  private calculateLayout() {
    // 游戏区域高度 = 总高度 - 动画区域 - HUD
    this.gameAreaHeight = this.designHeight - this.animationAreaHeight - this.hudHeight;
  }

  private applyLayout() {
    // 设置动画区域
    if (this.animationArea) {
      this.setupArea(this.animationArea, {
        top: 0,
        height: this.animationAreaHeight,
        anchorY: 1  // 顶部对齐
      });
    }

    // 设置 HUD 区域
    if (this.hudArea) {
      this.setupArea(this.hudArea, {
        top: this.animationAreaHeight,
        height: this.hudHeight,
        anchorY: 1
      });
    }

    // 设置游戏区域
    if (this.gameArea) {
      this.setupArea(this.gameArea, {
        bottom: 0,
        height: this.gameAreaHeight,
        anchorY: 0  // 底部对齐
      });
    }
  }

  private setupArea(node: Node, config: {
    top?: number;
    bottom?: number;
    height: number;
    anchorY: number;
  }) {
    // 设置 UITransform
    const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
    transform.setContentSize(this.designWidth, config.height);
    transform.setAnchorPoint(0.5, config.anchorY);

    // 设置 Widget（自适应）
    let widget = node.getComponent(Widget);
    if (!widget) {
      widget = node.addComponent(Widget);
    }

    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.left = 0;
    widget.right = 0;

    if (config.top !== undefined) {
      widget.isAlignTop = true;
      widget.top = config.top;
      widget.isAlignBottom = false;
    }

    if (config.bottom !== undefined) {
      widget.isAlignBottom = true;
      widget.bottom = config.bottom;
      widget.isAlignTop = false;
    }

    widget.updateAlignment();
  }

  private onResize() {
    this.applyLayout();
  }

  // ============================================
  // 公共方法
  // ============================================

  /**
   * 获取动画区域尺寸
   */
  getAnimationAreaSize(): { width: number; height: number } {
    return {
      width: this.designWidth,
      height: this.animationAreaHeight
    };
  }

  /**
   * 获取游戏区域尺寸
   */
  getGameAreaSize(): { width: number; height: number } {
    return {
      width: this.designWidth,
      height: this.gameAreaHeight
    };
  }

  /**
   * 获取 HUD 区域尺寸
   */
  getHudAreaSize(): { width: number; height: number } {
    return {
      width: this.designWidth,
      height: this.hudHeight
    };
  }

  /**
   * 获取游戏区域中心点（用于放置棋盘）
   */
  getGameAreaCenter(): { x: number; y: number } {
    return {
      x: 0,  // 居中
      y: this.gameAreaHeight / 2  // 游戏区域中心
    };
  }

  /**
   * 计算棋盘应该的最大尺寸
   */
  getBoardMaxSize(): number {
    // 留出边距
    const margin = 40;
    const maxWidth = this.designWidth - margin * 2;
    const maxHeight = this.gameAreaHeight - margin * 2 - 100;  // 预留体力条等

    return Math.min(maxWidth, maxHeight);
  }
}
