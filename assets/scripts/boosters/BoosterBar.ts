import {
  _decorator, Component, Node, Label, Button, Sprite, Color,
  tween, Vec3, Prefab, instantiate, SpriteFrame
} from 'cc';
import { BoosterManager, getBoosterManager, BoosterEvent } from './BoosterManager';
import { BoosterType, getBoosterDef, getAllBoosterTypes, BOOSTER_DEFS } from './BoosterTypes';

const { ccclass, property } = _decorator;

/**
 * BoosterBar - 道具栏 UI
 * 显示可用道具和触发使用
 */
@ccclass('BoosterBar')
export class BoosterBar extends Component {
  // ============================================
  // UI 引用
  // ============================================

  @property(Node)
  boosterContainer: Node = null!;

  @property(Prefab)
  boosterSlotPrefab: Prefab = null!;

  // ============================================
  // 配置
  // ============================================

  @property([BoosterSlotConfig])
  slots: BoosterSlotConfig[] = [];

  @property
  enabledBoosterTypes: string[] = ['hammer', 'shuffle', 'hint'];

  // ============================================
  // 状态
  // ============================================

  private slotNodes: Map<BoosterType, Node> = new Map();
  private selectedSlot: BoosterType | null = null;
  private unsubscribe: (() => void) | null = null;

  private selectCallback: ((type: BoosterType) => void) | null = null;

  // ============================================
  // 生命周期
  // ============================================

  onLoad() {
    this.setupSlots();
    this.subscribeToManager();
    this.updateAllSlots();
  }

  onDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 设置道具选择回调
   */
  setSelectCallback(callback: (type: BoosterType) => void) {
    this.selectCallback = callback;
  }

  /**
   * 更新所有道具槽
   */
  updateAllSlots() {
    const manager = getBoosterManager();
    if (!manager) return;

    for (const type of this.enabledBoosterTypes as BoosterType[]) {
      this.updateSlot(type);
    }
  }

  /**
   * 高亮指定道具
   */
  highlightBooster(type: BoosterType) {
    const node = this.slotNodes.get(type);
    if (!node) return;

    // 添加高亮动画
    tween(node)
      .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
      .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backIn' })
      .union()
      .repeat(3)
      .start();
  }

  /**
   * 设置选中状态
   */
  setSelected(type: BoosterType | null) {
    // 取消之前的选中
    if (this.selectedSlot) {
      this.setSlotSelected(this.selectedSlot, false);
    }

    this.selectedSlot = type;

    // 设置新选中
    if (type) {
      this.setSlotSelected(type, true);
    }
  }

  /**
   * 取消选中
   */
  clearSelection() {
    this.setSelected(null);
  }

  /**
   * 禁用所有道具
   */
  disableAll() {
    for (const [_, node] of this.slotNodes) {
      const button = node.getComponent(Button);
      if (button) {
        button.interactable = false;
      }
    }
  }

  /**
   * 启用所有道具
   */
  enableAll() {
    for (const type of this.enabledBoosterTypes as BoosterType[]) {
      this.updateSlot(type);
    }
  }

  // ============================================
  // 内部方法 - 初始化
  // ============================================

  private setupSlots() {
    if (!this.boosterContainer) return;

    // 清除现有槽位
    this.boosterContainer.removeAllChildren();
    this.slotNodes.clear();

    // 创建道具槽
    for (const typeStr of this.enabledBoosterTypes) {
      const type = typeStr as BoosterType;
      const def = BOOSTER_DEFS[type];
      if (!def) continue;

      let slotNode: Node;

      if (this.boosterSlotPrefab) {
        slotNode = instantiate(this.boosterSlotPrefab);
      } else {
        // 创建简单的槽位节点
        slotNode = new Node(`BoosterSlot_${type}`);
        slotNode.addComponent(Button);
      }

      slotNode.parent = this.boosterContainer;
      slotNode.name = `BoosterSlot_${type}`;

      // 设置点击事件
      const button = slotNode.getComponent(Button);
      if (button) {
        slotNode.on('click', () => this.onSlotClick(type), this);
      }

      this.slotNodes.set(type, slotNode);
    }
  }

  private subscribeToManager() {
    const manager = getBoosterManager();
    if (!manager) return;

    this.unsubscribe = manager.onBoosterEvent((event) => {
      this.handleBoosterEvent(event);
    });
  }

  // ============================================
  // 内部方法 - UI 更新
  // ============================================

  private updateSlot(type: BoosterType) {
    const node = this.slotNodes.get(type);
    if (!node) return;

    const manager = getBoosterManager();
    if (!manager) return;

    const def = getBoosterDef(type);
    const count = manager.getCount(type);
    const freeRemaining = manager.getDailyFreeRemaining(type);
    const { available, source } = manager.canUseBooster(type);

    // 更新数量标签
    const countLabel = node.getChildByName('CountLabel')?.getComponent(Label);
    if (countLabel) {
      if (count > 0) {
        // 有库存：显示数量
        countLabel.string = `${count}`;
        countLabel.color = new Color(255, 255, 255, 255);
      } else if (freeRemaining > 0) {
        // 有每日免费次数
        countLabel.string = `免费${freeRemaining}`;
        countLabel.color = new Color(100, 255, 100, 255);
      } else if (source === 'ad') {
        // 需要看广告
        countLabel.string = '广告';
        countLabel.color = new Color(255, 180, 50, 255);
      } else {
        // 完全不可用
        countLabel.string = '0';
        countLabel.color = new Color(150, 150, 150, 200);
      }
    }

    // 更新广告图标
    const adIcon = node.getChildByName('AdIcon');
    if (adIcon) {
      adIcon.active = (count === 0 && freeRemaining === 0 && source === 'ad');
    }

    // 更新图标
    const iconSprite = node.getChildByName('Icon')?.getComponent(Sprite);
    if (iconSprite) {
      // 加载图标资源（实际项目中应使用资源管理器）
      // iconSprite.spriteFrame = ...
    }

    // 更新按钮状态
    const button = node.getComponent(Button);
    if (button) {
      button.interactable = available;
    }

    // 更新视觉状态
    const bgSprite = node.getChildByName('Background')?.getComponent(Sprite);
    if (bgSprite) {
      bgSprite.color = available
        ? new Color(255, 255, 255, 255)
        : new Color(150, 150, 150, 200);
    }
  }

  private setSlotSelected(type: BoosterType, selected: boolean) {
    const node = this.slotNodes.get(type);
    if (!node) return;

    // 视觉反馈
    if (selected) {
      tween(node)
        .to(0.15, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' })
        .start();

      const bgSprite = node.getChildByName('Background')?.getComponent(Sprite);
      if (bgSprite) {
        bgSprite.color = new Color(255, 220, 100, 255);
      }
    } else {
      tween(node)
        .to(0.15, { scale: new Vec3(1, 1, 1) }, { easing: 'backIn' })
        .start();

      const bgSprite = node.getChildByName('Background')?.getComponent(Sprite);
      if (bgSprite) {
        bgSprite.color = new Color(255, 255, 255, 255);
      }
    }
  }

  // ============================================
  // 内部方法 - 事件处理
  // ============================================

  private onSlotClick(type: BoosterType) {
    const manager = getBoosterManager();
    if (!manager) return;

    // 如果已选中同一个，取消选中
    if (this.selectedSlot === type) {
      manager.cancelUseBooster();
      this.setSelected(null);
      return;
    }

    // 开始使用道具
    const result = manager.startUseBooster(type);

    if (result.started) {
      if (result.requiresTarget) {
        // 需要选择目标，等待玩家点击棋盘
        this.setSelected(type);

        if (this.selectCallback) {
          this.selectCallback(type);
        }
      } else {
        // 不需要选择目标，直接使用
        manager.confirmUseBooster(undefined, 0).then((useResult) => {
          if (useResult.success) {
            this.playUseAnimation(type);
          }
        });
      }
    }
  }

  private handleBoosterEvent(event: BoosterEvent) {
    switch (event.type) {
      case 'booster_added':
        this.updateSlot(event.boosterType);
        this.playAddAnimation(event.boosterType);
        break;

      case 'booster_used':
        this.updateSlot(event.boosterType);
        this.playUseAnimation(event.boosterType);
        this.setSelected(null);
        break;

      case 'booster_select_cancel':
        this.setSelected(null);
        break;
    }
  }

  // ============================================
  // 内部方法 - 动画
  // ============================================

  private playAddAnimation(type: BoosterType) {
    const node = this.slotNodes.get(type);
    if (!node) return;

    const original = node.scale.clone();

    tween(node)
      .to(0.1, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' })
      .to(0.2, { scale: original }, { easing: 'elasticOut' })
      .start();
  }

  private playUseAnimation(type: BoosterType) {
    const node = this.slotNodes.get(type);
    if (!node) return;

    tween(node)
      .to(0.1, { scale: new Vec3(0.8, 0.8, 1) })
      .to(0.15, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }
}

/**
 * 道具槽配置
 */
@ccclass('BoosterSlotConfig')
class BoosterSlotConfig {
  @property
  boosterType: string = 'hammer';

  @property(SpriteFrame)
  icon: SpriteFrame = null!;
}
