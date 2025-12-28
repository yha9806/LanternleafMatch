/**
 * 关卡选择视图
 *
 * 展示 50 个关卡按钮，支持滚动浏览。
 */

import {
  _decorator,
  Component,
  Node,
  Label,
  Button,
  ScrollView,
  Prefab,
  instantiate,
  Color,
  tween,
  Vec3,
  UITransform,
} from 'cc';
import { gameState, playerProgress, sceneManager, SceneName, MAX_LEVEL } from '../core';

const { ccclass, property } = _decorator;

/** 关卡按钮数据 */
interface LevelButtonData {
  level: number;
  stars: number;
  unlocked: boolean;
  isCurrent: boolean;
}

@ccclass('LevelSelectView')
export class LevelSelectView extends Component {
  // ==================== 属性绑定 ====================

  @property(Label)
  titleLabel: Label | null = null;

  @property(Label)
  progressLabel: Label | null = null;

  @property(Label)
  totalStarsLabel: Label | null = null;

  @property(Button)
  backButton: Button | null = null;

  @property(ScrollView)
  scrollView: ScrollView | null = null;

  @property(Node)
  levelGridContainer: Node | null = null;

  @property(Prefab)
  levelButtonPrefab: Prefab | null = null;

  // ==================== 常量 ====================

  /** 每行关卡数 */
  private readonly LEVELS_PER_ROW = 5;

  /** 关卡按钮尺寸 */
  private readonly BUTTON_SIZE = 160;

  /** 按钮间距 */
  private readonly BUTTON_SPACING = 20;

  // ==================== 私有属性 ====================

  /** 关卡按钮节点列表 */
  private _levelButtons: Node[] = [];

  // ==================== 生命周期 ====================

  onLoad() {
    // 绑定返回按钮
    if (this.backButton) {
      this.backButton.node.on('click', this._onBackClick, this);
    }

    // 更新头部信息
    this._updateHeader();

    // 创建关卡按钮
    this._createLevelButtons();

    // 滚动到当前关卡
    this._scrollToCurrentLevel();
  }

  // ==================== 私有方法 ====================

  /**
   * 更新头部信息
   */
  private _updateHeader(): void {
    if (this.titleLabel) {
      this.titleLabel.string = '关卡选择';
    }

    if (this.progressLabel) {
      const completed = playerProgress.completedLevels;
      this.progressLabel.string = `进度: ${completed}/${MAX_LEVEL} 关`;
    }

    if (this.totalStarsLabel) {
      const stars = playerProgress.totalStars;
      const maxStars = playerProgress.maxTotalStars;
      this.totalStarsLabel.string = `⭐ ${stars}/${maxStars}`;
    }
  }

  /**
   * 创建关卡按钮
   */
  private _createLevelButtons(): void {
    if (!this.levelGridContainer) {
      console.warn('[LevelSelectView] 缺少 levelGridContainer');
      return;
    }

    // 清除现有按钮
    this.levelGridContainer.removeAllChildren();
    this._levelButtons = [];

    const currentLevel = playerProgress.currentLevel;

    // 创建 50 个关卡按钮
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const buttonNode = this._createLevelButton({
        level,
        stars: playerProgress.getLevelStars(level),
        unlocked: playerProgress.isLevelUnlocked(level),
        isCurrent: level === currentLevel,
      });

      this._levelButtons.push(buttonNode);
      this.levelGridContainer.addChild(buttonNode);

      // 设置位置（网格布局）
      const row = Math.floor((level - 1) / this.LEVELS_PER_ROW);
      const col = (level - 1) % this.LEVELS_PER_ROW;

      const x = col * (this.BUTTON_SIZE + this.BUTTON_SPACING) + this.BUTTON_SIZE / 2;
      const y = -row * (this.BUTTON_SIZE + this.BUTTON_SPACING) - this.BUTTON_SIZE / 2;

      buttonNode.setPosition(x, y, 0);
    }

    // 更新容器高度
    const totalRows = Math.ceil(MAX_LEVEL / this.LEVELS_PER_ROW);
    const containerHeight = totalRows * (this.BUTTON_SIZE + this.BUTTON_SPACING);
    const uiTransform = this.levelGridContainer.getComponent(UITransform);
    if (uiTransform) {
      uiTransform.height = containerHeight;
    }
  }

  /**
   * 创建单个关卡按钮
   */
  private _createLevelButton(data: LevelButtonData): Node {
    // 如果有预制体则使用预制体
    if (this.levelButtonPrefab) {
      const node = instantiate(this.levelButtonPrefab);
      this._setupLevelButton(node, data);
      return node;
    }

    // 否则动态创建
    const node = new Node(`Level_${data.level}`);

    // 添加 UITransform
    const uiTransform = node.addComponent(UITransform);
    uiTransform.width = this.BUTTON_SIZE;
    uiTransform.height = this.BUTTON_SIZE;

    // 添加按钮组件
    const button = node.addComponent(Button);

    // 添加背景（简化版，实际应使用 Sprite）
    // 这里仅作示例，实际项目中应使用预制体

    // 添加关卡编号标签
    const labelNode = new Node('Label');
    labelNode.parent = node;
    const label = labelNode.addComponent(Label);
    label.string = data.unlocked ? `${data.level}` : '🔒';
    label.fontSize = 48;
    label.color = data.unlocked ? new Color(255, 255, 255) : new Color(150, 150, 150);

    // 添加星级标签
    if (data.stars > 0) {
      const starsNode = new Node('Stars');
      starsNode.parent = node;
      starsNode.setPosition(0, -50, 0);
      const starsLabel = starsNode.addComponent(Label);
      starsLabel.string = '⭐'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
      starsLabel.fontSize = 20;
    }

    // 当前关卡高亮
    if (data.isCurrent) {
      // 添加高亮效果
      tween(node)
        .repeatForever(
          tween(node)
            .to(0.5, { scale: new Vec3(1.1, 1.1, 1) })
            .to(0.5, { scale: new Vec3(1, 1, 1) })
        )
        .start();
    }

    // 绑定点击事件
    node.on('click', () => this._onLevelClick(data.level, data.unlocked));

    return node;
  }

  /**
   * 设置关卡按钮（用于预制体）
   */
  private _setupLevelButton(node: Node, data: LevelButtonData): void {
    // 查找并设置子节点
    const levelLabel = node.getChildByName('LevelLabel')?.getComponent(Label);
    const starsLabel = node.getChildByName('StarsLabel')?.getComponent(Label);
    const lockIcon = node.getChildByName('LockIcon');

    if (levelLabel) {
      levelLabel.string = `${data.level}`;
    }

    if (starsLabel) {
      starsLabel.string = '⭐'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
      starsLabel.node.active = data.stars > 0;
    }

    if (lockIcon) {
      lockIcon.active = !data.unlocked;
    }

    // 绑定点击
    node.on('click', () => this._onLevelClick(data.level, data.unlocked));
  }

  /**
   * 滚动到当前关卡
   */
  private _scrollToCurrentLevel(): void {
    if (!this.scrollView) return;

    const currentLevel = playerProgress.currentLevel;
    const row = Math.floor((currentLevel - 1) / this.LEVELS_PER_ROW);
    const totalRows = Math.ceil(MAX_LEVEL / this.LEVELS_PER_ROW);

    // 计算滚动位置（0-1）
    const scrollY = Math.max(0, Math.min(1, row / (totalRows - 1)));

    // 延迟滚动，确保布局完成
    this.scheduleOnce(() => {
      this.scrollView?.scrollToPercentVertical(1 - scrollY, 0.3);
    }, 0.1);
  }

  // ==================== 事件处理 ====================

  /**
   * 返回按钮点击
   */
  private async _onBackClick(): Promise<void> {
    await sceneManager.loadScene(SceneName.Menu);
  }

  /**
   * 关卡按钮点击
   */
  private async _onLevelClick(level: number, unlocked: boolean): Promise<void> {
    if (!unlocked) {
      // 显示提示
      console.log(`关卡 ${level} 未解锁，请先通关前面的关卡`);
      // TODO: 显示 Toast 提示
      return;
    }

    // 播放点击音效
    // audioManager.playSFX('sfx_button');

    // 开始游戏
    await gameState.startGame(level);
  }

  // ==================== 公共方法 ====================

  /**
   * 刷新关卡列表
   */
  refresh(): void {
    this._updateHeader();
    this._createLevelButtons();
  }
}

export default LevelSelectView;
