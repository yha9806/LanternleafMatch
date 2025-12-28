import {
  _decorator, Component, Node, director, resources, JsonAsset
} from 'cc';
import { GameController } from '../core/GameController';
import { EnergyManager } from '../core/EnergyManager';
import { SceneManager, gameState, playerProgress } from '../core';
import { BoardView } from './BoardView';
import { HudView } from '../ui/HudView';
import { ModalManager } from '../ui/ModalManager';
import type { LevelState, SwapAction, MatchResult, EnergyState } from '../core/types';

const { ccclass, property } = _decorator;

/**
 * 游戏主管理器
 * 协调核心逻辑与视图层
 */
@ccclass('GameManager')
export class GameManager extends Component {
  @property(BoardView)
  boardView: BoardView = null!;

  @property(HudView)
  hudView: HudView = null!;

  @property(ModalManager)
  modalManager: ModalManager = null!;

  // 核心控制器
  private gameController: GameController = null!;
  private energyManager: EnergyManager = null!;

  // 玩家状态
  private playerId: string = 'player_default';
  private currentLevel: number = 1;
  private energyState: EnergyState = null!;

  // 配置
  private levelsConfig: any = null;

  onLoad() {
    this.loadConfigs();
    this.initManagers();
    this.setupCallbacks();
  }

  start() {
    this.loadPlayerState();

    // 检查是否从关卡选择传入了关卡
    const selectedLevel = SceneManager.getSceneData<number>('level');
    if (selectedLevel !== undefined) {
      this.currentLevel = selectedLevel;
      SceneManager.clearSceneData();
    }

    this.startLevel(this.currentLevel);
  }

  // ============================================
  // 公共方法
  // ============================================

  /**
   * 开始关卡
   */
  startLevel(levelIndex: number) {
    // 检查体力
    if (!this.energyManager.isInNewbieProtection(levelIndex)) {
      const result = this.energyManager.consumeEnergy(this.energyState);
      if (!result.success) {
        this.showEnergyGate();
        return;
      }
      this.energyState = result.newState;
      this.savePlayerState();
    }

    this.currentLevel = levelIndex;
    const state = this.gameController.startLevel(levelIndex);

    // 渲染棋盘
    this.boardView.renderBoard(state.board);
    this.hudView.updateLevel(levelIndex);
    this.hudView.updateMoves(state.movesLeft);
    this.hudView.updateGoals(state.goals);
    this.hudView.updateEnergy(this.energyState.current, this.energyState.max);
  }

  /**
   * 暂停游戏
   */
  pauseGame() {
    this.gameController.pause();
    this.modalManager.showPauseModal({
      onResume: () => this.resumeGame(),
      onRestart: () => this.restartLevel(),
      onQuit: () => this.quitToMenu(),
    });
  }

  /**
   * 恢复游戏
   */
  resumeGame() {
    this.gameController.resume();
  }

  /**
   * 重新开始
   */
  restartLevel() {
    this.startLevel(this.currentLevel);
  }

  /**
   * 下一关
   */
  nextLevel() {
    this.currentLevel += 1;
    this.savePlayerState();
    this.startLevel(this.currentLevel);
  }

  /**
   * 获取提示
   */
  showHint() {
    const hint = this.gameController.getHint();
    if (hint) {
      this.boardView.showHint(hint);
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  private loadConfigs() {
    resources.load('configs/levels', JsonAsset, (err, asset) => {
      if (!err && asset) {
        this.levelsConfig = asset.json;
      }
    });
  }

  private initManagers() {
    this.energyManager = new EnergyManager();
    this.energyState = this.energyManager.createInitialState();

    this.gameController = new GameController({
      playerId: this.playerId,
      onStateChange: (state) => this.onGameStateChange(state),
      onMatchComplete: (result) => this.onMatchComplete(result),
      onLevelComplete: (state) => this.onLevelComplete(state),
      onLevelFailed: (state) => this.onLevelFailed(state),
      onShuffle: () => this.onShuffle(),
    });
  }

  private setupCallbacks() {
    // 棋盘交换回调
    this.boardView.setOnSwap((swap) => this.handleSwap(swap));

    // HUD 回调
    this.hudView.setOnPause(() => this.pauseGame());
    this.hudView.setOnHint(() => this.showHint());
  }

  private async handleSwap(swap: SwapAction) {
    const result = this.gameController.executeSwap(swap);

    // 交换动画
    await this.boardView.animateSwap(swap.from, swap.to, result.valid);

    if (result.valid) {
      // 处理消除结果
      for (const matchResult of result.results) {
        await this.processMatchResult(matchResult);
      }
    }
  }

  private async processMatchResult(result: MatchResult) {
    // 消除动画
    const allCells = result.matches.flatMap(m => m.cells);
    await this.boardView.animateMatch(allCells);

    // 清除苔藓
    for (const cell of result.clearedMoss) {
      this.boardView.removeMossOverlay(cell);
    }

    // 这里简化处理，实际需要计算下落和生成
    // 完整实现需要跟踪每个格子的移动
    const state = this.gameController.getState();
    if (state) {
      this.boardView.renderBoard(state.board);
    }
  }

  private onGameStateChange(state: LevelState) {
    this.hudView.updateMoves(state.movesLeft);
    this.hudView.updateGoals(state.goals);
  }

  private onMatchComplete(result: MatchResult) {
    // 播放音效、粒子效果等
    if (result.cascadeIndex > 0) {
      // 连消加成提示
      this.hudView.showCombo(result.cascadeIndex + 1);
    }
  }

  private onLevelComplete(state: LevelState) {
    // 计算星级（简化：剩余步数越多星级越高）
    let stars = 1;
    if (state.movesLeft >= 5) stars = 3;
    else if (state.movesLeft >= 2) stars = 2;

    // 更新玩家进度
    playerProgress.completeLevel(this.currentLevel, stars);
    this.savePlayerState();

    this.modalManager.showWinModal({
      level: this.currentLevel,
      movesLeft: state.movesLeft,
      onNext: () => this.nextLevel(),
      onReplay: () => this.restartLevel(),
    });
  }

  private onLevelFailed(state: LevelState) {
    this.modalManager.showLoseModal({
      level: this.currentLevel,
      onRetry: () => this.handleRetry(),
      onQuit: () => this.quitToMenu(),
    });
  }

  private onShuffle() {
    // 洗牌动画/提示
    this.hudView.showMessage('牌面已刷新');
    const state = this.gameController.getState();
    if (state) {
      this.boardView.renderBoard(state.board);
    }
  }

  private handleRetry() {
    // 检查体力或看广告
    if (this.energyState.current > 0) {
      this.restartLevel();
    } else {
      this.showEnergyGate();
    }
  }

  private showEnergyGate() {
    const nextRegenSeconds = this.energyManager.getNextRegenSeconds(this.energyState, Date.now());

    this.modalManager.showEnergyGateModal({
      nextRegenSeconds,
      onWatchAd: () => this.handleWatchAd(),
      onWait: () => {}, // 关闭弹窗，等待回充
    });
  }

  private async handleWatchAd() {
    // 这里接入平台广告
    // 简化处理：直接发奖励
    const result = this.energyManager.rewardFromAd(this.energyState, Date.now());
    if (result.success) {
      this.energyState = result.newState;
      this.hudView.updateEnergy(this.energyState.current, this.energyState.max);
      this.savePlayerState();
      this.startLevel(this.currentLevel);
    } else {
      this.hudView.showMessage('广告次数已达上限，请稍后再试');
    }
  }

  private async quitToMenu() {
    await gameState.goToMainMenu();
  }

  /**
   * 返回关卡选择
   */
  private async quitToLevelSelect() {
    await gameState.goToLevelSelect();
  }

  private loadPlayerState() {
    // 从本地存储加载
    const saved = localStorage.getItem('lanternleaf_player');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.currentLevel = data.currentLevel || 1;
        this.energyState = data.energyState || this.energyManager.createInitialState();
        this.playerId = data.playerId || this.playerId;
      } catch {
        // 使用默认值
      }
    }

    // 更新离线回充
    this.energyState = this.energyManager.getCurrentEnergy(this.energyState, Date.now());
  }

  private savePlayerState() {
    const data = {
      playerId: this.playerId,
      currentLevel: this.currentLevel,
      energyState: this.energyState,
    };
    localStorage.setItem('lanternleaf_player', JSON.stringify(data));
  }
}
