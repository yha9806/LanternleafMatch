import { sys } from 'cc';
import type { IPlatformAdapter, RewardedAdState, AdError } from './types';

/**
 * 平台桥接层
 * 在 Cocos Creator 中统一调用小程序 API
 */
export class PlatformBridge {
  private static instance: PlatformBridge;
  private adapter: IPlatformAdapter | null = null;
  private adStateCallback: ((state: RewardedAdState, error?: AdError) => void) | null = null;

  private constructor() {
    this.detectAndInit();
  }

  static getInstance(): PlatformBridge {
    if (!PlatformBridge.instance) {
      PlatformBridge.instance = new PlatformBridge();
    }
    return PlatformBridge.instance;
  }

  // ============================================
  // 平台检测与初始化
  // ============================================

  private detectAndInit() {
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      this.initWeixin();
    } else if (sys.platform === sys.Platform.BYTEDANCE_MINI_GAME) {
      this.initDouyin();
    } else {
      console.log('[PlatformBridge] Running in non-minigame environment');
    }
  }

  private initWeixin() {
    console.log('[PlatformBridge] Initializing Weixin adapter');
    // 实际使用时从配置读取 adUnitId
    // 这里需要动态 import 或直接使用 wx 全局对象
  }

  private initDouyin() {
    console.log('[PlatformBridge] Initializing Douyin adapter');
  }

  // ============================================
  // 存储
  // ============================================

  async getStorage<T>(key: string): Promise<T | null> {
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      return new Promise((resolve) => {
        try {
          const value = (window as any).wx.getStorageSync(key);
          resolve(value !== '' ? value : null);
        } catch {
          resolve(null);
        }
      });
    }
    if (sys.platform === sys.Platform.BYTEDANCE_MINI_GAME) {
      return new Promise((resolve) => {
        try {
          const value = (window as any).tt.getStorageSync(key);
          resolve(value !== '' ? value : null);
        } catch {
          resolve(null);
        }
      });
    }
    // Web fallback
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  async setStorage<T>(key: string, value: T): Promise<void> {
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      return new Promise((resolve, reject) => {
        (window as any).wx.setStorage({
          key,
          data: value,
          success: () => resolve(),
          fail: (err: any) => reject(err),
        });
      });
    }
    if (sys.platform === sys.Platform.BYTEDANCE_MINI_GAME) {
      return new Promise((resolve, reject) => {
        (window as any).tt.setStorage({
          key,
          data: value,
          success: () => resolve(),
          fail: (err: any) => reject(err),
        });
      });
    }
    // Web fallback
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ============================================
  // 激励视频广告
  // ============================================

  private rewardedAd: any = null;

  createRewardedAd(adUnitId: string) {
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      const wx = (window as any).wx;
      if (wx.createRewardedVideoAd) {
        this.rewardedAd = wx.createRewardedVideoAd({ adUnitId });
        this.setupAdCallbacks();
      }
    } else if (sys.platform === sys.Platform.BYTEDANCE_MINI_GAME) {
      const tt = (window as any).tt;
      if (tt.createRewardedVideoAd) {
        this.rewardedAd = tt.createRewardedVideoAd({ adUnitId });
        this.setupAdCallbacks();
      }
    }
  }

  private setupAdCallbacks() {
    if (!this.rewardedAd) return;

    this.rewardedAd.onLoad(() => {
      this.adStateCallback?.('ready');
    });

    this.rewardedAd.onError((err: any) => {
      this.adStateCallback?.('error', { errCode: err.errCode || -1, errMsg: err.errMsg });
    });

    this.rewardedAd.onClose((res: { isEnded: boolean }) => {
      if (res.isEnded) {
        this.adStateCallback?.('rewarded');
      } else {
        this.adStateCallback?.('closed');
      }
    });
  }

  onAdStateChange(callback: (state: RewardedAdState, error?: AdError) => void) {
    this.adStateCallback = callback;
  }

  async loadRewardedAd(): Promise<void> {
    if (!this.rewardedAd) {
      throw new Error('RewardedAd not initialized');
    }
    this.adStateCallback?.('loading');
    return this.rewardedAd.load();
  }

  async showRewardedAd(): Promise<boolean> {
    if (!this.rewardedAd) {
      console.warn('[PlatformBridge] RewardedAd not available');
      return false;
    }

    this.adStateCallback?.('showing');

    return new Promise((resolve) => {
      const handler = (res: { isEnded: boolean }) => {
        this.rewardedAd.offClose(handler);
        resolve(res.isEnded);
      };
      this.rewardedAd.onClose(handler);

      this.rewardedAd.show().catch((err: any) => {
        console.error('[PlatformBridge] Ad show error:', err);
        this.rewardedAd.offClose(handler);
        // 尝试重新加载后再显示
        this.rewardedAd.load().then(() => {
          this.rewardedAd.show().catch(() => resolve(false));
        }).catch(() => resolve(false));
      });
    });
  }

  // ============================================
  // 分享
  // ============================================

  showShareMenu() {
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      (window as any).wx.showShareMenu?.({ withShareTicket: true });
    }
  }

  share(title: string, imageUrl?: string, query?: string) {
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      (window as any).wx.shareAppMessage?.({ title, imageUrl, query });
    } else if (sys.platform === sys.Platform.BYTEDANCE_MINI_GAME) {
      (window as any).tt.shareAppMessage?.({ title, imageUrl, query });
    }
  }

  // ============================================
  // 震动
  // ============================================

  vibrate(type: 'light' | 'medium' | 'heavy') {
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      const wx = (window as any).wx;
      if (type === 'heavy') {
        wx.vibrateLong?.();
      } else {
        wx.vibrateShort?.({ type });
      }
    } else if (sys.platform === sys.Platform.BYTEDANCE_MINI_GAME) {
      const tt = (window as any).tt;
      if (type === 'heavy') {
        tt.vibrateLong?.();
      } else {
        tt.vibrateShort?.();
      }
    }
  }

  // ============================================
  // 系统信息
  // ============================================

  getSystemInfo(): any {
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      return (window as any).wx.getSystemInfoSync();
    }
    if (sys.platform === sys.Platform.BYTEDANCE_MINI_GAME) {
      return (window as any).tt.getSystemInfoSync();
    }
    return {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      platform: 'web',
    };
  }

  // ============================================
  // 平台判断
  // ============================================

  isWechat(): boolean {
    return sys.platform === sys.Platform.WECHAT_GAME;
  }

  isDouyin(): boolean {
    return sys.platform === sys.Platform.BYTEDANCE_MINI_GAME;
  }

  isMiniGame(): boolean {
    return this.isWechat() || this.isDouyin();
  }
}

// 导出单例
export const platformBridge = PlatformBridge.getInstance();
