// ============================================
// 小程序平台适配层 - 类型定义
// 支持：微信小游戏、抖音小游戏
// ============================================

/**
 * 平台类型
 */
export type PlatformType = 'weixin' | 'douyin' | 'web';

/**
 * 系统信息
 */
export interface SystemInfo {
  platform: 'ios' | 'android' | 'windows' | 'mac' | 'devtools';
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  pixelRatio: number;
  language: string;
  version: string;       // 客户端版本
  SDKVersion: string;    // SDK 版本
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
}

/**
 * 用户信息
 */
export interface UserInfo {
  openId: string;        // 平台唯一标识（脱敏）
  unionId?: string;      // 跨应用标识
  nickName?: string;
  avatarUrl?: string;
}

/**
 * 激励视频广告状态
 */
export type RewardedAdState =
  | 'loading'      // 加载中
  | 'ready'        // 可播放
  | 'showing'      // 播放中
  | 'closed'       // 用户关闭（未看完）
  | 'rewarded'     // 播放完成，可发奖励
  | 'error';       // 出错

/**
 * 广告错误
 */
export interface AdError {
  errCode: number;
  errMsg: string;
}

/**
 * 存储 API
 */
export interface IStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * 激励视频广告 API
 */
export interface IRewardedAd {
  load(): Promise<void>;
  show(): Promise<boolean>;  // true = 用户看完，可发奖励
  onStateChange(callback: (state: RewardedAdState, error?: AdError) => void): void;
  destroy(): void;
}

/**
 * 分享 API
 */
export interface IShare {
  showMenu(): void;
  share(options: ShareOptions): Promise<void>;
  onShareAppMessage(callback: () => ShareOptions): void;
}

export interface ShareOptions {
  title: string;
  imageUrl?: string;
  query?: string;
}

/**
 * 登录 API
 */
export interface ILogin {
  login(): Promise<{ code: string }>;
  getUserInfo(): Promise<UserInfo | null>;
  checkSession(): Promise<boolean>;
}

/**
 * 平台适配器接口
 */
export interface IPlatformAdapter {
  readonly type: PlatformType;
  readonly storage: IStorage;
  readonly rewardedAd: IRewardedAd;
  readonly share: IShare;
  readonly login: ILogin;

  getSystemInfo(): SystemInfo;
  vibrate(type: 'light' | 'medium' | 'heavy'): void;
  showToast(message: string, duration?: number): void;
  showModal(options: {
    title: string;
    content: string;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean>;
}
