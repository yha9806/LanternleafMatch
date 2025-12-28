/**
 * 设置管理器
 *
 * 管理游戏设置项（音量、震动等）。
 * 支持本地存储持久化和实时生效。
 */

const STORAGE_KEY = 'lanternleaf_settings';

/** 设置数据结构 */
export interface SettingsData {
  /** 背景音乐音量（0-1） */
  bgmVolume: number;

  /** 音效音量（0-1） */
  sfxVolume: number;

  /** 是否启用震动 */
  vibration: boolean;

  /** 语言（预留） */
  language: string;

  /** 数据版本 */
  version: number;
}

/** 默认设置 */
const DEFAULT_SETTINGS: SettingsData = {
  bgmVolume: 0.8,
  sfxVolume: 1.0,
  vibration: true,
  language: 'zh-CN',
  version: 1,
};

/** 设置变更事件类型 */
export type SettingsChangeEvent = {
  key: keyof SettingsData;
  oldValue: unknown;
  newValue: unknown;
};

/**
 * 设置管理器
 */
export class SettingsManager {
  private static _instance: SettingsManager | null = null;

  /** 设置数据 */
  private _data: SettingsData;

  /** 是否已初始化 */
  private _initialized: boolean = false;

  /** 变更监听器 */
  private _listeners: Set<(event: SettingsChangeEvent) => void> = new Set();

  /** 全局监听器 */
  private _globalListeners: Set<(data: SettingsData) => void> = new Set();

  private constructor() {
    this._data = { ...DEFAULT_SETTINGS };
  }

  /**
   * 获取单例实例
   */
  static get instance(): SettingsManager {
    if (!SettingsManager._instance) {
      SettingsManager._instance = new SettingsManager();
    }
    return SettingsManager._instance;
  }

  /**
   * 初始化，从存储加载数据
   */
  async init(): Promise<void> {
    if (this._initialized) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SettingsData;
        this._data = this._migrateData(parsed);
      }
    } catch (error) {
      console.error('[SettingsManager] 加载设置失败:', error);
      this._data = { ...DEFAULT_SETTINGS };
    }

    this._initialized = true;
    console.log('[SettingsManager] 初始化完成:', this._data);

    // 应用初始设置
    this._applySettings();
  }

  /**
   * 数据迁移
   */
  private _migrateData(data: Partial<SettingsData>): SettingsData {
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      version: 1,
    };
  }

  /**
   * 保存到本地存储
   */
  private _save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch (error) {
      console.error('[SettingsManager] 保存设置失败:', error);
    }
  }

  /**
   * 应用设置到游戏系统
   */
  private _applySettings(): void {
    // 这里可以与 AudioManager 等系统集成
    // 目前仅记录日志
    console.log('[SettingsManager] 应用设置:', this._data);
  }

  /**
   * 通知监听器
   */
  private _notifyChange(key: keyof SettingsData, oldValue: unknown, newValue: unknown): void {
    const event: SettingsChangeEvent = { key, oldValue, newValue };

    this._listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[SettingsManager] 监听器执行错误:', error);
      }
    });

    this._globalListeners.forEach((listener) => {
      try {
        listener(this._data);
      } catch (error) {
        console.error('[SettingsManager] 全局监听器执行错误:', error);
      }
    });
  }

  /**
   * 添加变更监听器（监听单个设置项变更）
   */
  addChangeListener(listener: (event: SettingsChangeEvent) => void): void {
    this._listeners.add(listener);
  }

  /**
   * 移除变更监听器
   */
  removeChangeListener(listener: (event: SettingsChangeEvent) => void): void {
    this._listeners.delete(listener);
  }

  /**
   * 添加全局监听器（监听任何设置变更）
   */
  addGlobalListener(listener: (data: SettingsData) => void): void {
    this._globalListeners.add(listener);
  }

  /**
   * 移除全局监听器
   */
  removeGlobalListener(listener: (data: SettingsData) => void): void {
    this._globalListeners.delete(listener);
  }

  // ==================== 读取接口 ====================

  /**
   * 获取背景音乐音量
   */
  get bgmVolume(): number {
    return this._data.bgmVolume;
  }

  /**
   * 获取音效音量
   */
  get sfxVolume(): number {
    return this._data.sfxVolume;
  }

  /**
   * 获取震动开关状态
   */
  get vibration(): boolean {
    return this._data.vibration;
  }

  /**
   * 获取语言设置
   */
  get language(): string {
    return this._data.language;
  }

  /**
   * 获取完整设置数据（只读副本）
   */
  getData(): Readonly<SettingsData> {
    return { ...this._data };
  }

  // ==================== 写入接口 ====================

  /**
   * 设置背景音乐音量
   */
  setBgmVolume(volume: number): void {
    volume = Math.max(0, Math.min(1, volume));
    if (this._data.bgmVolume === volume) return;

    const oldValue = this._data.bgmVolume;
    this._data.bgmVolume = volume;
    this._save();
    this._notifyChange('bgmVolume', oldValue, volume);
  }

  /**
   * 设置音效音量
   */
  setSfxVolume(volume: number): void {
    volume = Math.max(0, Math.min(1, volume));
    if (this._data.sfxVolume === volume) return;

    const oldValue = this._data.sfxVolume;
    this._data.sfxVolume = volume;
    this._save();
    this._notifyChange('sfxVolume', oldValue, volume);
  }

  /**
   * 设置震动开关
   */
  setVibration(enabled: boolean): void {
    if (this._data.vibration === enabled) return;

    const oldValue = this._data.vibration;
    this._data.vibration = enabled;
    this._save();
    this._notifyChange('vibration', oldValue, enabled);

    // 开启时触发一次震动反馈
    if (enabled) {
      this._triggerVibration();
    }
  }

  /**
   * 设置语言（预留）
   */
  setLanguage(lang: string): void {
    if (this._data.language === lang) return;

    const oldValue = this._data.language;
    this._data.language = lang;
    this._save();
    this._notifyChange('language', oldValue, lang);
  }

  /**
   * 触发震动
   */
  private _triggerVibration(): void {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      // 忽略震动错误
    }
  }

  /**
   * 重置为默认设置
   */
  resetToDefault(): void {
    const oldData = { ...this._data };
    this._data = { ...DEFAULT_SETTINGS };
    this._save();

    // 通知所有变更
    (Object.keys(DEFAULT_SETTINGS) as Array<keyof SettingsData>).forEach((key) => {
      if (oldData[key] !== this._data[key]) {
        this._notifyChange(key, oldData[key], this._data[key]);
      }
    });

    console.log('[SettingsManager] 设置已重置为默认值');
  }
}

/** 便捷访问 */
export const settingsManager = SettingsManager.instance;

export default SettingsManager;
