// ============================================
// 数值平衡配置管理器
// 支持热更新、A/B 测试、配置版本管理
// ============================================

import { BALANCE_CONSTANTS } from './BalanceFormulas';
import { DIFFICULTY_PHASES, DifficultyPhase } from './DifficultyEstimator';

// ============================================
// 类型定义
// ============================================

export interface BalanceConfigData {
  version: string;
  lastUpdated: string;

  // 核心数值常量
  constants: typeof BALANCE_CONSTANTS;

  // 难度阶段配置
  phases: DifficultyPhase[];

  // 特殊事件配置
  events: {
    bossLevels: number[];        // Boss 关卡列表
    easyLevels: number[];        // 简单关卡（节日活动）
    hardLevels: number[];        // 困难关卡（挑战活动）
  };

  // A/B 测试配置
  abTests: ABTest[];
}

export interface ABTest {
  testId: string;
  name: string;
  description: string;
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  parameter: string;            // 要测试的参数路径
  variants: ABTestVariant[];
}

export interface ABTestVariant {
  name: string;
  value: any;
  weight: number;               // 分配权重 (0-100)
}

export interface ABTestAssignment {
  testId: string;
  variantName: string;
  value: any;
}

export type ConfigChangeListener = (config: BalanceConfigData) => void;

// ============================================
// 默认配置
// ============================================

const DEFAULT_CONFIG: BalanceConfigData = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  constants: { ...BALANCE_CONSTANTS },
  phases: [...DIFFICULTY_PHASES],
  events: {
    bossLevels: [25, 50, 75, 100],
    easyLevels: [],
    hardLevels: [],
  },
  abTests: [],
};

// ============================================
// BalanceConfigManager 类
// ============================================

export class BalanceConfigManager {
  private config: BalanceConfigData;
  private listeners: Set<ConfigChangeListener> = new Set();
  private playerAssignments: Map<string, ABTestAssignment[]> = new Map();
  private remoteUrl?: string;
  private refreshInterval?: NodeJS.Timeout;

  constructor(initialConfig?: Partial<BalanceConfigData>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...initialConfig,
    };
  }

  // ============================================
  // 配置获取
  // ============================================

  /**
   * 获取当前配置
   */
  getConfig(): BalanceConfigData {
    return this.config;
  }

  /**
   * 获取配置版本
   */
  getVersion(): string {
    return this.config.version;
  }

  /**
   * 获取常量值
   */
  getConstant<K extends keyof typeof BALANCE_CONSTANTS>(key: K): typeof BALANCE_CONSTANTS[K] {
    return this.config.constants[key];
  }

  /**
   * 获取难度阶段
   */
  getPhase(levelIndex: number): DifficultyPhase {
    for (const phase of this.config.phases) {
      if (levelIndex >= phase.levelRange[0] && levelIndex <= phase.levelRange[1]) {
        return phase;
      }
    }
    return this.config.phases[this.config.phases.length - 1];
  }

  /**
   * 检查是否为 Boss 关卡
   */
  isBossLevel(level: number): boolean {
    return this.config.events.bossLevels.includes(level);
  }

  /**
   * 检查是否为简单关卡
   */
  isEasyLevel(level: number): boolean {
    return this.config.events.easyLevels.includes(level);
  }

  /**
   * 检查是否为困难关卡
   */
  isHardLevel(level: number): boolean {
    return this.config.events.hardLevels.includes(level);
  }

  // ============================================
  // 配置更新
  // ============================================

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<BalanceConfigData>): void {
    const updated = {
      ...this.config,
      ...newConfig,
      lastUpdated: new Date().toISOString(),
    };

    // 合并 constants
    if (newConfig.constants) {
      updated.constants = { ...this.config.constants, ...newConfig.constants };
    }

    this.config = updated;
    this.notifyListeners();
  }

  /**
   * 更新单个常量
   */
  updateConstant<K extends keyof typeof BALANCE_CONSTANTS>(
    key: K,
    value: typeof BALANCE_CONSTANTS[K]
  ): void {
    this.config.constants[key] = value;
    this.config.lastUpdated = new Date().toISOString();
    this.notifyListeners();
  }

  /**
   * 从远程加载配置
   */
  async loadFromRemote(url: string): Promise<boolean> {
    this.remoteUrl = url;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to load remote config: ${response.status}`);
        return false;
      }

      const newConfig = await response.json() as BalanceConfigData;

      // 版本检查
      if (newConfig.version !== this.config.version) {
        console.log(`Config updated: ${this.config.version} -> ${newConfig.version}`);
        this.config = newConfig;
        this.notifyListeners();
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Failed to load remote config:', error);
      return false;
    }
  }

  /**
   * 开始定期刷新配置
   */
  startAutoRefresh(intervalMs: number = 300000): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    if (this.remoteUrl) {
      this.refreshInterval = setInterval(() => {
        this.loadFromRemote(this.remoteUrl!);
      }, intervalMs);
    }
  }

  /**
   * 停止自动刷新
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  // ============================================
  // 事件监听
  // ============================================

  /**
   * 添加配置变更监听器
   */
  addListener(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 移除监听器
   */
  removeListener(listener: ConfigChangeListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Config listener error:', error);
      }
    }
  }

  // ============================================
  // A/B 测试
  // ============================================

  /**
   * 获取玩家的 A/B 测试分组
   */
  getABTestVariant(playerId: string, testId: string): ABTestAssignment | null {
    // 检查缓存
    const cached = this.playerAssignments.get(playerId);
    if (cached) {
      const existing = cached.find(a => a.testId === testId);
      if (existing) return existing;
    }

    // 查找测试
    const test = this.config.abTests.find(t => t.testId === testId);
    if (!test || !test.enabled) return null;

    // 检查时间范围
    const now = Date.now();
    if (test.startTime && new Date(test.startTime).getTime() > now) return null;
    if (test.endTime && new Date(test.endTime).getTime() < now) return null;

    // 分配变体
    const variant = this.assignVariant(playerId, test);
    const assignment: ABTestAssignment = {
      testId,
      variantName: variant.name,
      value: variant.value,
    };

    // 缓存分配结果
    if (!this.playerAssignments.has(playerId)) {
      this.playerAssignments.set(playerId, []);
    }
    this.playerAssignments.get(playerId)!.push(assignment);

    return assignment;
  }

  /**
   * 获取玩家所有活跃的 A/B 测试分组
   */
  getAllABTestAssignments(playerId: string): ABTestAssignment[] {
    const assignments: ABTestAssignment[] = [];

    for (const test of this.config.abTests) {
      const assignment = this.getABTestVariant(playerId, test.testId);
      if (assignment) {
        assignments.push(assignment);
      }
    }

    return assignments;
  }

  /**
   * 应用 A/B 测试值到配置
   */
  applyABTestValues(playerId: string): BalanceConfigData {
    const config = { ...this.config };
    const assignments = this.getAllABTestAssignments(playerId);

    for (const assignment of assignments) {
      const test = this.config.abTests.find(t => t.testId === assignment.testId);
      if (test) {
        this.setNestedValue(config, test.parameter, assignment.value);
      }
    }

    return config;
  }

  /**
   * 根据权重分配变体
   */
  private assignVariant(playerId: string, test: ABTest): ABTestVariant {
    const hash = this.hashString(playerId + test.testId);
    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    let roll = (hash % 10000) / 10000 * totalWeight;

    for (const variant of test.variants) {
      roll -= variant.weight;
      if (roll <= 0) return variant;
    }

    return test.variants[test.variants.length - 1];
  }

  /**
   * 字符串哈希（稳定分配）
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * 设置嵌套对象值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  // ============================================
  // 添加/管理 A/B 测试
  // ============================================

  /**
   * 添加新的 A/B 测试
   */
  addABTest(test: ABTest): void {
    const existing = this.config.abTests.findIndex(t => t.testId === test.testId);
    if (existing >= 0) {
      this.config.abTests[existing] = test;
    } else {
      this.config.abTests.push(test);
    }
    this.notifyListeners();
  }

  /**
   * 移除 A/B 测试
   */
  removeABTest(testId: string): void {
    this.config.abTests = this.config.abTests.filter(t => t.testId !== testId);
    this.notifyListeners();
  }

  /**
   * 启用/禁用 A/B 测试
   */
  setABTestEnabled(testId: string, enabled: boolean): void {
    const test = this.config.abTests.find(t => t.testId === testId);
    if (test) {
      test.enabled = enabled;
      this.notifyListeners();
    }
  }

  // ============================================
  // 序列化
  // ============================================

  /**
   * 导出配置为 JSON
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 从 JSON 导入配置
   */
  fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json) as BalanceConfigData;
      this.config = parsed;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to parse config JSON:', error);
    }
  }

  /**
   * 重置为默认配置
   */
  reset(): void {
    this.config = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      constants: { ...BALANCE_CONSTANTS },
      phases: [...DIFFICULTY_PHASES],
      events: {
        bossLevels: [25, 50, 75, 100],
        easyLevels: [],
        hardLevels: [],
      },
      abTests: [],
    };
    this.playerAssignments.clear();
    this.notifyListeners();
  }
}

// ============================================
// 单例实例
// ============================================

let _instance: BalanceConfigManager | null = null;

export function getBalanceConfigManager(): BalanceConfigManager {
  if (!_instance) {
    _instance = new BalanceConfigManager();
  }
  return _instance;
}

export function resetBalanceConfigManager(): void {
  _instance = null;
}
