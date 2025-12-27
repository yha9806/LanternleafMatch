// ============================================
// 微信小游戏适配器
// 文档: https://developers.weixin.qq.com/minigame/dev/guide/
// ============================================

import type {
  IPlatformAdapter, IStorage, IRewardedAd, IShare, ILogin,
  SystemInfo, UserInfo, ShareOptions, RewardedAdState, AdError
} from './types';

// 微信小游戏全局对象类型声明
declare const wx: any;

/**
 * 微信小游戏存储适配
 */
class WeixinStorage implements IStorage {
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      try {
        const value = wx.getStorageSync(key);
        resolve(value !== '' ? value : null);
      } catch {
        resolve(null);
      }
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.setStorage({
        key,
        data: value,
        success: () => resolve(),
        fail: (err: any) => reject(err),
      });
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      wx.removeStorage({ key, success: () => resolve(), fail: () => resolve() });
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      wx.clearStorage({ success: () => resolve(), fail: () => resolve() });
    });
  }
}

/**
 * 微信激励视频广告适配
 */
class WeixinRewardedAd implements IRewardedAd {
  private adUnitId: string;
  private ad: any = null;
  private stateCallback: ((state: RewardedAdState, error?: AdError) => void) | null = null;

  constructor(adUnitId: string) {
    this.adUnitId = adUnitId;
    this.init();
  }

  private init(): void {
    if (typeof wx === 'undefined' || !wx.createRewardedVideoAd) return;

    this.ad = wx.createRewardedVideoAd({ adUnitId: this.adUnitId });

    this.ad.onLoad(() => {
      this.stateCallback?.('ready');
    });

    this.ad.onError((err: any) => {
      this.stateCallback?.('error', { errCode: err.errCode, errMsg: err.errMsg });
    });

    this.ad.onClose((res: { isEnded: boolean }) => {
      if (res.isEnded) {
        this.stateCallback?.('rewarded');
      } else {
        this.stateCallback?.('closed');
      }
      // 关闭后预加载下一个
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
    // 微信广告不需要显式销毁
    this.stateCallback = null;
  }
}

/**
 * 微信分享适配
 */
class WeixinShare implements IShare {
  showMenu(): void {
    wx.showShareMenu?.({ withShareTicket: true });
  }

  async share(options: ShareOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.shareAppMessage?.({
        title: options.title,
        imageUrl: options.imageUrl,
        query: options.query,
        success: () => resolve(),
        fail: (err: any) => reject(err),
      });
      // 微信 shareAppMessage 没有回调，直接 resolve
      resolve();
    });
  }

  onShareAppMessage(callback: () => ShareOptions): void {
    wx.onShareAppMessage?.(callback);
  }
}

/**
 * 微信登录适配
 */
class WeixinLogin implements ILogin {
  async login(): Promise<{ code: string }> {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res: { code: string }) => resolve({ code: res.code }),
        fail: (err: any) => reject(err),
      });
    });
  }

  async getUserInfo(): Promise<UserInfo | null> {
    // 微信小游戏需要用户授权才能获取用户信息
    // 这里返回基础信息，实际需要通过 wx.getUserInfo 获取
    return new Promise((resolve) => {
      // 获取 openId 需要后端配合，这里返回模拟值
      resolve({
        openId: 'wx_' + Date.now().toString(36),
      });
    });
  }

  async checkSession(): Promise<boolean> {
    return new Promise((resolve) => {
      wx.checkSession({
        success: () => resolve(true),
        fail: () => resolve(false),
      });
    });
  }
}

/**
 * 微信小游戏平台适配器
 */
export class WeixinAdapter implements IPlatformAdapter {
  readonly type = 'weixin' as const;
  readonly storage: IStorage;
  readonly rewardedAd: IRewardedAd;
  readonly share: IShare;
  readonly login: ILogin;

  private systemInfo: SystemInfo | null = null;

  constructor(config: { rewardedAdUnitId: string }) {
    this.storage = new WeixinStorage();
    this.rewardedAd = new WeixinRewardedAd(config.rewardedAdUnitId);
    this.share = new WeixinShare();
    this.login = new WeixinLogin();
  }

  getSystemInfo(): SystemInfo {
    if (this.systemInfo) return this.systemInfo;

    const info = wx.getSystemInfoSync();
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
        wx.vibrateShort?.({ type: 'light' });
        break;
      case 'medium':
        wx.vibrateShort?.({ type: 'medium' });
        break;
      case 'heavy':
        wx.vibrateLong?.();
        break;
    }
  }

  showToast(message: string, duration = 1500): void {
    wx.showToast?.({
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
      wx.showModal({
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
