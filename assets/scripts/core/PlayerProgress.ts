/**
 * 玩家进度管理
 *
 * 管理玩家的关卡进度、星级评价等数据。
 * 支持本地存储持久化。
 */

const STORAGE_KEY = 'lanternleaf_player_progress';

/** 玩家进度数据结构 */
export interface PlayerProgressData {
  /** 当前解锁的最高关卡（1-50） */
  currentLevel: number;

  /** 每关的最佳成绩（星数 0-3），key 为关卡编号 */
  levelStars: Record<number, number>;

  /** 总星数 */
  totalStars: number;

  /** 总通关关卡数 */
  completedLevels: number;

  /** 上次游戏时间戳 */
  lastPlayTime: number;

  /** 金币数量 */
  coins: number;

  /** 宝石数量 */
  gems: number;

  /** 数据版本（用于迁移） */
  version: number;
}

/** 默认进度数据 */
const DEFAULT_PROGRESS: PlayerProgressData = {
  currentLevel: 1,
  levelStars: {},
  totalStars: 0,
  completedLevels: 0,
  lastPlayTime: 0,
  coins: 500,
  gems: 10,
  version: 1,
};

/** 最大关卡数 */
export const MAX_LEVEL = 50;

/** 每关最大星数 */
export const MAX_STARS_PER_LEVEL = 3;

/**
 * 玩家进度管理器
 */
export class PlayerProgress {
  private static _instance: PlayerProgress | null = null;

  /** 进度数据 */
  private _data: PlayerProgressData;

  /** 是否已初始化 */
  private _initialized: boolean = false;

  /** 变更监听器 */
  private _listeners: Set<(data: PlayerProgressData) => void> = new Set();

  private constructor() {
    this._data = { ...DEFAULT_PROGRESS };
  }

  /**
   * 获取单例实例
   */
  static get instance(): PlayerProgress {
    if (!PlayerProgress._instance) {
      PlayerProgress._instance = new PlayerProgress();
    }
    return PlayerProgress._instance;
  }

  /**
   * 初始化，从存储加载数据
   */
  async init(): Promise<void> {
    if (this._initialized) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PlayerProgressData;
        this._data = this._migrateData(parsed);
      }
    } catch (error) {
      console.error('[PlayerProgress] 加载进度失败:', error);
      this._data = { ...DEFAULT_PROGRESS };
    }

    this._initialized = true;
    console.log('[PlayerProgress] 初始化完成:', this._data);
  }

  /**
   * 数据迁移（处理版本升级）
   */
  private _migrateData(data: PlayerProgressData): PlayerProgressData {
    // 当前版本为 1，暂无需迁移
    if (!data.version) {
      data.version = 1;
    }
    return data;
  }

  /**
   * 保存数据到本地存储
   */
  private _save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
      this._notifyListeners();
    } catch (error) {
      console.error('[PlayerProgress] 保存进度失败:', error);
    }
  }

  /**
   * 通知监听器
   */
  private _notifyListeners(): void {
    this._listeners.forEach((listener) => {
      try {
        listener(this._data);
      } catch (error) {
        console.error('[PlayerProgress] 监听器执行错误:', error);
      }
    });
  }

  /**
   * 添加变更监听器
   */
  addListener(listener: (data: PlayerProgressData) => void): void {
    this._listeners.add(listener);
  }

  /**
   * 移除变更监听器
   */
  removeListener(listener: (data: PlayerProgressData) => void): void {
    this._listeners.delete(listener);
  }

  // ==================== 读取接口 ====================

  /**
   * 获取当前关卡
   */
  get currentLevel(): number {
    return this._data.currentLevel;
  }

  /**
   * 获取总星数
   */
  get totalStars(): number {
    return this._data.totalStars;
  }

  /**
   * 获取已通关关卡数
   */
  get completedLevels(): number {
    return this._data.completedLevels;
  }

  /**
   * 获取最大可获得星数
   */
  get maxTotalStars(): number {
    return MAX_LEVEL * MAX_STARS_PER_LEVEL;
  }

  /**
   * 获取进度百分比
   */
  get progressPercent(): number {
    return Math.floor((this._data.completedLevels / MAX_LEVEL) * 100);
  }

  /**
   * 获取指定关卡的星数
   */
  getLevelStars(level: number): number {
    return this._data.levelStars[level] || 0;
  }

  /**
   * 检查关卡是否已解锁
   */
  isLevelUnlocked(level: number): boolean {
    if (level < 1 || level > MAX_LEVEL) return false;
    return level <= this._data.currentLevel;
  }

  /**
   * 检查关卡是否已通关
   */
  isLevelCompleted(level: number): boolean {
    return this._data.levelStars[level] !== undefined && this._data.levelStars[level] > 0;
  }

  /**
   * 获取完整进度数据（只读副本）
   */
  getData(): Readonly<PlayerProgressData> {
    return { ...this._data };
  }

  // ==================== 写入接口 ====================

  /**
   * 记录关卡完成
   * @param level 关卡编号
   * @param stars 获得星数（1-3）
   * @returns 是否创造新纪录
   */
  completeLevel(level: number, stars: number): boolean {
    if (level < 1 || level > MAX_LEVEL) {
      console.warn(`[PlayerProgress] 无效关卡: ${level}`);
      return false;
    }

    stars = Math.max(1, Math.min(MAX_STARS_PER_LEVEL, stars));

    const previousStars = this._data.levelStars[level] || 0;
    const isNewRecord = stars > previousStars;

    // 更新星数（只保留最佳成绩）
    if (isNewRecord) {
      this._data.levelStars[level] = stars;
      this._data.totalStars = this._calculateTotalStars();
    }

    // 更新通关数
    if (previousStars === 0) {
      this._data.completedLevels++;
    }

    // 解锁下一关
    if (level >= this._data.currentLevel && level < MAX_LEVEL) {
      this._data.currentLevel = level + 1;
    }

    // 更新游戏时间
    this._data.lastPlayTime = Date.now();

    this._save();

    console.log(`[PlayerProgress] 完成关卡 ${level}, 星数: ${stars}, 新纪录: ${isNewRecord}`);
    return isNewRecord;
  }

  /**
   * 计算总星数
   */
  private _calculateTotalStars(): number {
    return Object.values(this._data.levelStars).reduce((sum, stars) => sum + stars, 0);
  }

  /**
   * 设置当前关卡（用于调试）
   */
  setCurrentLevel(level: number): void {
    if (level < 1 || level > MAX_LEVEL) return;
    this._data.currentLevel = level;
    this._save();
  }

  /**
   * 重置所有进度
   */
  reset(): void {
    this._data = { ...DEFAULT_PROGRESS };
    this._save();
    console.log('[PlayerProgress] 进度已重置');
  }

  /**
   * 解锁所有关卡（用于调试）
   */
  unlockAll(): void {
    this._data.currentLevel = MAX_LEVEL;
    this._save();
    console.log('[PlayerProgress] 已解锁所有关卡');
  }

  // ==================== 货币接口 ====================

  /**
   * 获取金币数量
   */
  get coins(): number {
    return this._data.coins || 0;
  }

  /**
   * 获取宝石数量
   */
  get gems(): number {
    return this._data.gems || 0;
  }

  /**
   * 添加金币
   */
  addCoins(amount: number): void {
    if (amount <= 0) return;
    this._data.coins = (this._data.coins || 0) + amount;
    this._save();
  }

  /**
   * 添加宝石
   */
  addGems(amount: number): void {
    if (amount <= 0) return;
    this._data.gems = (this._data.gems || 0) + amount;
    this._save();
  }

  /**
   * 消费金币
   * @returns 是否成功消费
   */
  spendCoins(amount: number): boolean {
    if (amount <= 0) return true;
    if ((this._data.coins || 0) < amount) return false;
    this._data.coins -= amount;
    this._save();
    return true;
  }

  /**
   * 消费宝石
   * @returns 是否成功消费
   */
  spendGems(amount: number): boolean {
    if (amount <= 0) return true;
    if ((this._data.gems || 0) < amount) return false;
    this._data.gems -= amount;
    this._save();
    return true;
  }
}

/** 便捷访问 */
export const playerProgress = PlayerProgress.instance;

export default PlayerProgress;
