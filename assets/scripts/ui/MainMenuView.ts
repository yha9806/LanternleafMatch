/**
 * 主菜单视图
 *
 * 游戏入口页面，显示标题、进度、按钮和体力状态。
 */

import {
  _decorator,
  Component,
  Node,
  Label,
  Button,
  Sprite,
  Color,
  tween,
  Vec3,
  UIOpacity,
} from 'cc';
import { gameState, playerProgress, sceneManager, SceneName } from '../core';

const { ccclass, property } = _decorator;

@ccclass('MainMenuView')
export class MainMenuView extends Component {
  // ==================== 属性绑定 ====================

  @property(Label)
  titleLabel: Label | null = null;

  @property(Label)
  currentLevelLabel: Label | null = null;

  @property(Label)
  totalStarsLabel: Label | null = null;

  @property(Button)
  startButton: Button | null = null;

  @property(Button)
  settingsButton: Button | null = null;

  @property(Label)
  energyLabel: Label | null = null;

  @property(Label)
  energyTimerLabel: Label | null = null;

  @property(Node)
  characterNode: Node | null = null;

  // ==================== 私有属性 ====================

  private _energyUpdateInterval: number = 0;

  // ==================== 生命周期 ====================

  async onLoad() {
    // 初始化游戏状态
    await gameState.init();

    // 绑定按钮事件
    this._bindEvents();

    // 更新 UI
    this._updateUI();

    // 启动体力更新定时器
    this._startEnergyTimer();

    // 播放进入动画
    this._playEnterAnimation();
  }

  onDestroy() {
    // 清除定时器
    if (this._energyUpdateInterval) {
      clearInterval(this._energyUpdateInterval);
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 绑定按钮事件
   */
  private _bindEvents(): void {
    if (this.startButton) {
      this.startButton.node.on('click', this._onStartClick, this);
    }

    if (this.settingsButton) {
      this.settingsButton.node.on('click', this._onSettingsClick, this);
    }
  }

  /**
   * 更新 UI 显示
   */
  private _updateUI(): void {
    // 更新标题
    if (this.titleLabel) {
      this.titleLabel.string = '灯笼叶子消消乐';
    }

    // 更新当前关卡
    if (this.currentLevelLabel) {
      const level = playerProgress.currentLevel;
      this.currentLevelLabel.string = `当前关卡: 第 ${level} 关`;
    }

    // 更新总星数
    if (this.totalStarsLabel) {
      const stars = playerProgress.totalStars;
      const maxStars = playerProgress.maxTotalStars;
      this.totalStarsLabel.string = `总星数: ⭐ ${stars}/${maxStars}`;
    }

    // 更新体力
    this._updateEnergyDisplay();
  }

  /**
   * 更新体力显示
   */
  private _updateEnergyDisplay(): void {
    // 这里需要与 EnergyManager 集成
    // 暂时使用模拟数据
    const energy = 5;
    const maxEnergy = 5;

    if (this.energyLabel) {
      this.energyLabel.string = `⚡ ${energy}/${maxEnergy}`;

      if (energy >= maxEnergy) {
        this.energyLabel.color = new Color(100, 255, 100, 255);
      } else {
        this.energyLabel.color = new Color(255, 255, 255, 255);
      }
    }

    if (this.energyTimerLabel) {
      if (energy >= maxEnergy) {
        this.energyTimerLabel.string = '已满';
      } else {
        // 显示回复倒计时（需要 EnergyManager）
        this.energyTimerLabel.string = '20:00';
      }
    }
  }

  /**
   * 启动体力更新定时器
   */
  private _startEnergyTimer(): void {
    this._energyUpdateInterval = setInterval(() => {
      this._updateEnergyDisplay();
    }, 1000) as unknown as number;
  }

  /**
   * 播放进入动画
   */
  private _playEnterAnimation(): void {
    // 标题动画
    if (this.titleLabel) {
      const node = this.titleLabel.node;
      node.setScale(new Vec3(0.8, 0.8, 1));
      tween(node)
        .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();
    }

    // 角色动画
    if (this.characterNode) {
      const uiOpacity = this.characterNode.getComponent(UIOpacity) ||
        this.characterNode.addComponent(UIOpacity);
      uiOpacity.opacity = 0;
      tween(uiOpacity)
        .delay(0.3)
        .to(0.5, { opacity: 255 })
        .start();
    }

    // 按钮动画
    const buttons = [this.startButton?.node, this.settingsButton?.node].filter(Boolean) as Node[];
    buttons.forEach((btn, index) => {
      btn.setScale(new Vec3(0, 0, 1));
      tween(btn)
        .delay(0.4 + index * 0.1)
        .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();
    });
  }

  // ==================== 事件处理 ====================

  /**
   * 开始游戏按钮点击
   */
  private async _onStartClick(): Promise<void> {
    // 播放点击音效（需要 AudioManager）
    // audioManager.playSFX('sfx_button');

    // 按钮缩放反馈
    if (this.startButton) {
      const node = this.startButton.node;
      tween(node)
        .to(0.1, { scale: new Vec3(0.9, 0.9, 1) })
        .to(0.1, { scale: new Vec3(1, 1, 1) })
        .call(async () => {
          // 跳转到关卡选择
          await sceneManager.loadScene(SceneName.LevelSelect);
        })
        .start();
    }
  }

  /**
   * 设置按钮点击
   */
  private async _onSettingsClick(): Promise<void> {
    // 播放点击音效
    // audioManager.playSFX('sfx_button');

    // 按钮缩放反馈
    if (this.settingsButton) {
      const node = this.settingsButton.node;
      tween(node)
        .to(0.1, { scale: new Vec3(0.9, 0.9, 1) })
        .to(0.1, { scale: new Vec3(1, 1, 1) })
        .call(async () => {
          // 跳转到设置
          await sceneManager.loadScene(SceneName.Settings);
        })
        .start();
    }
  }

  // ==================== 公共方法 ====================

  /**
   * 刷新 UI（外部调用）
   */
  refresh(): void {
    this._updateUI();
  }
}

export default MainMenuView;
