import { _decorator, Component, Node, Label, Button, Toggle, sys } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 用户同意状态
 */
export interface ConsentStatus {
  // 是否已显示过同意弹窗
  prompted: boolean;

  // 各类同意状态
  analytics: boolean;           // 分析数据
  personalizedAds: boolean;     // 个性化广告
  thirdPartySharing: boolean;   // 第三方数据共享

  // 元数据
  consentDate: string | null;   // 同意日期
  consentVersion: string;       // 同意版本（隐私政策版本）
  region: string | null;        // 用户地区
}

/**
 * 同意弹窗选项
 */
export interface ConsentOptions {
  showAnalytics: boolean;
  showPersonalizedAds: boolean;
  showThirdParty: boolean;
  privacyPolicyUrl: string;
  termsUrl: string;
}

/**
 * 默认同意状态
 */
const DEFAULT_CONSENT: ConsentStatus = {
  prompted: false,
  analytics: false,
  personalizedAds: false,
  thirdPartySharing: false,
  consentDate: null,
  consentVersion: '1.0',
  region: null,
};

/**
 * 当前隐私政策版本
 */
const CURRENT_PRIVACY_VERSION = '1.0';

/**
 * ConsentManager - GDPR/UK 广告合规管理
 * 处理用户数据收集同意
 */
@ccclass('ConsentManager')
export class ConsentManager extends Component {
  private static _instance: ConsentManager | null = null;

  // ============================================
  // UI 引用
  // ============================================

  @property(Node)
  consentModal: Node = null!;

  @property(Node)
  settingsModal: Node = null!;

  @property(Toggle)
  analyticsToggle: Toggle = null!;

  @property(Toggle)
  personalizedAdsToggle: Toggle = null!;

  @property(Toggle)
  thirdPartyToggle: Toggle = null!;

  @property(Button)
  acceptAllButton: Button = null!;

  @property(Button)
  rejectAllButton: Button = null!;

  @property(Button)
  customizeButton: Button = null!;

  @property(Button)
  saveButton: Button = null!;

  @property(Label)
  privacyLinkLabel: Label = null!;

  // ============================================
  // 配置
  // ============================================

  @property
  privacyPolicyUrl: string = 'https://example.com/privacy';

  @property
  termsUrl: string = 'https://example.com/terms';

  // ============================================
  // 状态
  // ============================================

  private consent: ConsentStatus = { ...DEFAULT_CONSENT };
  private resolveCallback: ((status: ConsentStatus) => void) | null = null;
  private consentListeners: Array<(status: ConsentStatus) => void> = [];

  // ============================================
  // 单例
  // ============================================

  static getInstance(): ConsentManager | null {
    return ConsentManager._instance;
  }

  onLoad() {
    if (ConsentManager._instance && ConsentManager._instance !== this) {
      this.destroy();
      return;
    }
    ConsentManager._instance = this;

    this.loadConsent();
    this.setupButtons();
    this.hideModals();
  }

  onDestroy() {
    if (ConsentManager._instance === this) {
      ConsentManager._instance = null;
    }
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 检查是否需要显示同意弹窗
   */
  needsConsent(): boolean {
    // 未显示过
    if (!this.consent.prompted) {
      return true;
    }

    // 隐私政策版本更新
    if (this.consent.consentVersion !== CURRENT_PRIVACY_VERSION) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否在需要同意的地区 (UK/EU)
   */
  async isConsentRequired(): Promise<boolean> {
    const region = await this.detectRegion();

    // UK/EU 国家代码
    const gdprRegions = [
      'GB', // 英国
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', // EU
      'IS', 'LI', 'NO', // EEA
    ];

    return gdprRegions.includes(region);
  }

  /**
   * 显示同意弹窗
   */
  showConsentPrompt(): Promise<ConsentStatus> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;

      if (this.consentModal) {
        this.consentModal.active = true;
      }
    });
  }

  /**
   * 显示隐私设置
   */
  showSettings(): Promise<ConsentStatus> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;

      // 更新 Toggle 状态
      if (this.analyticsToggle) {
        this.analyticsToggle.isChecked = this.consent.analytics;
      }
      if (this.personalizedAdsToggle) {
        this.personalizedAdsToggle.isChecked = this.consent.personalizedAds;
      }
      if (this.thirdPartyToggle) {
        this.thirdPartyToggle.isChecked = this.consent.thirdPartySharing;
      }

      if (this.settingsModal) {
        this.settingsModal.active = true;
      }
    });
  }

  /**
   * 获取当前同意状态
   */
  getConsentStatus(): ConsentStatus {
    return { ...this.consent };
  }

  /**
   * 检查是否同意特定类型
   */
  hasConsent(type: 'analytics' | 'personalizedAds' | 'thirdPartySharing'): boolean {
    return this.consent[type];
  }

  /**
   * 检查是否可以展示个性化广告
   */
  canShowPersonalizedAds(): boolean {
    return this.consent.personalizedAds;
  }

  /**
   * 检查是否可以收集分析数据
   */
  canCollectAnalytics(): boolean {
    return this.consent.analytics;
  }

  /**
   * 监听同意状态变化
   */
  onConsentChange(listener: (status: ConsentStatus) => void): () => void {
    this.consentListeners.push(listener);
    return () => {
      const index = this.consentListeners.indexOf(listener);
      if (index >= 0) {
        this.consentListeners.splice(index, 1);
      }
    };
  }

  /**
   * 撤销所有同意
   */
  revokeAllConsent() {
    this.consent = {
      ...DEFAULT_CONSENT,
      prompted: true,
      consentDate: new Date().toISOString(),
      consentVersion: CURRENT_PRIVACY_VERSION,
      region: this.consent.region,
    };

    this.saveConsent();
    this.notifyListeners();
  }

  // ============================================
  // 内部方法
  // ============================================

  private setupButtons() {
    if (this.acceptAllButton) {
      this.acceptAllButton.node.on('click', this.onAcceptAll, this);
    }
    if (this.rejectAllButton) {
      this.rejectAllButton.node.on('click', this.onRejectAll, this);
    }
    if (this.customizeButton) {
      this.customizeButton.node.on('click', this.onCustomize, this);
    }
    if (this.saveButton) {
      this.saveButton.node.on('click', this.onSaveSettings, this);
    }
  }

  private hideModals() {
    if (this.consentModal) {
      this.consentModal.active = false;
    }
    if (this.settingsModal) {
      this.settingsModal.active = false;
    }
  }

  private onAcceptAll() {
    this.consent = {
      prompted: true,
      analytics: true,
      personalizedAds: true,
      thirdPartySharing: true,
      consentDate: new Date().toISOString(),
      consentVersion: CURRENT_PRIVACY_VERSION,
      region: this.consent.region,
    };

    this.saveAndClose();
  }

  private onRejectAll() {
    this.consent = {
      prompted: true,
      analytics: false,
      personalizedAds: false,
      thirdPartySharing: false,
      consentDate: new Date().toISOString(),
      consentVersion: CURRENT_PRIVACY_VERSION,
      region: this.consent.region,
    };

    this.saveAndClose();
  }

  private onCustomize() {
    // 隐藏主弹窗，显示设置
    if (this.consentModal) {
      this.consentModal.active = false;
    }
    if (this.settingsModal) {
      this.settingsModal.active = true;
    }
  }

  private onSaveSettings() {
    // 从 Toggle 读取值
    this.consent = {
      prompted: true,
      analytics: this.analyticsToggle?.isChecked ?? false,
      personalizedAds: this.personalizedAdsToggle?.isChecked ?? false,
      thirdPartySharing: this.thirdPartyToggle?.isChecked ?? false,
      consentDate: new Date().toISOString(),
      consentVersion: CURRENT_PRIVACY_VERSION,
      region: this.consent.region,
    };

    this.saveAndClose();
  }

  private saveAndClose() {
    this.saveConsent();
    this.notifyListeners();
    this.hideModals();

    if (this.resolveCallback) {
      this.resolveCallback(this.consent);
      this.resolveCallback = null;
    }
  }

  private notifyListeners() {
    for (const listener of this.consentListeners) {
      listener(this.consent);
    }
  }

  // ============================================
  // 持久化
  // ============================================

  private loadConsent() {
    try {
      const data = localStorage.getItem('lanternleaf_consent');
      if (data) {
        this.consent = { ...DEFAULT_CONSENT, ...JSON.parse(data) };
      }
    } catch {
      this.consent = { ...DEFAULT_CONSENT };
    }
  }

  private saveConsent() {
    try {
      localStorage.setItem('lanternleaf_consent', JSON.stringify(this.consent));
    } catch {
      console.warn('[ConsentManager] Failed to save consent');
    }
  }

  // ============================================
  // 地区检测
  // ============================================

  private async detectRegion(): Promise<string> {
    // 如果已缓存
    if (this.consent.region) {
      return this.consent.region;
    }

    // 尝试从系统语言推断
    const language = sys.language || navigator.language || '';
    const region = this.regionFromLanguage(language);

    if (region) {
      this.consent.region = region;
      return region;
    }

    // 可以使用 IP 地理定位 API（需要后端支持）
    // 暂时默认返回 UK 以确保合规
    return 'GB';
  }

  private regionFromLanguage(language: string): string | null {
    // 简单映射
    const langToRegion: Record<string, string> = {
      'en-GB': 'GB',
      'en-UK': 'GB',
      'de': 'DE',
      'de-DE': 'DE',
      'fr': 'FR',
      'fr-FR': 'FR',
      'es': 'ES',
      'es-ES': 'ES',
      'it': 'IT',
      'it-IT': 'IT',
      'nl': 'NL',
      'nl-NL': 'NL',
      'pl': 'PL',
      'pl-PL': 'PL',
    };

    return langToRegion[language] || langToRegion[language.split('-')[0]] || null;
  }
}

// ============================================
// 便捷函数
// ============================================

export function getConsentManager(): ConsentManager | null {
  return ConsentManager.getInstance();
}

/**
 * 初始化时检查并显示同意弹窗
 */
export async function checkAndPromptConsent(): Promise<ConsentStatus | null> {
  const manager = getConsentManager();
  if (!manager) return null;

  const required = await manager.isConsentRequired();
  if (!required) {
    // 非 GDPR 地区，默认同意
    return manager.getConsentStatus();
  }

  if (manager.needsConsent()) {
    return manager.showConsentPrompt();
  }

  return manager.getConsentStatus();
}
