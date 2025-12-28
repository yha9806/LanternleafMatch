/**
 * 场景管理器
 *
 * 提供场景预加载、切换和过渡动画功能。
 * 使用 Cocos Creator 原生 API，单例模式。
 */

import { _decorator, director, Node, tween, Vec3, UIOpacity } from 'cc';

/** 场景名称枚举 */
export enum SceneName {
  Menu = 'Menu',
  LevelSelect = 'LevelSelect',
  Game = 'Game',
  Settings = 'Settings',
}

/** 过渡动画类型 */
export enum TransitionType {
  None = 'none',
  Fade = 'fade',
  Scale = 'scale',
  FadeScale = 'fadeScale',
}

/** 场景切换选项 */
export interface SceneLoadOptions {
  /** 过渡动画类型 */
  transition?: TransitionType;
  /** 过渡动画时长（秒） */
  duration?: number;
  /** 传递给目标场景的数据 */
  data?: Record<string, unknown>;
  /** 加载进度回调 */
  onProgress?: (progress: number) => void;
  /** 加载完成回调 */
  onComplete?: () => void;
}

/** 场景间传递的数据 */
let _sceneData: Record<string, unknown> = {};

/**
 * 场景管理器
 */
export class SceneManager {
  private static _instance: SceneManager | null = null;

  /** 当前场景名称 */
  private _currentScene: string = '';

  /** 预加载的场景列表 */
  private _preloadedScenes: Set<string> = new Set();

  /** 是否正在切换场景 */
  private _isTransitioning: boolean = false;

  /** 过渡遮罩节点 */
  private _transitionMask: Node | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static get instance(): SceneManager {
    if (!SceneManager._instance) {
      SceneManager._instance = new SceneManager();
    }
    return SceneManager._instance;
  }

  /**
   * 获取当前场景名称
   */
  get currentScene(): string {
    return this._currentScene;
  }

  /**
   * 是否正在切换场景
   */
  get isTransitioning(): boolean {
    return this._isTransitioning;
  }

  /**
   * 获取场景传递数据
   */
  static getSceneData<T = unknown>(key: string): T | undefined {
    return _sceneData[key] as T | undefined;
  }

  /**
   * 设置场景传递数据
   */
  static setSceneData(key: string, value: unknown): void {
    _sceneData[key] = value;
  }

  /**
   * 清除场景数据
   */
  static clearSceneData(): void {
    _sceneData = {};
  }

  /**
   * 预加载场景
   */
  preloadScene(sceneName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._preloadedScenes.has(sceneName)) {
        resolve();
        return;
      }

      director.preloadScene(
        sceneName,
        (completedCount, totalCount) => {
          // 预加载进度
        },
        (error) => {
          if (error) {
            console.error(`[SceneManager] 预加载场景失败: ${sceneName}`, error);
            reject(error);
          } else {
            this._preloadedScenes.add(sceneName);
            console.log(`[SceneManager] 预加载完成: ${sceneName}`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * 批量预加载场景
   */
  async preloadScenes(sceneNames: string[]): Promise<void> {
    await Promise.all(sceneNames.map((name) => this.preloadScene(name)));
  }

  /**
   * 加载场景
   */
  async loadScene(sceneName: string, options: SceneLoadOptions = {}): Promise<void> {
    if (this._isTransitioning) {
      console.warn('[SceneManager] 正在切换场景，忽略重复调用');
      return;
    }

    const {
      transition = TransitionType.Fade,
      duration = 0.3,
      data,
      onProgress,
      onComplete,
    } = options;

    // 设置场景数据
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        SceneManager.setSceneData(key, value);
      });
    }

    this._isTransitioning = true;

    try {
      // 播放退出动画
      if (transition !== TransitionType.None) {
        await this._playExitTransition(transition, duration);
      }

      // 加载场景
      await new Promise<void>((resolve, reject) => {
        director.loadScene(
          sceneName,
          (err) => {
            if (err) {
              reject(err);
            } else {
              this._currentScene = sceneName;
              resolve();
            }
          }
        );
      });

      // 播放进入动画
      if (transition !== TransitionType.None) {
        await this._playEnterTransition(transition, duration);
      }

      onComplete?.();
    } catch (error) {
      console.error(`[SceneManager] 加载场景失败: ${sceneName}`, error);
      throw error;
    } finally {
      this._isTransitioning = false;
    }
  }

  /**
   * 返回上一个场景（简化版，需要自行管理历史）
   */
  goBack(options?: SceneLoadOptions): Promise<void> {
    // 简单实现：根据当前场景判断返回目标
    const backMap: Record<string, string> = {
      [SceneName.LevelSelect]: SceneName.Menu,
      [SceneName.Settings]: SceneName.Menu,
      [SceneName.Game]: SceneName.LevelSelect,
    };

    const targetScene = backMap[this._currentScene] || SceneName.Menu;
    return this.loadScene(targetScene, options);
  }

  /**
   * 播放退出过渡动画
   */
  private _playExitTransition(type: TransitionType, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const canvas = director.getScene()?.getChildByName('Canvas');
      if (!canvas) {
        resolve();
        return;
      }

      const uiOpacity = canvas.getComponent(UIOpacity) || canvas.addComponent(UIOpacity);

      switch (type) {
        case TransitionType.Fade:
          tween(uiOpacity)
            .to(duration, { opacity: 0 })
            .call(() => resolve())
            .start();
          break;

        case TransitionType.Scale:
          tween(canvas)
            .to(duration, { scale: new Vec3(0.9, 0.9, 1) })
            .call(() => resolve())
            .start();
          break;

        case TransitionType.FadeScale:
          tween(uiOpacity)
            .to(duration, { opacity: 0 })
            .start();
          tween(canvas)
            .to(duration, { scale: new Vec3(0.95, 0.95, 1) })
            .call(() => resolve())
            .start();
          break;

        default:
          resolve();
      }
    });
  }

  /**
   * 播放进入过渡动画
   */
  private _playEnterTransition(type: TransitionType, duration: number): Promise<void> {
    return new Promise((resolve) => {
      // 延迟一帧确保场景已加载
      setTimeout(() => {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) {
          resolve();
          return;
        }

        const uiOpacity = canvas.getComponent(UIOpacity) || canvas.addComponent(UIOpacity);

        switch (type) {
          case TransitionType.Fade:
            uiOpacity.opacity = 0;
            tween(uiOpacity)
              .to(duration, { opacity: 255 })
              .call(() => resolve())
              .start();
            break;

          case TransitionType.Scale:
            canvas.setScale(new Vec3(1.1, 1.1, 1));
            tween(canvas)
              .to(duration, { scale: new Vec3(1, 1, 1) })
              .call(() => resolve())
              .start();
            break;

          case TransitionType.FadeScale:
            uiOpacity.opacity = 0;
            canvas.setScale(new Vec3(1.05, 1.05, 1));
            tween(uiOpacity)
              .to(duration, { opacity: 255 })
              .start();
            tween(canvas)
              .to(duration, { scale: new Vec3(1, 1, 1) })
              .call(() => resolve())
              .start();
            break;

          default:
            resolve();
        }
      }, 16);
    });
  }
}

/** 便捷访问 */
export const sceneManager = SceneManager.instance;

export default SceneManager;
