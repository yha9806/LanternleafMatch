import {
  _decorator, Component, Node, ParticleSystem2D, Color,
  Vec2, Vec3, instantiate, Prefab, SpriteFrame
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * 粒子效果类型
 */
export type ParticleEffectType =
  | 'match_burst'      // 消除爆发
  | 'combo_spark'      // 连消火花
  | 'special_whirl'    // 旋风特效
  | 'special_lantern'  // 灯笼爆炸
  | 'moss_clear'       // 苔藓清除
  | 'collect_trail'    // 收集轨迹
  | 'win_confetti'     // 胜利彩带
  | 'star_burst';      // 星星爆发

/**
 * 粒子配置
 */
export interface ParticleConfig {
  // 基础属性
  maxParticles: number;
  duration: number;
  emissionRate: number;
  life: number;
  lifeVar: number;

  // 大小
  startSize: number;
  startSizeVar: number;
  endSize: number;
  endSizeVar: number;

  // 颜色
  startColor: Color;
  startColorVar: Color;
  endColor: Color;
  endColorVar: Color;

  // 运动
  angle: number;
  angleVar: number;
  speed: number;
  speedVar: number;
  gravity: Vec2;

  // 旋转
  startSpin: number;
  startSpinVar: number;
  endSpin: number;
  endSpinVar: number;

  // 发射器
  emitterMode: 'gravity' | 'radius';
  posVar: Vec2;
}

/**
 * 预设粒子配置
 */
export const PARTICLE_PRESETS: Record<ParticleEffectType, Partial<ParticleConfig>> = {
  // 消除爆发 - 小颗粒四散
  match_burst: {
    maxParticles: 20,
    duration: 0.3,
    emissionRate: 100,
    life: 0.4,
    lifeVar: 0.1,
    startSize: 15,
    startSizeVar: 5,
    endSize: 0,
    startColor: new Color(255, 255, 200, 255),
    endColor: new Color(255, 255, 100, 0),
    angle: 90,
    angleVar: 180,
    speed: 150,
    speedVar: 50,
    gravity: new Vec2(0, -200),
    posVar: new Vec2(20, 20),
  },

  // 连消火花 - 更强烈的效果
  combo_spark: {
    maxParticles: 40,
    duration: 0.4,
    emissionRate: 150,
    life: 0.5,
    lifeVar: 0.15,
    startSize: 20,
    startSizeVar: 8,
    endSize: 0,
    startColor: new Color(255, 200, 50, 255),
    endColor: new Color(255, 100, 0, 0),
    angle: 90,
    angleVar: 180,
    speed: 200,
    speedVar: 80,
    gravity: new Vec2(0, -100),
    startSpin: 0,
    endSpin: 360,
    posVar: new Vec2(30, 30),
  },

  // 旋风特效 - 螺旋上升
  special_whirl: {
    maxParticles: 30,
    duration: 0.5,
    emissionRate: 80,
    life: 0.6,
    lifeVar: 0.2,
    startSize: 25,
    startSizeVar: 10,
    endSize: 5,
    startColor: new Color(100, 200, 255, 255),
    endColor: new Color(50, 150, 255, 0),
    angle: 90,
    angleVar: 30,
    speed: 180,
    speedVar: 40,
    gravity: new Vec2(0, 50),
    startSpin: 0,
    endSpin: 720,
    posVar: new Vec2(10, 10),
  },

  // 灯笼爆炸 - 3x3范围大爆炸
  special_lantern: {
    maxParticles: 60,
    duration: 0.6,
    emissionRate: 200,
    life: 0.8,
    lifeVar: 0.3,
    startSize: 30,
    startSizeVar: 15,
    endSize: 0,
    startColor: new Color(255, 180, 50, 255),
    startColorVar: new Color(20, 20, 20, 0),
    endColor: new Color(255, 100, 0, 0),
    angle: 90,
    angleVar: 180,
    speed: 250,
    speedVar: 100,
    gravity: new Vec2(0, -300),
    startSpin: -180,
    endSpin: 180,
    posVar: new Vec2(50, 50),
  },

  // 苔藓清除 - 绿色碎片
  moss_clear: {
    maxParticles: 15,
    duration: 0.25,
    emissionRate: 80,
    life: 0.5,
    lifeVar: 0.2,
    startSize: 18,
    startSizeVar: 6,
    endSize: 0,
    startColor: new Color(100, 180, 80, 255),
    endColor: new Color(60, 120, 40, 0),
    angle: 90,
    angleVar: 60,
    speed: 120,
    speedVar: 40,
    gravity: new Vec2(0, -400),
    posVar: new Vec2(25, 25),
  },

  // 收集轨迹 - 飞向目标的尾迹
  collect_trail: {
    maxParticles: 30,
    duration: -1, // 持续发射
    emissionRate: 60,
    life: 0.3,
    lifeVar: 0.1,
    startSize: 12,
    startSizeVar: 4,
    endSize: 0,
    startColor: new Color(255, 255, 150, 255),
    endColor: new Color(255, 200, 50, 0),
    angle: 0,
    angleVar: 15,
    speed: 0,
    speedVar: 10,
    gravity: new Vec2(0, 0),
    posVar: new Vec2(5, 5),
  },

  // 胜利彩带 - 五彩纸屑
  win_confetti: {
    maxParticles: 100,
    duration: 2,
    emissionRate: 80,
    life: 2,
    lifeVar: 0.5,
    startSize: 20,
    startSizeVar: 10,
    endSize: 15,
    startColor: new Color(255, 255, 255, 255),
    startColorVar: new Color(255, 255, 255, 0), // 随机颜色
    endColor: new Color(255, 255, 255, 200),
    angle: -90,
    angleVar: 30,
    speed: 100,
    speedVar: 50,
    gravity: new Vec2(0, -50),
    startSpin: 0,
    startSpinVar: 180,
    endSpin: 360,
    posVar: new Vec2(200, 10),
  },

  // 星星爆发 - 胜利时星星效果
  star_burst: {
    maxParticles: 20,
    duration: 0.5,
    emissionRate: 50,
    life: 0.8,
    lifeVar: 0.2,
    startSize: 35,
    startSizeVar: 10,
    endSize: 0,
    startColor: new Color(255, 230, 100, 255),
    endColor: new Color(255, 200, 50, 0),
    angle: 90,
    angleVar: 180,
    speed: 180,
    speedVar: 60,
    gravity: new Vec2(0, -150),
    startSpin: 0,
    endSpin: 180,
    posVar: new Vec2(20, 20),
  },
};

/**
 * 根据消除类型获取颜色
 */
export function getColorForTileType(tileType: string): Color {
  const colors: Record<string, Color> = {
    leaf: new Color(120, 200, 80, 255),
    acorn: new Color(180, 120, 60, 255),
    star: new Color(255, 220, 80, 255),
    fish: new Color(100, 180, 220, 255),
    bone: new Color(240, 230, 200, 255),
  };
  return colors[tileType] || new Color(255, 255, 255, 255);
}

/**
 * ParticleEffectsManager - 粒子效果管理器
 */
@ccclass('ParticleEffectsManager')
export class ParticleEffectsManager extends Component {
  @property(Node)
  effectsLayer: Node = null!;

  @property(Prefab)
  particlePrefab: Prefab = null!;

  // 粒子池
  private particlePool: Node[] = [];
  private activeParticles: Node[] = [];

  /**
   * 播放粒子效果
   */
  play(type: ParticleEffectType, position: Vec3, options?: {
    color?: Color;
    scale?: number;
    duration?: number;
  }): Node | null {
    const preset = PARTICLE_PRESETS[type];
    if (!preset) return null;

    const particleNode = this.getParticleNode();
    if (!particleNode) return null;

    particleNode.setPosition(position);
    particleNode.active = true;

    const ps = particleNode.getComponent(ParticleSystem2D);
    if (ps) {
      this.applyConfig(ps, preset, options);
      ps.resetSystem();
    }

    this.activeParticles.push(particleNode);

    // 自动回收
    const duration = options?.duration || preset.duration || 1;
    if (duration > 0) {
      this.scheduleOnce(() => {
        this.recycle(particleNode);
      }, duration + 0.5);
    }

    return particleNode;
  }

  /**
   * 播放消除效果
   */
  playMatchEffect(position: Vec3, tileType: string, matchSize: number) {
    const color = getColorForTileType(tileType);
    const scale = 1 + (matchSize - 3) * 0.2;

    this.play('match_burst', position, { color, scale });

    // 4连以上添加额外效果
    if (matchSize >= 4) {
      this.play('combo_spark', position, { color, scale: scale * 1.2 });
    }
  }

  /**
   * 播放连消效果
   */
  playComboEffect(position: Vec3, comboCount: number) {
    const scale = 1 + comboCount * 0.15;
    this.play('combo_spark', position, { scale });
  }

  /**
   * 播放特殊块效果
   */
  playSpecialEffect(position: Vec3, specialType: 'whirl_h' | 'whirl_v' | 'lantern') {
    if (specialType.startsWith('whirl')) {
      this.play('special_whirl', position);
    } else {
      this.play('special_lantern', position);
    }
  }

  /**
   * 播放苔藓清除效果
   */
  playMossClearEffect(position: Vec3) {
    this.play('moss_clear', position);
  }

  /**
   * 播放胜利效果
   */
  playWinEffect() {
    // 多点发射彩带
    const positions = [
      new Vec3(-200, 400, 0),
      new Vec3(0, 450, 0),
      new Vec3(200, 400, 0),
    ];

    for (const pos of positions) {
      this.play('win_confetti', pos, { duration: 2 });
    }

    // 中心星星爆发
    this.scheduleOnce(() => {
      this.play('star_burst', new Vec3(0, 0, 0), { scale: 2 });
    }, 0.3);
  }

  /**
   * 播放失败效果 (灰暗粒子)
   */
  playLoseEffect() {
    this.play('match_burst', new Vec3(0, 0, 0), {
      color: new Color(100, 100, 100, 255),
      scale: 1.5,
    });
  }

  /**
   * 停止所有粒子
   */
  stopAll() {
    for (const node of this.activeParticles) {
      this.recycle(node);
    }
    this.activeParticles = [];
  }

  // ============================================
  // 内部方法
  // ============================================

  private getParticleNode(): Node | null {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }

    if (this.particlePrefab) {
      const node = instantiate(this.particlePrefab);
      node.parent = this.effectsLayer || this.node;
      return node;
    }

    return null;
  }

  private recycle(node: Node) {
    const index = this.activeParticles.indexOf(node);
    if (index >= 0) {
      this.activeParticles.splice(index, 1);
    }

    node.active = false;
    const ps = node.getComponent(ParticleSystem2D);
    if (ps) {
      ps.stopSystem();
    }

    this.particlePool.push(node);
  }

  private applyConfig(ps: ParticleSystem2D, preset: Partial<ParticleConfig>, options?: {
    color?: Color;
    scale?: number;
    duration?: number;
  }) {
    // 应用预设配置
    if (preset.duration !== undefined) ps.duration = preset.duration;
    if (preset.emissionRate !== undefined) ps.emissionRate = preset.emissionRate;
    if (preset.life !== undefined) ps.life = preset.life;
    if (preset.lifeVar !== undefined) ps.lifeVar = preset.lifeVar;
    if (preset.startSize !== undefined) ps.startSize = preset.startSize;
    if (preset.startSizeVar !== undefined) ps.startSizeVar = preset.startSizeVar;
    if (preset.endSize !== undefined) ps.endSize = preset.endSize;
    if (preset.endSizeVar !== undefined) ps.endSizeVar = preset.endSizeVar;
    if (preset.angle !== undefined) ps.angle = preset.angle;
    if (preset.angleVar !== undefined) ps.angleVar = preset.angleVar;
    if (preset.speed !== undefined) ps.speed = preset.speed;
    if (preset.speedVar !== undefined) ps.speedVar = preset.speedVar;
    if (preset.startSpin !== undefined) ps.startSpin = preset.startSpin;
    if (preset.startSpinVar !== undefined) ps.startSpinVar = preset.startSpinVar;
    if (preset.endSpin !== undefined) ps.endSpin = preset.endSpin;
    if (preset.endSpinVar !== undefined) ps.endSpinVar = preset.endSpinVar;

    // 颜色
    if (options?.color) {
      ps.startColor = options.color;
      ps.endColor = new Color(options.color.r, options.color.g, options.color.b, 0);
    } else {
      if (preset.startColor) ps.startColor = preset.startColor;
      if (preset.endColor) ps.endColor = preset.endColor;
    }

    // 缩放
    if (options?.scale) {
      ps.startSize *= options.scale;
      ps.endSize *= options.scale;
      ps.speed *= options.scale;
    }

    // 持续时间
    if (options?.duration !== undefined) {
      ps.duration = options.duration;
    }

    // 重力
    if (preset.gravity) {
      ps.gravity = preset.gravity;
    }

    // 位置变化范围
    if (preset.posVar) {
      ps.posVar = preset.posVar;
    }
  }
}
