/**
 * 游戏全局状态
 *
 * 整合玩家进度、设置和运行时状态。
 * 提供统一的访问接口。
 */

import { PlayerProgress, playerProgress, type PlayerProgressData } from './PlayerProgress';
import { SettingsManager, settingsManager, type SettingsData } from './SettingsManager';
import { SceneManager, sceneManager, SceneName } from './SceneManager';

/** 当前选择的关卡 */
let _selectedLevel: number = 1;

/** 游戏运行时状态 */
export interface RuntimeState {
  /** 当前选择的关卡 */
  selectedLevel: number;

  /** 是否在游戏中 */
  isInGame: boolean;

  /** 是否暂停 */
  isPaused: boolean;

  /** 当前场景 */
  currentScene: string;
}

/**
 * 游戏全局状态管理
 */
export class GameState {
  private static _instance: GameState | null = null;

  /** 是否已初始化 */
  private _initialized: boolean = false;

  /** 是否在游戏中 */
  private _isInGame: boolean = false;

  /** 是否暂停 */
  private _isPaused: boolean = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static get instance(): GameState {
    if (!GameState._instance) {
      GameState._instance = new GameState();
    }
    return GameState._instance;
  }

  /**
   * 初始化游戏状态
   */
  async init(): Promise<void> {
    if (this._initialized) return;

    console.log('[GameState] 开始初始化...');

    // 初始化各子系统
    await playerProgress.init();
    await settingsManager.init();

    this._initialized = true;
    console.log('[GameState] 初始化完成');
  }

  /**
   * 检查是否已初始化
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  // ==================== 进度相关 ====================

  /**
   * 获取玩家进度管理器
   */
  get progress(): PlayerProgress {
    return playerProgress;
  }

  /**
   * 获取当前关卡
   */
  get currentLevel(): number {
    return playerProgress.currentLevel;
  }

  /**
   * 获取总星数
   */
  get totalStars(): number {
    return playerProgress.totalStars;
  }

  /**
   * 获取进度数据
   */
  getProgressData(): Readonly<PlayerProgressData> {
    return playerProgress.getData();
  }

  // ==================== 设置相关 ====================

  /**
   * 获取设置管理器
   */
  get settings(): SettingsManager {
    return settingsManager;
  }

  /**
   * 获取设置数据
   */
  getSettingsData(): Readonly<SettingsData> {
    return settingsManager.getData();
  }

  // ==================== 场景相关 ====================

  /**
   * 获取场景管理器
   */
  get scene(): SceneManager {
    return sceneManager;
  }

  // ==================== 运行时状态 ====================

  /**
   * 获取选择的关卡
   */
  get selectedLevel(): number {
    return _selectedLevel;
  }

  /**
   * 设置选择的关卡
   */
  set selectedLevel(level: number) {
    _selectedLevel = level;
  }

  /**
   * 是否在游戏中
   */
  get isInGame(): boolean {
    return this._isInGame;
  }

  /**
   * 设置游戏中状态
   */
  setInGame(value: boolean): void {
    this._isInGame = value;
  }

  /**
   * 是否暂停
   */
  get isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * 设置暂停状态
   */
  setPaused(value: boolean): void {
    this._isPaused = value;
  }

  /**
   * 获取运行时状态
   */
  getRuntimeState(): RuntimeState {
    return {
      selectedLevel: _selectedLevel,
      isInGame: this._isInGame,
      isPaused: this._isPaused,
      currentScene: sceneManager.currentScene,
    };
  }

  // ==================== 便捷方法 ====================

  /**
   * 开始游戏（选择关卡后调用）
   */
  async startGame(level: number): Promise<void> {
    if (!playerProgress.isLevelUnlocked(level)) {
      console.warn(`[GameState] 关卡 ${level} 未解锁`);
      return;
    }

    _selectedLevel = level;
    this._isInGame = true;
    this._isPaused = false;

    // 设置场景数据
    SceneManager.setSceneData('level', level);

    // 切换到游戏场景
    await sceneManager.loadScene(SceneName.Game);
  }

  /**
   * 完成关卡
   */
  completeLevel(stars: number): boolean {
    const isNewRecord = playerProgress.completeLevel(_selectedLevel, stars);
    this._isInGame = false;
    return isNewRecord;
  }

  /**
   * 关卡失败
   */
  failLevel(): void {
    this._isInGame = false;
  }

  /**
   * 返回主菜单
   */
  async goToMainMenu(): Promise<void> {
    this._isInGame = false;
    this._isPaused = false;
    await sceneManager.loadScene(SceneName.Menu);
  }

  /**
   * 返回关卡选择
   */
  async goToLevelSelect(): Promise<void> {
    this._isInGame = false;
    this._isPaused = false;
    await sceneManager.loadScene(SceneName.LevelSelect);
  }

  /**
   * 打开设置
   */
  async goToSettings(): Promise<void> {
    await sceneManager.loadScene(SceneName.Settings);
  }

  /**
   * 重置游戏（清除所有进度和设置）
   */
  resetAll(): void {
    playerProgress.reset();
    settingsManager.resetToDefault();
    _selectedLevel = 1;
    this._isInGame = false;
    this._isPaused = false;
    console.log('[GameState] 游戏已完全重置');
  }
}

/** 便捷访问 */
export const gameState = GameState.instance;

export default GameState;
