import { _decorator, Component, director, sys } from 'cc';
import type { IRewardedAd, RewardedAdState, AdError, PlatformType } from '../platform/types';

const { ccclass, property } = _decorator;

/**
 * 广告展示位置（用于分析和配置）
 */
export type AdPlacement =
  | 'energy_refill'       // 体力补充
  | 'extra_moves'         // 额外步数
  | 'booster_reward'      // 道具奖励
  | 'daily_double'        // 每日奖励翻倍
  | 'revive'              // 复活继续
  | 'hint_unlock';        // 解锁提示

/**
 * 广告奖励配置
 */
export interface AdRewardConfig {
  placement: AdPlacement;
  rewardType: 'energy' | 'moves' | 'booster' | 'coins';
  rewardAmount: number;
  cooldownMs?: number;  // 该位置冷却时间
}

/**
 * 广告展示结果
 */
export interface AdShowResult {
  success: boolean;
  rewarded: boolean;
  error?: AdError;
  placement: AdPlacement;
  timestamp: number;
}

/**
 * 广告配置
 */
export interface RewardedAdConfig {
  // 平台广告单元ID
  weixinAdUnitId: string;
  douyinAdUnitId: string;

  // 频控
  hourlyCap: number;           // 每小时最大观看次数
  dailyCap: number;            // 每日最大观看次数
  globalCooldownMs: number;    // 全局冷却时间（毫秒）

  // 预加载
  preloadEnabled: boolean;
  preloadRetryCount: number;
  preloadRetryDelayMs: number;

  // 测试模式
  testMode: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: RewardedAdConfig = {
  weixinAdUnitId: '',
  douyinAdUnitId: '',
  hourlyCap: 6,
  dailyCap: 30,
  globalCooldownMs: 30000,  // 30秒全局冷却
  preloadEnabled: true,
  preloadRetryCount: 3,
  preloadRetryDelayMs: 5000,
  testMode: false,
};

/**
 * RewardedAdManager - 激励视频广告管理器
 * 统一处理微信/抖音平台的激励视频广告
 */
@ccclass('RewardedAdManager')
export class RewardedAdManager extends Component {
  private static _instance: RewardedAdManager | null = null;

  // 配置
  private config: RewardedAdConfig = { ...DEFAULT_CONFIG };

  // 广告实例
  private rewardedAd: IRewardedAd | null = null;
  private adState: RewardedAdState = 'loading';

  // 频控状态
  private hourlyWatchCount: number = 0;
  private dailyWatchCount: number = 0;
  private lastWatchTimestamp: number = 0;
  private watchHistory: number[] = [];  // 时间戳数组

  // 位置冷却
  private placementCooldowns: Map<AdPlacement, number> = new Map();

  // 回调
  private pendingCallback: ((result: AdShowResult) => void) | null = null;
  private currentPlacement: AdPlacement | null = null;

  // 平台类型
  private platformType: PlatformType = 'web';

  // 状态监听器
  private stateListeners: Array<(state: RewardedAdState) => void> = [];

  // ============================================
  // 单例模式
  // ============================================

  static getInstance(): RewardedAdManager | null {
    return RewardedAdManager._instance;
  }

  onLoad() {
    if (RewardedAdManager._instance && RewardedAdManager._instance !== this) {
      this.destroy();
      return;
    }
    RewardedAdManager._instance = this;
    director.addPersistRootNode(this.node);

    this.detectPlatform();
    this.loadFrequencyData();
    this.initAd();
  }

  onDestroy() {
    if (RewardedAdManager._instance === this) {
      RewardedAdManager._instance = null;
    }
    this.destroyAd();
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 设置配置
   */
  setConfig(config: Partial<RewardedAdConfig>) {
    this.config = { ...this.config, ...config };
    // 重新初始化广告
    this.destroyAd();
    this.initAd();
  }

  /**
   * 检查广告是否可用
   */
  isAdAvailable(placement?: AdPlacement): boolean {
    // 频控检查
    if (!this.checkFrequencyCap()) {
      return false;
    }

    // 全局冷却检查
    if (!this.checkGlobalCooldown()) {
      return false;
    }

    // 位置冷却检查
    if (placement && !this.checkPlacementCooldown(placement)) {
      return false;
    }

    // 广告状态检查
    return this.adState === 'ready';
  }

  /**
   * 获取剩余观看次数
   */
  getRemainingWatches(): { hourly: number; daily: number } {
    this.updateHourlyCount();
    return {
      hourly: Math.max(0, this.config.hourlyCap - this.hourlyWatchCount),
      daily: Math.max(0, this.config.dailyCap - this.dailyWatchCount),
    };
  }

  /**
   * 获取冷却剩余时间（毫秒）
   */
  getCooldownRemaining(placement?: AdPlacement): number {
    const now = Date.now();

    // 全局冷却
    const globalRemaining = Math.max(0,
      this.lastWatchTimestamp + this.config.globalCooldownMs - now
    );

    // 位置冷却
    if (placement) {
      const placementCooldown = this.placementCooldowns.get(placement) || 0;
      return Math.max(globalRemaining, placementCooldown - now);
    }

    return globalRemaining;
  }

  /**
   * 展示广告
   */
  async show(placement: AdPlacement, rewardConfig?: AdRewardConfig): Promise<AdShowResult> {
    const result: AdShowResult = {
      success: false,
      rewarded: false,
      placement,
      timestamp: Date.now(),
    };

    // 检查可用性
    if (!this.isAdAvailable(placement)) {
      result.error = {
        errCode: -1,
        errMsg: this.getUnavailableReason(placement),
      };
      this.trackAdEvent('ad_unavailable', placement, result.error);
      return result;
    }

    // 测试模式
    if (this.config.testMode) {
      return this.simulateAdShow(placement);
    }

    // 真实展示
    return new Promise((resolve) => {
      this.currentPlacement = placement;
      this.pendingCallback = resolve;

      this.trackAdEvent('ad_show_start', placement);

      if (this.rewardedAd) {
        this.rewardedAd.show().then((rewarded) => {
          this.handleAdResult(rewarded, placement, resolve);
        }).catch((error) => {
          this.handleAdError(error, placement, resolve);
        });
      } else {
        result.error = { errCode: -2, errMsg: '广告未初始化' };
        resolve(result);
      }
    });
  }

  /**
   * 预加载广告
   */
  preload(): Promise<boolean> {
    if (!this.config.preloadEnabled || !this.rewardedAd) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      this.rewardedAd!.load()
        .then(() => {
          this.adState = 'ready';
          resolve(true);
        })
        .catch(() => {
          this.adState = 'error';
          resolve(false);
        });
    });
  }

  /**
   * 监听广告状态变化
   */
  onStateChange(listener: (state: RewardedAdState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index >= 0) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取当前广告状态
   */
  getAdState(): RewardedAdState {
    return this.adState;
  }

  // ============================================
  // 内部方法
  // ============================================

  private detectPlatform() {
    if (typeof wx !== 'undefined') {
      this.platformType = 'weixin';
    } else if (typeof tt !== 'undefined') {
      this.platformType = 'douyin';
    } else {
      this.platformType = 'web';
    }
  }

  private initAd() {
    if (this.platformType === 'web') {
      // Web 环境无广告
      this.adState = 'ready'; // 测试时直接ready
      return;
    }

    const adUnitId = this.platformType === 'weixin'
      ? this.config.weixinAdUnitId
      : this.config.douyinAdUnitId;

    if (!adUnitId) {
      console.warn('[RewardedAdManager] Ad unit ID not configured');
      return;
    }

    try {
      if (this.platformType === 'weixin' && typeof wx !== 'undefined') {
        this.rewardedAd = this.createWeixinAd(adUnitId);
      } else if (this.platformType === 'douyin' && typeof tt !== 'undefined') {
        this.rewardedAd = this.createDouyinAd(adUnitId);
      }

      if (this.rewardedAd && this.config.preloadEnabled) {
        this.preloadWithRetry();
      }
    } catch (error) {
      console.error('[RewardedAdManager] Init failed:', error);
    }
  }

  private createWeixinAd(adUnitId: string): IRewardedAd {
    const ad = (wx as any).createRewardedVideoAd({ adUnitId });

    const wrapper: IRewardedAd = {
      load: () => new Promise((resolve, reject) => {
        ad.load().then(resolve).catch(reject);
      }),
      show: () => new Promise((resolve, reject) => {
        ad.show().then(() => resolve(true)).catch(reject);
      }),
      onStateChange: (callback) => {
        ad.onLoad(() => {
          this.adState = 'ready';
          callback('ready');
        });
        ad.onError((err: AdError) => {
          this.adState = 'error';
          callback('error', err);
        });
        ad.onClose((res: { isEnded: boolean }) => {
          if (res.isEnded) {
            callback('rewarded');
          } else {
            callback('closed');
          }
          // 自动预加载下一个
          this.preloadWithRetry();
        });
      },
      destroy: () => {
        ad.destroy?.();
      },
    };

    wrapper.onStateChange((state, error) => {
      this.adState = state;
      this.notifyStateChange(state);
    });

    return wrapper;
  }

  private createDouyinAd(adUnitId: string): IRewardedAd {
    const ad = (tt as any).createRewardedVideoAd({ adUnitId });

    const wrapper: IRewardedAd = {
      load: () => new Promise((resolve, reject) => {
        ad.load().then(resolve).catch(reject);
      }),
      show: () => new Promise((resolve, reject) => {
        ad.show().then(() => resolve(true)).catch(reject);
      }),
      onStateChange: (callback) => {
        ad.onLoad(() => {
          this.adState = 'ready';
          callback('ready');
        });
        ad.onError((err: AdError) => {
          this.adState = 'error';
          callback('error', err);
        });
        ad.onClose((res: { isEnded: boolean }) => {
          if (res.isEnded) {
            callback('rewarded');
          } else {
            callback('closed');
          }
          this.preloadWithRetry();
        });
      },
      destroy: () => {
        ad.destroy?.();
      },
    };

    wrapper.onStateChange((state, error) => {
      this.adState = state;
      this.notifyStateChange(state);
    });

    return wrapper;
  }

  private destroyAd() {
    if (this.rewardedAd) {
      this.rewardedAd.destroy();
      this.rewardedAd = null;
    }
  }

  private async preloadWithRetry(retryCount: number = 0) {
    if (!this.rewardedAd) return;

    try {
      await this.rewardedAd.load();
      this.adState = 'ready';
    } catch (error) {
      if (retryCount < this.config.preloadRetryCount) {
        setTimeout(() => {
          this.preloadWithRetry(retryCount + 1);
        }, this.config.preloadRetryDelayMs);
      } else {
        this.adState = 'error';
      }
    }
  }

  private handleAdResult(
    rewarded: boolean,
    placement: AdPlacement,
    resolve: (result: AdShowResult) => void
  ) {
    const result: AdShowResult = {
      success: true,
      rewarded,
      placement,
      timestamp: Date.now(),
    };

    if (rewarded) {
      this.recordWatch(placement);
      this.trackAdEvent('ad_rewarded', placement);
    } else {
      this.trackAdEvent('ad_closed_early', placement);
    }

    this.currentPlacement = null;
    this.pendingCallback = null;
    resolve(result);
  }

  private handleAdError(
    error: any,
    placement: AdPlacement,
    resolve: (result: AdShowResult) => void
  ) {
    const result: AdShowResult = {
      success: false,
      rewarded: false,
      placement,
      timestamp: Date.now(),
      error: {
        errCode: error.errCode || -3,
        errMsg: error.errMsg || '广告播放失败',
      },
    };

    this.trackAdEvent('ad_error', placement, result.error);
    this.currentPlacement = null;
    this.pendingCallback = null;
    resolve(result);
  }

  private simulateAdShow(placement: AdPlacement): Promise<AdShowResult> {
    return new Promise((resolve) => {
      console.log(`[RewardedAdManager] 测试模式: 模拟广告展示 (${placement})`);

      this.adState = 'showing';
      this.notifyStateChange('showing');

      // 模拟广告时长
      setTimeout(() => {
        this.recordWatch(placement);
        this.adState = 'ready';
        this.notifyStateChange('rewarded');

        resolve({
          success: true,
          rewarded: true,
          placement,
          timestamp: Date.now(),
        });
      }, 1000); // 测试模式1秒
    });
  }

  // ============================================
  // 频控管理
  // ============================================

  private checkFrequencyCap(): boolean {
    this.updateHourlyCount();
    return this.hourlyWatchCount < this.config.hourlyCap &&
           this.dailyWatchCount < this.config.dailyCap;
  }

  private checkGlobalCooldown(): boolean {
    return Date.now() - this.lastWatchTimestamp >= this.config.globalCooldownMs;
  }

  private checkPlacementCooldown(placement: AdPlacement): boolean {
    const cooldown = this.placementCooldowns.get(placement) || 0;
    return Date.now() >= cooldown;
  }

  private updateHourlyCount() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // 清理一小时前的记录
    this.watchHistory = this.watchHistory.filter(ts => ts > oneHourAgo);
    this.hourlyWatchCount = this.watchHistory.length;
  }

  private recordWatch(placement: AdPlacement) {
    const now = Date.now();

    this.lastWatchTimestamp = now;
    this.watchHistory.push(now);
    this.hourlyWatchCount++;
    this.dailyWatchCount++;

    // 设置位置冷却（如果有配置）
    // 默认30秒位置冷却
    this.placementCooldowns.set(placement, now + 30000);

    this.saveFrequencyData();
  }

  private getUnavailableReason(placement: AdPlacement): string {
    if (!this.checkFrequencyCap()) {
      const remaining = this.getRemainingWatches();
      if (remaining.hourly <= 0) {
        return '本小时观看次数已达上限，请稍后再试';
      }
      if (remaining.daily <= 0) {
        return '今日观看次数已达上限，明天再来吧';
      }
    }

    if (!this.checkGlobalCooldown()) {
      const seconds = Math.ceil(this.getCooldownRemaining() / 1000);
      return `请等待 ${seconds} 秒后再观看`;
    }

    if (!this.checkPlacementCooldown(placement)) {
      const seconds = Math.ceil(this.getCooldownRemaining(placement) / 1000);
      return `请等待 ${seconds} 秒后再观看`;
    }

    if (this.adState !== 'ready') {
      return '广告正在加载中，请稍候...';
    }

    return '广告暂时不可用';
  }

  // ============================================
  // 持久化
  // ============================================

  private loadFrequencyData() {
    try {
      const data = localStorage.getItem('lanternleaf_ad_freq');
      if (data) {
        const parsed = JSON.parse(data);
        const today = new Date().toDateString();

        if (parsed.date === today) {
          this.dailyWatchCount = parsed.dailyCount || 0;
          this.watchHistory = parsed.history || [];
          this.lastWatchTimestamp = parsed.lastWatch || 0;
        } else {
          // 新的一天，重置日计数
          this.dailyWatchCount = 0;
        }
      }
    } catch {
      // 忽略解析错误
    }
  }

  private saveFrequencyData() {
    try {
      const data = {
        date: new Date().toDateString(),
        dailyCount: this.dailyWatchCount,
        history: this.watchHistory,
        lastWatch: this.lastWatchTimestamp,
      };
      localStorage.setItem('lanternleaf_ad_freq', JSON.stringify(data));
    } catch {
      // 忽略存储错误
    }
  }

  // ============================================
  // 事件追踪
  // ============================================

  private trackAdEvent(event: string, placement: AdPlacement, error?: AdError) {
    // 集成到 Analytics 系统
    console.log(`[Ad] ${event}`, { placement, error });

    // 可以调用 AnalyticsManager
    // getAnalyticsManager()?.trackEvent('ad', { event, placement, error });
  }

  private notifyStateChange(state: RewardedAdState) {
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }
}

// 全局声明
declare const wx: any;
declare const tt: any;

// 便捷访问
export function getRewardedAdManager(): RewardedAdManager | null {
  return RewardedAdManager.getInstance();
}
