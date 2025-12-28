/**
 * 多页面审查配置
 *
 * 定义需要审查的所有页面及其配置。
 */

import type { PageConfig } from '../config';

const PROJECT_ROOT = '/mnt/i/LanternleafMatch';

/**
 * 审查页面列表
 */
export const REVIEW_PAGES: PageConfig[] = [
  // ==================== 主菜单页面 ====================
  {
    name: 'menu-initial',
    url: `file://${PROJECT_ROOT}/demo/menu.html`,
    viewport: { width: 1080, height: 1920 },
    waitFor: { time: 3 },
    description: '主菜单页面 - 设计分辨率 (1080x1920)',
  },
  {
    name: 'menu-iphone',
    url: `file://${PROJECT_ROOT}/demo/menu.html`,
    viewport: { width: 375, height: 812 },
    waitFor: { time: 3 },
    description: '主菜单页面 - iPhone X (375x812)',
  },
  {
    name: 'menu-android',
    url: `file://${PROJECT_ROOT}/demo/menu.html`,
    viewport: { width: 360, height: 800 },
    waitFor: { time: 3 },
    description: '主菜单页面 - Android 标准 (360x800)',
  },

  // ==================== 关卡选择页面 ====================
  {
    name: 'level-select-initial',
    url: `file://${PROJECT_ROOT}/demo/level-select.html`,
    viewport: { width: 1080, height: 1920 },
    waitFor: { time: 3 },
    description: '关卡选择页面 - 设计分辨率 (1080x1920)',
  },
  {
    name: 'level-select-iphone',
    url: `file://${PROJECT_ROOT}/demo/level-select.html`,
    viewport: { width: 375, height: 812 },
    waitFor: { time: 3 },
    description: '关卡选择页面 - iPhone X (375x812)',
  },
  {
    name: 'level-select-android',
    url: `file://${PROJECT_ROOT}/demo/level-select.html`,
    viewport: { width: 360, height: 800 },
    waitFor: { time: 3 },
    description: '关卡选择页面 - Android 标准 (360x800)',
  },

  // ==================== 设置页面 ====================
  {
    name: 'settings-initial',
    url: `file://${PROJECT_ROOT}/demo/settings.html`,
    viewport: { width: 1080, height: 1920 },
    waitFor: { time: 3 },
    description: '设置页面 - 设计分辨率 (1080x1920)',
  },
  {
    name: 'settings-iphone',
    url: `file://${PROJECT_ROOT}/demo/settings.html`,
    viewport: { width: 375, height: 812 },
    waitFor: { time: 3 },
    description: '设置页面 - iPhone X (375x812)',
  },
  {
    name: 'settings-android',
    url: `file://${PROJECT_ROOT}/demo/settings.html`,
    viewport: { width: 360, height: 800 },
    waitFor: { time: 3 },
    description: '设置页面 - Android 标准 (360x800)',
  },

  // ==================== 游戏页面 (Demo) ====================
  {
    name: 'demo-initial',
    url: `file://${PROJECT_ROOT}/demo/index.html`,
    viewport: { width: 1080, height: 1920 },
    waitFor: { time: 3 },
    description: 'Demo 页面 - 设计分辨率 (1080x1920)',
  },
  {
    name: 'demo-iphone',
    url: `file://${PROJECT_ROOT}/demo/index.html`,
    viewport: { width: 375, height: 812 },
    waitFor: { time: 3 },
    description: 'Demo 页面 - iPhone X (375x812)',
  },
  {
    name: 'demo-android',
    url: `file://${PROJECT_ROOT}/demo/index.html`,
    viewport: { width: 360, height: 800 },
    waitFor: { time: 3 },
    description: 'Demo 页面 - Android 标准 (360x800)',
  },
  {
    name: 'demo-tablet',
    url: `file://${PROJECT_ROOT}/demo/index.html`,
    viewport: { width: 768, height: 1024 },
    waitFor: { time: 3 },
    description: 'Demo 页面 - iPad (768x1024)',
  },
  {
    name: 'demo-tablet-large',
    url: `file://${PROJECT_ROOT}/demo/index.html`,
    viewport: { width: 1024, height: 1366 },
    waitFor: { time: 3 },
    description: 'Demo 页面 - iPad Pro (1024x1366)',
  },
];

/**
 * 获取页面配置
 */
export function getPageConfig(name: string): PageConfig | undefined {
  return REVIEW_PAGES.find(p => p.name === name);
}

/**
 * 获取所有页面名称
 */
export function getAllPageNames(): string[] {
  return REVIEW_PAGES.map(p => p.name);
}

export default REVIEW_PAGES;
