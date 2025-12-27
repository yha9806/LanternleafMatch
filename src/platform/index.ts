// ============================================
// 平台适配层 - 统一导出
// ============================================

export * from './types';
export { WeixinAdapter } from './WeixinAdapter';
export { DouyinAdapter } from './DouyinAdapter';

import type { IPlatformAdapter, PlatformType } from './types';
import { WeixinAdapter } from './WeixinAdapter';
import { DouyinAdapter } from './DouyinAdapter';

/**
 * 平台配置
 */
export interface PlatformConfig {
  weixin?: {
    rewardedAdUnitId: string;
  };
  douyin?: {
    rewardedAdUnitId: string;
  };
}

/**
 * 检测当前平台
 */
export function detectPlatform(): PlatformType {
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
    return 'weixin';
  }
  if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
    return 'douyin';
  }
  return 'web';
}

/**
 * 创建平台适配器
 */
export function createPlatformAdapter(config: PlatformConfig): IPlatformAdapter | null {
  const platform = detectPlatform();

  switch (platform) {
    case 'weixin':
      if (!config.weixin) {
        console.warn('Missing weixin config');
        return null;
      }
      return new WeixinAdapter(config.weixin);

    case 'douyin':
      if (!config.douyin) {
        console.warn('Missing douyin config');
        return null;
      }
      return new DouyinAdapter(config.douyin);

    case 'web':
      console.log('Running in web mode, platform features disabled');
      return null;
  }
}

// 声明全局变量（用于平台检测）
declare const wx: any;
declare const tt: any;
