// ============================================
// 抖音小游戏适配器
// 文档: https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/introduction
// 注意: 抖音 API 与微信基本兼容，主要差异在广告和分享
// ============================================

import type {
  IPlatformAdapter, IStorage, IRewardedAd, IShare, ILogin,
  SystemInfo, UserInfo, ShareOptions, RewardedAdState, AdError
} from './types';

// 抖音小游戏全局对象类型声明
declare const tt: any;

/**
 * 抖音小游戏存储适配
 * API 与微信兼容
 */
class DouyinStorage implements IStorage {
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      try {
        const value = tt.getStorageSync(key);
        resolve(value !== '' ? value : null);
      } catch {
        resolve(null);
      }
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      tt.setStorage({
        key,
        data: value,
        success: () => resolve(),
        fail: (err: any) => reject(err),
      });
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      tt.removeStorage({ key, success: () => resolve(), fail: () => resolve() });
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      tt.clearStorage({ success: () => resolve(), fail: () => resolve() });
    });
  }
}

/**
 * 抖音激励视频广告适配
 * 注意: 抖音广告需要在抖音开放平台配置
 */
class DouyinRewardedAd implements IRewardedAd {
  private adUnitId: string;
  private ad: any = null;
  private stateCallback: ((state: RewardedAdState, error?: AdError) => void) | null = null;

  constructor(adUnitId: string) {
    this.adUnitId = adUnitId;
    this.init();
  }

  private init(): void {
    if (typeof tt === 'undefined' || !tt.createRewardedVideoAd) return;

    this.ad = tt.createRewardedVideoAd({ adUnitId: this.adUnitId });

    this.ad.onLoad(() => {
      this.stateCallback?.('ready');
    });

    this.ad.onError((err: any) => {
      this.stateCallback?.('error', { errCode: err.errCode || -1, errMsg: err.errMsg });
    });

    this.ad.onClose((res: { isEnded: boolean }) => {
      if (res.isEnded) {
        this.stateCallback?.('rewarded');
      } else {
        this.stateCallback?.('closed');
      }
      // 关闭后预加载
      this.load().catch(() => {});
    });
  }

  async load(): Promise<void> {
    if (!this.ad) throw new Error('Ad not initialized');
    this.stateCallback?.('loading');
    return this.ad.load();
  }

  async show(): Promise<boolean> {
    if (!this.ad) throw new Error('Ad not initialized');
    this.stateCallback?.('showing');

    return new Promise((resolve) => {
      const handler = (res: { isEnded: boolean }) => {
        this.ad.offClose(handler);
        resolve(res.isEnded);
      };
      this.ad.onClose(handler);
      this.ad.show().catch(() => {
        this.ad.offClose(handler);
        resolve(false);
      });
    });
  }

  onStateChange(callback: (state: RewardedAdState, error?: AdError) => void): void {
    this.stateCallback = callback;
  }

  destroy(): void {
    this.stateCallback = null;
  }
}

/**
 * 抖音分享适配
 * 抖音分享机制与微信略有不同
 */
class DouyinShare implements IShare {
  showMenu(): void {
    // 抖音默认启用分享
  }

  async share(options: ShareOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      tt.shareAppMessage?.({
        title: options.title,
        imageUrl: options.imageUrl,
        query: options.query,
        success: () => resolve(),
        fail: (err: any) => reject(err),
      });
    });
  }

  onShareAppMessage(callback: () => ShareOptions): void {
    tt.onShareAppMessage?.(callback);
  }
}

/**
 * 抖音登录适配
 */
class DouyinLogin implements ILogin {
  async login(): Promise<{ code: string }> {
    return new Promise((resolve, reject) => {
      tt.login({
        success: (res: { code: string }) => resolve({ code: res.code }),
        fail: (err: any) => reject(err),
      });
    });
  }

  async getUserInfo(): Promise<UserInfo | null> {
    return new Promise((resolve) => {
      resolve({
        openId: 'dy_' + Date.now().toString(36),
      });
    });
  }

  async checkSession(): Promise<boolean> {
    return new Promise((resolve) => {
      tt.checkSession?.({
        success: () => resolve(true),
        fail: () => resolve(false),
      }) || resolve(true);
    });
  }
}

/**
 * 抖音小游戏平台适配器
 */
export class DouyinAdapter implements IPlatformAdapter {
  readonly type = 'douyin' as const;
  readonly storage: IStorage;
  readonly rewardedAd: IRewardedAd;
  readonly share: IShare;
  readonly login: ILogin;

  private systemInfo: SystemInfo | null = null;

  constructor(config: { rewardedAdUnitId: string }) {
    this.storage = new DouyinStorage();
    this.rewardedAd = new DouyinRewardedAd(config.rewardedAdUnitId);
    this.share = new DouyinShare();
    this.login = new DouyinLogin();
  }

  getSystemInfo(): SystemInfo {
    if (this.systemInfo) return this.systemInfo;

    const info = tt.getSystemInfoSync();
    this.systemInfo = {
      platform: info.platform,
      screenWidth: info.screenWidth,
      screenHeight: info.screenHeight,
      windowWidth: info.windowWidth,
      windowHeight: info.windowHeight,
      pixelRatio: info.pixelRatio,
      language: info.language,
      version: info.version,
      SDKVersion: info.SDKVersion,
      safeArea: info.safeArea || {
        top: 0,
        bottom: info.screenHeight,
        left: 0,
        right: info.screenWidth,
        width: info.screenWidth,
        height: info.screenHeight,
      },
    };
    return this.systemInfo;
  }

  vibrate(type: 'light' | 'medium' | 'heavy'): void {
    switch (type) {
      case 'light':
        tt.vibrateShort?.();
        break;
      case 'medium':
        tt.vibrateShort?.();
        break;
      case 'heavy':
        tt.vibrateLong?.();
        break;
    }
  }

  showToast(message: string, duration = 1500): void {
    tt.showToast?.({
      title: message,
      icon: 'none',
      duration,
    });
  }

  async showModal(options: {
    title: string;
    content: string;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      tt.showModal({
        title: options.title,
        content: options.content,
        showCancel: options.showCancel ?? true,
        confirmText: options.confirmText ?? '确定',
        cancelText: options.cancelText ?? '取消',
        success: (res: { confirm: boolean }) => resolve(res.confirm),
        fail: () => resolve(false),
      });
    });
  }
}
