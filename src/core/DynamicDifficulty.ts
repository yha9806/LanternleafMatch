// ============================================
// 动态难度调整系统 (DDA)
// 基于玩家表现实时调整关卡难度
// ============================================

import type { LevelDef, TileType } from '../types';
import { BALANCE_CONSTANTS } from './BalanceFormulas';

// ============================================
// 类型定义
// ============================================

export interface PlayerProfile {
  playerId: string;
  gamesPlayed: number;          // 总游戏次数
  skillLevel: number;           // 技能等级 (0-1)
  recentWinRate: number;        // 近期胜率
  avgMovesEfficiency: number;   // 平均步数效率
  specialTileUsage: number;     // 特殊块使用率
  cascadeRate: number;          // 连消率
  frustrationScore: number;     // 挫败分数 (0-1, 高=挫败)
  engagementScore: number;      // 参与度 (0-1)
  lastUpdated: number;
}

export interface PlaySession {
  level: number;
  result: 'win' | 'lose';
  movesUsed: number;
  movesTotal: number;
  goalProgress: number;
  goalTotal: number;
  specialsUsed: number;
  cascades: number;
  duration: number;
  retries: number;
}

export interface DifficultyModifier {
  movesBonus: number;          // 额外步数 (-3 到 +3)
  goalReduction: number;       // 目标减少 (0-20%)
  densityReduction: number;    // 密度减少 (0-30%)
  goalWeightBoost: number;     // 目标物权重加成 (1.0-1.2)
}

export interface DDAConfig {
  enabled: boolean;

  // 玩家画像参数
  recentGamesWindow: number;    // 近期游戏窗口大小
  skillDecayRate: number;       // 技能衰减率

  // 调整阈值
  frustrationThreshold: number; // 触发降难的挫败阈值
  boredomThreshold: number;     // 触发增难的无聊阈值

  // 调整幅度
  maxMovesBonus: number;
  maxGoalReduction: number;
  maxDensityReduction: number;

  // 新手保护
  newPlayerGamesThreshold: number;
  newPlayerBonus: boolean;
}

// ============================================
// 默认配置
// ============================================

const DEFAULT_DDA_CONFIG: DDAConfig = {
  enabled: true,
  recentGamesWindow: 10,
  skillDecayRate: 0.1,
  frustrationThreshold: 0.6,
  boredomThreshold: 0.3,
  maxMovesBonus: 3,
  maxGoalReduction: 0.15,
  maxDensityReduction: 0.20,
  newPlayerGamesThreshold: 20,
  newPlayerBonus: true,
};

// ============================================
// DynamicDifficulty 类
// ============================================

export class DynamicDifficulty {
  private config: DDAConfig;
  private profiles: Map<string, PlayerProfile> = new Map();
  private sessionHistory: Map<string, PlaySession[]> = new Map();

  constructor(config: Partial<DDAConfig> = {}) {
    this.config = { ...DEFAULT_DDA_CONFIG, ...config };
  }

  // ============================================
  // 玩家画像管理
  // ============================================

  /**
   * 获取或创建玩家画像
   */
  getPlayerProfile(playerId: string): PlayerProfile {
    let profile = this.profiles.get(playerId);

    if (!profile) {
      profile = this.createDefaultProfile(playerId);
      this.profiles.set(playerId, profile);
    }

    return profile;
  }

  /**
   * 更新玩家画像（游戏结束后调用）
   */
  updatePlayerProfile(playerId: string, session: PlaySession): void {
    // 记录会话
    if (!this.sessionHistory.has(playerId)) {
      this.sessionHistory.set(playerId, []);
    }
    const history = this.sessionHistory.get(playerId)!;
    history.push(session);

    // 保留最近 N 局
    if (history.length > this.config.recentGamesWindow * 2) {
      history.splice(0, history.length - this.config.recentGamesWindow);
    }

    // 更新画像
    const profile = this.getPlayerProfile(playerId);
    profile.gamesPlayed++;
    this.recalculateProfile(profile, history);
    profile.lastUpdated = Date.now();
  }

  /**
   * 重新计算玩家画像
   */
  private recalculateProfile(profile: PlayerProfile, history: PlaySession[]): void {
    const recent = history.slice(-this.config.recentGamesWindow);
    if (recent.length === 0) return;

    // 胜率
    const wins = recent.filter(s => s.result === 'win').length;
    profile.recentWinRate = wins / recent.length;

    // 步数效率 (目标完成 / 使用步数)
    const efficiencies = recent.map(s =>
      s.movesUsed > 0 ? s.goalProgress / s.movesUsed : 0
    );
    profile.avgMovesEfficiency = this.avg(efficiencies);

    // 特殊块使用率
    profile.specialTileUsage = this.avg(recent.map(s =>
      s.movesUsed > 0 ? s.specialsUsed / s.movesUsed : 0
    ));

    // 连消率
    profile.cascadeRate = this.avg(recent.map(s =>
      s.movesUsed > 0 ? s.cascades / s.movesUsed : 0
    ));

    // 技能等级 (综合多个因素)
    profile.skillLevel = this.calculateSkillLevel(profile, recent);

    // 挫败分数
    profile.frustrationScore = this.calculateFrustration(recent);

    // 参与度
    profile.engagementScore = this.calculateEngagement(recent);
  }

  /**
   * 计算技能等级
   */
  private calculateSkillLevel(profile: PlayerProfile, recent: PlaySession[]): number {
    // 权重组合：胜率 40%, 效率 30%, 特殊块使用 15%, 连消率 15%
    const winRateScore = profile.recentWinRate;
    const efficiencyScore = Math.min(1, profile.avgMovesEfficiency / 0.5);
    const specialScore = Math.min(1, profile.specialTileUsage * 5);
    const cascadeScore = Math.min(1, profile.cascadeRate);

    return (
      winRateScore * 0.40 +
      efficiencyScore * 0.30 +
      specialScore * 0.15 +
      cascadeScore * 0.15
    );
  }

  /**
   * 计算挫败分数
   */
  private calculateFrustration(recent: PlaySession[]): number {
    if (recent.length === 0) return 0;

    // 连续失败次数
    let consecutiveLosses = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i].result === 'lose') {
        consecutiveLosses++;
      } else {
        break;
      }
    }

    // 平均重试次数
    const avgRetries = this.avg(recent.map(s => s.retries));

    // 平均完成度 (失败时)
    const losses = recent.filter(s => s.result === 'lose');
    const avgCompletion = losses.length > 0
      ? this.avg(losses.map(s => s.goalProgress / s.goalTotal))
      : 1;

    // 挫败分数 = 连败因子 + 重试因子 + 未完成因子
    const lossStreak = Math.min(1, consecutiveLosses / 5);
    const retryFactor = Math.min(1, avgRetries / 3);
    const incompleteFactor = 1 - avgCompletion;

    return (lossStreak * 0.5 + retryFactor * 0.3 + incompleteFactor * 0.2);
  }

  /**
   * 计算参与度
   */
  private calculateEngagement(recent: PlaySession[]): number {
    if (recent.length === 0) return 0.5;

    // 平均游戏时长 (期望 60-180 秒)
    const avgDuration = this.avg(recent.map(s => s.duration));
    const durationScore = Math.min(1, Math.max(0, (avgDuration - 30) / 120));

    // 游戏频率 (基于会话数量)
    const frequencyScore = Math.min(1, recent.length / this.config.recentGamesWindow);

    // 完成度 (尝试达到目标)
    const completionScore = this.avg(recent.map(s => s.goalProgress / s.goalTotal));

    return (durationScore * 0.4 + frequencyScore * 0.3 + completionScore * 0.3);
  }

  // ============================================
  // 难度调整
  // ============================================

  /**
   * 计算难度修正值
   */
  calculateModifier(playerId: string, level: number): DifficultyModifier {
    if (!this.config.enabled) {
      return this.neutralModifier();
    }

    const profile = this.getPlayerProfile(playerId);
    const gamesPlayed = profile.gamesPlayed;

    // 新手保护
    if (this.config.newPlayerBonus && gamesPlayed < this.config.newPlayerGamesThreshold) {
      return this.newPlayerModifier(gamesPlayed);
    }

    // 挫败保护
    if (profile.frustrationScore > this.config.frustrationThreshold) {
      return this.frustrationModifier(profile);
    }

    // 无聊检测 (胜率过高)
    if (profile.recentWinRate > 1 - this.config.boredomThreshold &&
        profile.engagementScore < 0.4) {
      return this.boredomModifier(profile);
    }

    // 基于技能等级的微调
    return this.skillBasedModifier(profile);
  }

  /**
   * 应用难度修正到关卡定义
   */
  applyModifier(levelDef: LevelDef, modifier: DifficultyModifier): LevelDef {
    const modifiedDef = { ...levelDef };

    // 步数调整
    modifiedDef.moves = Math.max(
      BALANCE_CONSTANTS.MOVES_MIN,
      Math.min(
        BALANCE_CONSTANTS.MOVES_MAX,
        levelDef.moves + modifier.movesBonus
      )
    );

    // 目标调整
    modifiedDef.goals = levelDef.goals.map(goal => {
      if (goal.type === 'collect') {
        const reduction = Math.floor(goal.count * modifier.goalReduction);
        return {
          ...goal,
          count: Math.max(BALANCE_CONSTANTS.GOAL_MIN, goal.count - reduction),
        };
      }
      return goal;
    });

    // 密度调整
    modifiedDef.blockers = {
      ...levelDef.blockers,
      density: Math.max(
        0,
        levelDef.blockers.density * (1 - modifier.densityReduction)
      ),
    };

    // 权重调整
    if (modifier.goalWeightBoost > 1.0) {
      const goalItem = this.getGoalItem(levelDef);
      if (goalItem) {
        modifiedDef.tile_weights = {
          ...levelDef.tile_weights,
          [goalItem]: levelDef.tile_weights[goalItem] * modifier.goalWeightBoost,
        };
      }
    }

    return modifiedDef;
  }

  // ============================================
  // 修正值生成器
  // ============================================

  private neutralModifier(): DifficultyModifier {
    return {
      movesBonus: 0,
      goalReduction: 0,
      densityReduction: 0,
      goalWeightBoost: 1.0,
    };
  }

  private newPlayerModifier(gamesPlayed: number): DifficultyModifier {
    // 新手期逐渐减少帮助
    const progress = gamesPlayed / this.config.newPlayerGamesThreshold;
    const helpLevel = 1 - progress;

    return {
      movesBonus: Math.round(this.config.maxMovesBonus * helpLevel),
      goalReduction: this.config.maxGoalReduction * helpLevel * 0.5,
      densityReduction: this.config.maxDensityReduction * helpLevel * 0.3,
      goalWeightBoost: 1.0 + (0.15 * helpLevel),
    };
  }

  private frustrationModifier(profile: PlayerProfile): DifficultyModifier {
    // 挫败程度决定帮助力度
    const helpLevel = (profile.frustrationScore - this.config.frustrationThreshold) /
                      (1 - this.config.frustrationThreshold);

    return {
      movesBonus: Math.round(this.config.maxMovesBonus * helpLevel),
      goalReduction: this.config.maxGoalReduction * helpLevel,
      densityReduction: this.config.maxDensityReduction * helpLevel,
      goalWeightBoost: 1.0 + (0.1 * helpLevel),
    };
  }

  private boredomModifier(profile: PlayerProfile): DifficultyModifier {
    // 稍微增加难度
    return {
      movesBonus: -1,
      goalReduction: -0.05, // 负数 = 增加目标
      densityReduction: -0.05,
      goalWeightBoost: 0.95, // 略微降低权重
    };
  }

  private skillBasedModifier(profile: PlayerProfile): DifficultyModifier {
    // 根据技能等级微调
    // 技能高于平均 -> 稍增难度
    // 技能低于平均 -> 稍降难度
    const skillDelta = profile.skillLevel - 0.5;

    return {
      movesBonus: Math.round(-skillDelta * 2), // -1 到 +1
      goalReduction: skillDelta > 0 ? 0 : Math.abs(skillDelta) * 0.05,
      densityReduction: skillDelta > 0 ? 0 : Math.abs(skillDelta) * 0.05,
      goalWeightBoost: 1.0,
    };
  }

  // ============================================
  // 辅助方法
  // ============================================

  private createDefaultProfile(playerId: string): PlayerProfile {
    return {
      playerId,
      gamesPlayed: 0,
      skillLevel: 0.5,
      recentWinRate: 0.5,
      avgMovesEfficiency: 0.3,
      specialTileUsage: 0.1,
      cascadeRate: 0.2,
      frustrationScore: 0,
      engagementScore: 0.5,
      lastUpdated: Date.now(),
    };
  }

  private getGoalItem(levelDef: LevelDef): TileType | null {
    for (const goal of levelDef.goals) {
      if (goal.type === 'collect') {
        return goal.item;
      }
    }
    return null;
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  // ============================================
  // 管理方法
  // ============================================

  /**
   * 导出玩家画像
   */
  exportProfile(playerId: string): PlayerProfile | null {
    return this.profiles.get(playerId) || null;
  }

  /**
   * 导入玩家画像
   */
  importProfile(profile: PlayerProfile): void {
    this.profiles.set(profile.playerId, profile);
  }

  /**
   * 清除玩家数据
   */
  clearPlayerData(playerId: string): void {
    this.profiles.delete(playerId);
    this.sessionHistory.delete(playerId);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DDAConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): DDAConfig {
    return { ...this.config };
  }

  /**
   * 启用/禁用 DDA
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * 获取调整统计
   */
  getAdjustmentStats(): {
    totalPlayers: number;
    frustatedPlayers: number;
    newPlayers: number;
    skilledPlayers: number;
  } {
    const profiles = Array.from(this.profiles.values());

    return {
      totalPlayers: profiles.length,
      frustatedPlayers: profiles.filter(p => p.frustrationScore > this.config.frustrationThreshold).length,
      newPlayers: profiles.filter(p => p.gamesPlayed < this.config.newPlayerGamesThreshold).length,
      skilledPlayers: profiles.filter(p => p.skillLevel > 0.7).length,
    };
  }
}
