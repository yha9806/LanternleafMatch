import {
  _decorator, Component, Node, Label, Sprite, Button, tween, Vec3
} from 'cc';
import type { Goal } from '../core/types';

const { ccclass, property } = _decorator;

/**
 * HUD 视图组件
 * 显示关卡信息、目标、步数、体力等
 */
@ccclass('HudView')
export class HudView extends Component {
  @property(Label)
  levelLabel: Label = null!;

  @property(Label)
  movesLabel: Label = null!;

  @property(Node)
  goalContainer: Node = null!;

  @property(Label)
  energyLabel: Label = null!;

  @property(Node)
  energyIcon: Node = null!;

  @property(Button)
  pauseButton: Button = null!;

  @property(Button)
  hintButton: Button = null!;

  @property(Label)
  messageLabel: Label = null!;

  @property(Label)
  comboLabel: Label = null!;

  // 回调
  private onPauseCallback: (() => void) | null = null;
  private onHintCallback: (() => void) | null = null;

  onLoad() {
    this.setupButtons();
    this.hideMessage();
    this.hideCombo();
  }

  // ============================================
  // 公共方法
  // ============================================

  setOnPause(callback: () => void) {
    this.onPauseCallback = callback;
  }

  setOnHint(callback: () => void) {
    this.onHintCallback = callback;
  }

  updateLevel(level: number) {
    if (this.levelLabel) {
      this.levelLabel.string = `第 ${level} 关`;
    }
  }

  updateMoves(moves: number) {
    if (this.movesLabel) {
      this.movesLabel.string = `${moves}`;

      // 步数少时警告动画
      if (moves <= 3) {
        this.pulseNode(this.movesLabel.node);
        this.movesLabel.color.set(255, 100, 100, 255);
      }
    }
  }

  updateGoals(goals: Goal[]) {
    // 简化实现：只显示第一个目标
    const goal = goals[0];
    if (!goal) return;

    // 实际实现需要根据目标类型显示不同的图标和进度
    // 这里用 Label 简化
    const children = this.goalContainer.children;
    if (children.length > 0) {
      const label = children[0].getComponent(Label);
      if (label) {
        if (goal.type === 'collect') {
          label.string = `${goal.item}: ${goal.current}/${goal.count}`;
        } else if (goal.type === 'clear_moss') {
          label.string = `苔藓: ${goal.current}/${goal.count}`;
        } else if (goal.type === 'combo') {
          label.string = `${goal.collect.item}: ${goal.collect.current}/${goal.collect.count} | 苔藓: ${goal.clearMoss.current}/${goal.clearMoss.count}`;
        }
      }
    }
  }

  updateEnergy(current: number, max: number) {
    if (this.energyLabel) {
      this.energyLabel.string = `${current}/${max}`;
    }
  }

  showMessage(text: string, duration: number = 1500) {
    if (this.messageLabel) {
      this.messageLabel.string = text;
      this.messageLabel.node.active = true;
      this.messageLabel.node.setScale(new Vec3(0, 0, 1));

      tween(this.messageLabel.node)
        .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .delay(duration / 1000)
        .to(0.2, { scale: new Vec3(0, 0, 1) })
        .call(() => this.hideMessage())
        .start();
    }
  }

  showCombo(count: number) {
    if (this.comboLabel && count > 1) {
      this.comboLabel.string = `连消 x${count}!`;
      this.comboLabel.node.active = true;
      this.comboLabel.node.setScale(new Vec3(0, 0, 1));

      tween(this.comboLabel.node)
        .to(0.15, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' })
        .to(0.1, { scale: new Vec3(1, 1, 1) })
        .delay(0.8)
        .to(0.2, { scale: new Vec3(0, 0, 1) })
        .call(() => this.hideCombo())
        .start();
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  private setupButtons() {
    if (this.pauseButton) {
      this.pauseButton.node.on(Button.EventType.CLICK, () => {
        this.onPauseCallback?.();
      });
    }

    if (this.hintButton) {
      this.hintButton.node.on(Button.EventType.CLICK, () => {
        this.onHintCallback?.();
      });
    }
  }

  private hideMessage() {
    if (this.messageLabel) {
      this.messageLabel.node.active = false;
    }
  }

  private hideCombo() {
    if (this.comboLabel) {
      this.comboLabel.node.active = false;
    }
  }

  private pulseNode(node: Node) {
    tween(node)
      .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
      .to(0.1, { scale: new Vec3(1, 1, 1) })
      .start();
  }
}
