import {
  _decorator, Component, Node, sp, tween, Vec3, Sprite, Color, ParticleSystem2D
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * 故事片段定义
 */
interface StorySegment {
  name: string;
  duration: number;  // 秒
  catAnimation: string;
  dogAnimation: string;
  catPosition: Vec3;
  dogPosition: Vec3;
  catFlip: boolean;
  dogFlip: boolean;
}

/**
 * 吉卜力风格动画控制器
 * 管理上半部分屏幕的猫狗故事动画
 */
@ccclass('StoryAnimationController')
export class StoryAnimationController extends Component {
  // Spine 骨骼动画组件
  @property({ type: sp.Skeleton })
  catSpine: sp.Skeleton = null!;

  @property({ type: sp.Skeleton })
  dogSpine: sp.Skeleton = null!;

  // 场景元素
  @property({ type: Node })
  backgroundLayer: Node = null!;

  @property({ type: Node })
  foregroundLayer: Node = null!;

  @property({ type: Node })
  cloudsNode: Node = null!;

  // 粒子效果
  @property({ type: ParticleSystem2D })
  leavesParticle: ParticleSystem2D = null!;

  @property({ type: ParticleSystem2D })
  firefliesParticle: ParticleSystem2D = null!;

  // 光效
  @property({ type: Sprite })
  sunlightOverlay: Sprite = null!;

  // 配置
  @property
  autoPlay: boolean = true;

  @property
  cloudSpeed: number = 5;  // 像素/秒

  // 故事片段配置
  private readonly STORY_SEGMENTS: StorySegment[] = [
    {
      name: 'sleep_together',
      duration: 15,
      catAnimation: 'sleep',
      dogAnimation: 'idle',
      catPosition: new Vec3(-100, 0, 0),
      dogPosition: new Vec3(100, 0, 0),
      catFlip: false,
      dogFlip: true
    },
    {
      name: 'chase_butterfly',
      duration: 12,
      catAnimation: 'play',
      dogAnimation: 'sit',
      catPosition: new Vec3(-150, 0, 0),
      dogPosition: new Vec3(150, 0, 0),
      catFlip: false,
      dogFlip: true
    },
    {
      name: 'sunset_walk',
      duration: 10,
      catAnimation: 'walk',
      dogAnimation: 'walk',
      catPosition: new Vec3(-80, 0, 0),
      dogPosition: new Vec3(80, 0, 0),
      catFlip: false,
      dogFlip: false
    },
    {
      name: 'curious_dig',
      duration: 12,
      catAnimation: 'idle',
      dogAnimation: 'play',
      catPosition: new Vec3(50, 0, 0),
      dogPosition: new Vec3(-80, 0, 0),
      catFlip: true,
      dogFlip: false
    },
    {
      name: 'rest_under_tree',
      duration: 15,
      catAnimation: 'sleep',
      dogAnimation: 'sit',
      catPosition: new Vec3(-60, 0, 0),
      dogPosition: new Vec3(80, 0, 0),
      catFlip: false,
      dogFlip: true
    }
  ];

  private currentSegmentIndex: number = 0;
  private segmentTimer: number = 0;
  private isPlaying: boolean = false;

  onLoad() {
    this.initializeAnimations();
  }

  start() {
    if (this.autoPlay) {
      this.play();
    }
  }

  update(dt: number) {
    if (this.isPlaying) {
      // 更新故事片段计时
      this.segmentTimer += dt;
      const currentSegment = this.STORY_SEGMENTS[this.currentSegmentIndex];

      if (this.segmentTimer >= currentSegment.duration) {
        this.nextSegment();
      }

      // 更新云朵移动
      this.updateClouds(dt);

      // 更新光效呼吸
      this.updateSunlight(dt);
    }
  }

  // ============================================
  // 公共方法
  // ============================================

  /**
   * 开始播放动画
   */
  play() {
    this.isPlaying = true;
    this.playSegment(this.currentSegmentIndex);
    this.startParticles();
  }

  /**
   * 暂停动画
   */
  pause() {
    this.isPlaying = false;
    this.pauseSpines();
    this.stopParticles();
  }

  /**
   * 恢复动画
   */
  resume() {
    this.isPlaying = true;
    this.resumeSpines();
    this.startParticles();
  }

  /**
   * 跳转到指定片段
   */
  jumpToSegment(index: number) {
    if (index >= 0 && index < this.STORY_SEGMENTS.length) {
      this.currentSegmentIndex = index;
      this.segmentTimer = 0;
      this.playSegment(index);
    }
  }

  /**
   * 触发特殊动画（游戏事件响应）
   */
  triggerReaction(event: 'win' | 'lose' | 'combo' | 'start') {
    switch (event) {
      case 'win':
        this.playCatAnimation('play');
        this.playDogAnimation('bark');
        break;
      case 'lose':
        this.playCatAnimation('idle');
        this.playDogAnimation('sit');
        break;
      case 'combo':
        // 短暂的兴奋反应
        this.playCatAnimation('play');
        this.scheduleOnce(() => {
          this.playCurrentSegment();
        }, 1.5);
        break;
      case 'start':
        this.playDogAnimation('bark');
        this.scheduleOnce(() => {
          this.playCurrentSegment();
        }, 2);
        break;
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  private initializeAnimations() {
    // 确保 Spine 组件存在
    if (!this.catSpine || !this.dogSpine) {
      console.warn('[StoryAnimationController] Spine components not assigned');
      return;
    }

    // 设置默认动画
    this.catSpine.setAnimation(0, 'idle', true);
    this.dogSpine.setAnimation(0, 'idle', true);

    // 初始化粒子（暂停状态）
    if (this.leavesParticle) {
      this.leavesParticle.resetSystem();
    }
    if (this.firefliesParticle) {
      this.firefliesParticle.resetSystem();
    }
  }

  private playSegment(index: number) {
    const segment = this.STORY_SEGMENTS[index];
    this.segmentTimer = 0;

    // 移动角色到指定位置（带缓动）
    this.moveCharacter(this.catSpine.node, segment.catPosition, segment.catFlip);
    this.moveCharacter(this.dogSpine.node, segment.dogPosition, segment.dogFlip);

    // 播放对应动画
    this.scheduleOnce(() => {
      this.playCatAnimation(segment.catAnimation);
      this.playDogAnimation(segment.dogAnimation);
    }, 0.5);

    console.log(`[StoryAnimation] Playing segment: ${segment.name}`);
  }

  private nextSegment() {
    this.currentSegmentIndex = (this.currentSegmentIndex + 1) % this.STORY_SEGMENTS.length;
    this.playSegment(this.currentSegmentIndex);
  }

  private playCurrentSegment() {
    const segment = this.STORY_SEGMENTS[this.currentSegmentIndex];
    this.playCatAnimation(segment.catAnimation);
    this.playDogAnimation(segment.dogAnimation);
  }

  private moveCharacter(node: Node, targetPos: Vec3, flip: boolean) {
    // 翻转
    const scaleX = flip ? -1 : 1;

    tween(node)
      .to(1, {
        position: targetPos,
        scale: new Vec3(scaleX, 1, 1)
      }, { easing: 'sineInOut' })
      .start();
  }

  private playCatAnimation(animName: string) {
    if (this.catSpine) {
      try {
        this.catSpine.setAnimation(0, animName, true);
      } catch {
        // 动画不存在时使用 idle
        this.catSpine.setAnimation(0, 'idle', true);
      }
    }
  }

  private playDogAnimation(animName: string) {
    if (this.dogSpine) {
      try {
        this.dogSpine.setAnimation(0, animName, true);
      } catch {
        this.dogSpine.setAnimation(0, 'idle', true);
      }
    }
  }

  private pauseSpines() {
    if (this.catSpine) this.catSpine.paused = true;
    if (this.dogSpine) this.dogSpine.paused = true;
  }

  private resumeSpines() {
    if (this.catSpine) this.catSpine.paused = false;
    if (this.dogSpine) this.dogSpine.paused = false;
  }

  private startParticles() {
    if (this.leavesParticle) {
      this.leavesParticle.resetSystem();
    }
    if (this.firefliesParticle) {
      this.firefliesParticle.resetSystem();
    }
  }

  private stopParticles() {
    if (this.leavesParticle) {
      this.leavesParticle.stopSystem();
    }
    if (this.firefliesParticle) {
      this.firefliesParticle.stopSystem();
    }
  }

  private updateClouds(dt: number) {
    if (!this.cloudsNode) return;

    // 缓慢向左移动
    const pos = this.cloudsNode.position;
    let newX = pos.x - this.cloudSpeed * dt;

    // 循环
    if (newX < -600) {
      newX = 600;
    }

    this.cloudsNode.setPosition(newX, pos.y, pos.z);
  }

  private sunlightPhase: number = 0;
  private updateSunlight(dt: number) {
    if (!this.sunlightOverlay) return;

    // 柔和呼吸效果
    this.sunlightPhase += dt * 0.5;
    const alpha = 30 + Math.sin(this.sunlightPhase) * 15;

    const color = this.sunlightOverlay.color;
    this.sunlightOverlay.color = new Color(
      color.r, color.g, color.b, Math.round(alpha)
    );
  }
}
