import {
  _decorator, Component, Node, Vec3, Color, sys,
  AudioSource, AudioClip, resources, tween
} from 'cc';
import { TweenEffects, ShakeConfig } from './TweenEffects';
import { ParticleEffectsManager } from './ParticleEffects';

const { ccclass, property } = _decorator;

/**
 * 震动强度
 */
export type VibrateIntensity = 'light' | 'medium' | 'heavy';

/**
 * 音效类型
 */
export type SFXType =
  | 'select'
  | 'swap'
  | 'swap_invalid'
  | 'match_3'
  | 'match_4'
  | 'match_5'
  | 'combo'
  | 'moss_clear'
  | 'special_create'
  | 'special_trigger'
  | 'shuffle'
  | 'win'
  | 'lose'
  | 'button'
  | 'collect';

/**
 * GameJuice - 游戏"果汁"效果总控
 * 协调动画、粒子、音效、震动，创造沉浸感
 */
@ccclass('GameJuice')
export class GameJuice extends Component {
  // ============================================
  // 组件引用
  // ============================================

  @property(Node)
  boardNode: Node = null!;

  @property(Node)
  effectsLayer: Node = null!;

  @property(ParticleEffectsManager)
  particles: ParticleEffectsManager = null!;

  @property(AudioSource)
  sfxSource: AudioSource = null!;

  // ============================================
  // 配置
  // ============================================

  @property({ type: Boolean })
  enableVibration: boolean = true;

  @property({ type: Boolean })
  enableScreenShake: boolean = true;

  @property({ type: Boolean })
  enableParticles: boolean = true;

  @property({ type: Boolean })
  enableSFX: boolean = true;

  @property({ type: Number, range: [0, 1] })
  sfxVolume: number = 1.0;

  // ============================================
  // 内部状态
  // ============================================

  private audioClips: Map<SFXType, AudioClip> = new Map();
  private comboCount: number = 0;
  private isShaking: boolean = false;

  // ============================================
  // 生命周期
  // ============================================

  onLoad() {
    this.loadAudioClips();
  }

  // ============================================
  // 公共API - 游戏事件触发
  // ============================================

  /**
   * 选中方块
   */
  onTileSelect(node: Node) {
    // 轻微放大
    TweenEffects.pulse(node, 1.1, 0.15, 1);

    // 音效
    this.playSFX('select');

    // 轻震
    this.vibrate('light');
  }

  /**
   * 交换开始
   */
  async onSwapStart(fromNode: Node, toNode: Node, fromPos: Vec3, toPos: Vec3): Promise<void> {
    // 交换动画
    await Promise.all([
      TweenEffects.moveTo(fromNode, toPos, { duration: 0.15, easing: 'sineOut' }),
      TweenEffects.moveTo(toNode, fromPos, { duration: 0.15, easing: 'sineOut' }),
    ]);

    this.playSFX('swap');
  }

  /**
   * 交换无效 (换回)
   */
  async onSwapInvalid(fromNode: Node, toNode: Node, fromPos: Vec3, toPos: Vec3): Promise<void> {
    // 快速抖动
    TweenEffects.wobble(fromNode, 8, 0.2, 1);
    TweenEffects.wobble(toNode, 8, 0.2, 1);

    // 换回
    await Promise.all([
      TweenEffects.moveTo(fromNode, fromPos, { duration: 0.15, easing: 'sineOut' }),
      TweenEffects.moveTo(toNode, toPos, { duration: 0.15, easing: 'sineOut' }),
    ]);

    this.playSFX('swap_invalid');
    this.vibrate('light');
  }

  /**
   * 消除事件
   */
  async onMatch(nodes: Node[], positions: Vec3[], tileType: string, matchSize: number): Promise<void> {
    // 根据消除数量选择音效
    if (matchSize >= 5) {
      this.playSFX('match_5');
    } else if (matchSize >= 4) {
      this.playSFX('match_4');
    } else {
      this.playSFX('match_3');
    }

    // 粒子效果
    if (this.enableParticles && this.particles) {
      for (const pos of positions) {
        this.particles.playMatchEffect(pos, tileType, matchSize);
      }
    }

    // 消除动画 (并行)
    const animations = nodes.map(node => TweenEffects.matchExplosion(node, 0.25));
    await Promise.all(animations);

    // 屏幕震动 (根据消除数量)
    const shakeIntensity = Math.min(3 + matchSize, 8);
    this.shakeScreen({
      intensity: shakeIntensity,
      duration: 0.15,
      frequency: 30,
      decay: true,
    });

    // 震动反馈
    this.vibrate(matchSize >= 4 ? 'medium' : 'light');
  }

  /**
   * 连消事件
   */
  async onCombo(comboCount: number, position: Vec3): Promise<void> {
    this.comboCount = comboCount;

    // 音效音调递增
    this.playSFX('combo');

    // 粒子效果增强
    if (this.enableParticles && this.particles) {
      this.particles.playComboEffect(position, comboCount);
    }

    // 屏幕震动增强
    const shakeIntensity = Math.min(5 + comboCount * 2, 15);
    this.shakeScreen({
      intensity: shakeIntensity,
      duration: 0.2,
      frequency: 40,
      decay: true,
    });

    // 震动增强
    this.vibrate(comboCount >= 3 ? 'heavy' : 'medium');

    // 连消文字飘起 (可选，需要UI支持)
  }

  /**
   * 特殊块生成
   */
  async onSpecialCreate(node: Node, specialType: 'whirl_h' | 'whirl_v' | 'lantern'): Promise<void> {
    // 弹性出现
    await TweenEffects.spring(node, 1, 0.4);

    // 闪烁
    TweenEffects.blink(node, 2, 0.3);

    // 音效
    this.playSFX('special_create');

    // 震动
    this.vibrate('medium');
  }

  /**
   * 特殊块触发
   */
  async onSpecialTrigger(node: Node, position: Vec3, specialType: 'whirl_h' | 'whirl_v' | 'lantern'): Promise<void> {
    // 粒子效果
    if (this.enableParticles && this.particles) {
      this.particles.playSpecialEffect(position, specialType);
    }

    // 消除动画
    await TweenEffects.specialActivate(node, 0.4);

    // 音效
    this.playSFX('special_trigger');

    // 强震动
    this.vibrate('heavy');

    // 屏幕大震
    this.shakeScreen({
      intensity: 12,
      duration: 0.3,
      frequency: 50,
      decay: true,
    });
  }

  /**
   * 苔藓清除
   */
  async onMossClear(node: Node, position: Vec3): Promise<void> {
    // 粒子
    if (this.enableParticles && this.particles) {
      this.particles.playMossClearEffect(position);
    }

    // 消失动画
    await TweenEffects.popOut(node, 0.2);

    // 音效
    this.playSFX('moss_clear');
  }

  /**
   * 方块下落
   */
  async onTileFall(node: Node, fromPos: Vec3, toPos: Vec3, distance: number): Promise<void> {
    const duration = 0.15 + distance * 0.03;

    // 使用带弹跳的下落
    await TweenEffects.moveTo(node, toPos, { duration, easing: 'quadIn' });

    // 落地微弹
    const bounceScale = 1 + Math.min(distance * 0.02, 0.1);
    tween(node)
      .to(0.05, { scale: new Vec3(1.1, 0.9, 1) })
      .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }

  /**
   * 新方块生成
   */
  async onTileSpawn(node: Node): Promise<void> {
    await TweenEffects.popIn(node, 0.2);
  }

  /**
   * 洗牌
   */
  async onShuffle(nodes: Node[]): Promise<void> {
    // 所有方块缩小
    await Promise.all(nodes.map(n =>
      TweenEffects.scaleTo(n, 0.5, { duration: 0.15 })
    ));

    this.playSFX('shuffle');

    // 等待位置更新后放大
    await TweenEffects.delay(100);

    await Promise.all(nodes.map(n =>
      TweenEffects.scaleTo(n, 1, { duration: 0.2, easing: 'backOut' })
    ));
  }

  /**
   * 收集目标物
   */
  async onCollect(node: Node, targetPos: Vec3): Promise<void> {
    // 飞向目标
    await TweenEffects.flyToTarget(node, targetPos, 0.4);

    // 音效
    this.playSFX('collect');
  }

  /**
   * 胜利
   */
  async onWin(): Promise<void> {
    // 粒子庆祝
    if (this.enableParticles && this.particles) {
      this.particles.playWinEffect();
    }

    // 音效
    this.playSFX('win');

    // 强震动
    this.vibrate('heavy');

    // 屏幕震动
    this.shakeScreen({
      intensity: 8,
      duration: 0.4,
      frequency: 20,
      decay: true,
    });
  }

  /**
   * 失败
   */
  async onLose(): Promise<void> {
    // 粒子
    if (this.enableParticles && this.particles) {
      this.particles.playLoseEffect();
    }

    // 音效
    this.playSFX('lose');

    // 中等震动
    this.vibrate('medium');
  }

  /**
   * UI按钮点击
   */
  onButtonClick(node?: Node) {
    if (node) {
      TweenEffects.pulse(node, 0.9, 0.1, 1);
    }
    this.playSFX('button');
    this.vibrate('light');
  }

  // ============================================
  // 重置连消计数
  // ============================================

  resetCombo() {
    this.comboCount = 0;
  }

  // ============================================
  // 音效
  // ============================================

  private loadAudioClips() {
    const sfxTypes: SFXType[] = [
      'select', 'swap', 'swap_invalid',
      'match_3', 'match_4', 'match_5',
      'combo', 'moss_clear',
      'special_create', 'special_trigger',
      'shuffle', 'win', 'lose', 'button', 'collect'
    ];

    for (const type of sfxTypes) {
      resources.load(`audio/sfx/sfx_${type}`, AudioClip, (err, clip) => {
        if (!err && clip) {
          this.audioClips.set(type, clip);
        }
      });
    }
  }

  playSFX(type: SFXType) {
    if (!this.enableSFX) return;

    const clip = this.audioClips.get(type);
    if (clip && this.sfxSource) {
      this.sfxSource.playOneShot(clip, this.sfxVolume);
    }
  }

  setSFXVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  // ============================================
  // 震动
  // ============================================

  vibrate(intensity: VibrateIntensity) {
    if (!this.enableVibration) return;

    // 微信小游戏震动API
    if (typeof wx !== 'undefined') {
      switch (intensity) {
        case 'light':
          (wx as any).vibrateShort?.({ type: 'light' });
          break;
        case 'medium':
          (wx as any).vibrateShort?.({ type: 'medium' });
          break;
        case 'heavy':
          (wx as any).vibrateShort?.({ type: 'heavy' });
          break;
      }
    }

    // 抖音小游戏
    if (typeof tt !== 'undefined') {
      switch (intensity) {
        case 'light':
          (tt as any).vibrateShort?.();
          break;
        case 'medium':
        case 'heavy':
          (tt as any).vibrateLong?.();
          break;
      }
    }

    // Web Vibration API
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      switch (intensity) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'heavy':
          navigator.vibrate(50);
          break;
      }
    }
  }

  // ============================================
  // 屏幕震动
  // ============================================

  async shakeScreen(config: ShakeConfig) {
    if (!this.enableScreenShake || this.isShaking) return;
    if (!this.boardNode) return;

    this.isShaking = true;
    await TweenEffects.shake(this.boardNode, config);
    this.isShaking = false;
  }

  // ============================================
  // 配置
  // ============================================

  setVibrationEnabled(enabled: boolean) {
    this.enableVibration = enabled;
  }

  setScreenShakeEnabled(enabled: boolean) {
    this.enableScreenShake = enabled;
  }

  setParticlesEnabled(enabled: boolean) {
    this.enableParticles = enabled;
  }

  setSFXEnabled(enabled: boolean) {
    this.enableSFX = enabled;
  }
}

// 全局声明小程序API
declare const wx: any;
declare const tt: any;
