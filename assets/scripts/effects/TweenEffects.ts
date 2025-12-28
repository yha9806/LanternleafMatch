import {
  _decorator, Node, Vec3, Color, tween, Tween,
  Sprite, UIOpacity, UITransform
} from 'cc';

const { ccclass } = _decorator;

/**
 * 缓动函数类型
 */
export type EasingType =
  | 'linear'
  | 'sineIn' | 'sineOut' | 'sineInOut'
  | 'quadIn' | 'quadOut' | 'quadInOut'
  | 'cubicIn' | 'cubicOut' | 'cubicInOut'
  | 'quartIn' | 'quartOut' | 'quartInOut'
  | 'backIn' | 'backOut' | 'backInOut'
  | 'bounceIn' | 'bounceOut' | 'bounceInOut'
  | 'elasticIn' | 'elasticOut' | 'elasticInOut';

/**
 * 动画配置
 */
export interface TweenConfig {
  duration: number;
  easing?: EasingType;
  delay?: number;
}

/**
 * 抖动配置
 */
export interface ShakeConfig {
  intensity: number;  // 抖动强度 (像素)
  duration: number;   // 持续时间 (秒)
  frequency: number;  // 频率 (次/秒)
  decay?: boolean;    // 是否衰减
}

/**
 * 弹跳配置
 */
export interface BounceConfig {
  height: number;     // 弹跳高度
  bounces: number;    // 弹跳次数
  duration: number;   // 总时长
}

/**
 * TweenEffects - 缓动动画工具类
 * 提供丰富的动画效果用于 "Game Juice"
 */
@ccclass('TweenEffects')
export class TweenEffects {
  // ============================================
  // 基础动画
  // ============================================

  /**
   * 移动到指定位置
   */
  static moveTo(node: Node, target: Vec3, config: TweenConfig): Promise<void> {
    return new Promise(resolve => {
      tween(node)
        .delay(config.delay || 0)
        .to(config.duration, { position: target }, { easing: config.easing || 'sineOut' })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 缩放动画
   */
  static scaleTo(node: Node, scale: number | Vec3, config: TweenConfig): Promise<void> {
    const targetScale = typeof scale === 'number' ? new Vec3(scale, scale, 1) : scale;
    return new Promise(resolve => {
      tween(node)
        .delay(config.delay || 0)
        .to(config.duration, { scale: targetScale }, { easing: config.easing || 'sineOut' })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 旋转动画
   */
  static rotateTo(node: Node, angle: number, config: TweenConfig): Promise<void> {
    return new Promise(resolve => {
      tween(node)
        .delay(config.delay || 0)
        .to(config.duration, { eulerAngles: new Vec3(0, 0, angle) }, { easing: config.easing || 'sineOut' })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 透明度动画
   */
  static fadeTo(node: Node, opacity: number, config: TweenConfig): Promise<void> {
    return new Promise(resolve => {
      let uiOpacity = node.getComponent(UIOpacity);
      if (!uiOpacity) {
        uiOpacity = node.addComponent(UIOpacity);
      }
      tween(uiOpacity)
        .delay(config.delay || 0)
        .to(config.duration, { opacity: opacity * 255 }, { easing: config.easing || 'sineOut' })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 颜色动画
   */
  static colorTo(node: Node, color: Color, config: TweenConfig): Promise<void> {
    return new Promise(resolve => {
      const sprite = node.getComponent(Sprite);
      if (!sprite) {
        resolve();
        return;
      }

      const startColor = sprite.color.clone();
      tween(node)
        .delay(config.delay || 0)
        .to(config.duration, {}, {
          easing: config.easing || 'sineOut',
          onUpdate: (_, ratio) => {
            const r = ratio || 0;
            sprite.color = new Color(
              startColor.r + (color.r - startColor.r) * r,
              startColor.g + (color.g - startColor.g) * r,
              startColor.b + (color.b - startColor.b) * r,
              startColor.a + (color.a - startColor.a) * r
            );
          }
        })
        .call(() => resolve())
        .start();
    });
  }

  // ============================================
  // 复合动画
  // ============================================

  /**
   * 弹性缩放 (从小变大带回弹)
   */
  static popIn(node: Node, duration: number = 0.3): Promise<void> {
    node.setScale(new Vec3(0, 0, 1));
    return new Promise(resolve => {
      tween(node)
        .to(duration, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 弹性消失 (从大变小)
   */
  static popOut(node: Node, duration: number = 0.2): Promise<void> {
    return new Promise(resolve => {
      tween(node)
        .to(duration, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 脉冲动画 (放大缩小循环)
   */
  static pulse(node: Node, scale: number = 1.2, duration: number = 0.3, times: number = 1): Promise<void> {
    const originalScale = node.scale.clone();
    return new Promise(resolve => {
      tween(node)
        .to(duration / 2, { scale: new Vec3(scale, scale, 1) }, { easing: 'sineOut' })
        .to(duration / 2, { scale: originalScale }, { easing: 'sineIn' })
        .union()
        .repeat(times)
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 心跳动画 (快速放大后慢慢缩小)
   */
  static heartbeat(node: Node, scale: number = 1.15, duration: number = 0.4): Promise<void> {
    const originalScale = node.scale.clone();
    return new Promise(resolve => {
      tween(node)
        .to(duration * 0.2, { scale: new Vec3(scale, scale, 1) }, { easing: 'quadOut' })
        .to(duration * 0.15, { scale: new Vec3(scale * 0.95, scale * 0.95, 1) }, { easing: 'quadIn' })
        .to(duration * 0.2, { scale: new Vec3(scale * 1.05, scale * 1.05, 1) }, { easing: 'quadOut' })
        .to(duration * 0.45, { scale: originalScale }, { easing: 'quadIn' })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 抖动动画
   */
  static shake(node: Node, config: ShakeConfig): Promise<void> {
    const originalPos = node.position.clone();
    const steps = Math.floor(config.frequency * config.duration);
    const stepDuration = config.duration / steps;

    return new Promise(resolve => {
      let t = tween(node);

      for (let i = 0; i < steps; i++) {
        const progress = i / steps;
        const intensity = config.decay ? config.intensity * (1 - progress) : config.intensity;

        const offsetX = (Math.random() - 0.5) * 2 * intensity;
        const offsetY = (Math.random() - 0.5) * 2 * intensity;

        t = t.to(stepDuration, {
          position: new Vec3(
            originalPos.x + offsetX,
            originalPos.y + offsetY,
            originalPos.z
          )
        });
      }

      t.to(stepDuration, { position: originalPos })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 弹跳落下动画
   */
  static bounceDrop(node: Node, config: BounceConfig): Promise<void> {
    const startPos = node.position.clone();
    const groundY = startPos.y;

    return new Promise(resolve => {
      let t = tween(node);
      let currentHeight = config.height;
      const baseDuration = config.duration / (config.bounces * 2 + 1);

      // 初始下落
      node.setPosition(new Vec3(startPos.x, startPos.y + config.height, startPos.z));
      t = t.to(baseDuration, { position: new Vec3(startPos.x, groundY, startPos.z) }, { easing: 'quadIn' });

      // 弹跳
      for (let i = 0; i < config.bounces; i++) {
        currentHeight *= 0.5;
        const bounceDuration = baseDuration * Math.pow(0.7, i);

        t = t.to(bounceDuration, {
          position: new Vec3(startPos.x, groundY + currentHeight, startPos.z)
        }, { easing: 'quadOut' });

        t = t.to(bounceDuration, {
          position: new Vec3(startPos.x, groundY, startPos.z)
        }, { easing: 'quadIn' });
      }

      t.call(() => resolve()).start();
    });
  }

  /**
   * 摇晃动画 (左右摇摆)
   */
  static wobble(node: Node, angle: number = 10, duration: number = 0.5, times: number = 2): Promise<void> {
    return new Promise(resolve => {
      tween(node)
        .to(duration / 4, { eulerAngles: new Vec3(0, 0, angle) }, { easing: 'sineOut' })
        .to(duration / 2, { eulerAngles: new Vec3(0, 0, -angle) }, { easing: 'sineInOut' })
        .to(duration / 4, { eulerAngles: new Vec3(0, 0, 0) }, { easing: 'sineIn' })
        .union()
        .repeat(times)
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 闪烁动画
   */
  static blink(node: Node, times: number = 3, duration: number = 0.3): Promise<void> {
    let uiOpacity = node.getComponent(UIOpacity);
    if (!uiOpacity) {
      uiOpacity = node.addComponent(UIOpacity);
    }

    return new Promise(resolve => {
      tween(uiOpacity)
        .to(duration / 2, { opacity: 100 })
        .to(duration / 2, { opacity: 255 })
        .union()
        .repeat(times)
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 飘字效果 (向上飘动并消失)
   */
  static floatUp(node: Node, height: number = 100, duration: number = 0.8): Promise<void> {
    const startPos = node.position.clone();
    let uiOpacity = node.getComponent(UIOpacity);
    if (!uiOpacity) {
      uiOpacity = node.addComponent(UIOpacity);
    }

    return new Promise(resolve => {
      tween(node)
        .to(duration, {
          position: new Vec3(startPos.x, startPos.y + height, startPos.z)
        }, { easing: 'quadOut' })
        .start();

      tween(uiOpacity)
        .delay(duration * 0.5)
        .to(duration * 0.5, { opacity: 0 })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 弹簧效果 (弹性伸缩)
   */
  static spring(node: Node, targetScale: number = 1, duration: number = 0.5): Promise<void> {
    return new Promise(resolve => {
      tween(node)
        .to(duration, { scale: new Vec3(targetScale, targetScale, 1) }, { easing: 'elasticOut' })
        .call(() => resolve())
        .start();
    });
  }

  // ============================================
  // 游戏专用动画
  // ============================================

  /**
   * 消除爆炸效果 (缩放+旋转+消失)
   */
  static matchExplosion(node: Node, duration: number = 0.25): Promise<void> {
    return new Promise(resolve => {
      tween(node)
        .to(duration * 0.4, {
          scale: new Vec3(1.3, 1.3, 1),
          eulerAngles: new Vec3(0, 0, 15)
        }, { easing: 'quadOut' })
        .to(duration * 0.6, {
          scale: new Vec3(0, 0, 1),
          eulerAngles: new Vec3(0, 0, 45)
        }, { easing: 'quadIn' })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 特殊块激活效果
   */
  static specialActivate(node: Node, duration: number = 0.4): Promise<void> {
    return new Promise(resolve => {
      // 先闪白
      const sprite = node.getComponent(Sprite);
      if (sprite) {
        const originalColor = sprite.color.clone();
        sprite.color = new Color(255, 255, 255, 255);

        tween(node)
          .to(0.1, {}, {
            onUpdate: () => {
              sprite.color = originalColor;
            }
          })
          .start();
      }

      // 放大并旋转
      tween(node)
        .to(duration * 0.3, {
          scale: new Vec3(1.5, 1.5, 1),
          eulerAngles: new Vec3(0, 0, 180)
        }, { easing: 'quadOut' })
        .to(duration * 0.7, {
          scale: new Vec3(0, 0, 1),
          eulerAngles: new Vec3(0, 0, 360)
        }, { easing: 'quadIn' })
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 连消强化效果 (根据连消次数增强)
   */
  static comboEnhance(node: Node, comboCount: number): Promise<void> {
    const intensity = Math.min(comboCount * 0.1, 0.5); // 最大50%增强
    const scale = 1 + intensity;

    return this.pulse(node, scale, 0.2 + comboCount * 0.05, 1);
  }

  /**
   * 目标物飞向UI
   */
  static flyToTarget(node: Node, targetPos: Vec3, duration: number = 0.5): Promise<void> {
    const startPos = node.position.clone();
    const startScale = node.scale.clone();

    // 贝塞尔曲线控制点
    const controlPoint = new Vec3(
      (startPos.x + targetPos.x) / 2,
      Math.max(startPos.y, targetPos.y) + 100,
      0
    );

    return new Promise(resolve => {
      tween(node)
        .to(duration, {}, {
          easing: 'quadIn',
          onUpdate: (_, ratio) => {
            const t = ratio || 0;
            // 二次贝塞尔曲线
            const x = (1 - t) * (1 - t) * startPos.x + 2 * (1 - t) * t * controlPoint.x + t * t * targetPos.x;
            const y = (1 - t) * (1 - t) * startPos.y + 2 * (1 - t) * t * controlPoint.y + t * t * targetPos.y;
            node.setPosition(new Vec3(x, y, 0));

            // 缩小
            const scale = 1 - t * 0.5;
            node.setScale(new Vec3(startScale.x * scale, startScale.y * scale, 1));
          }
        })
        .call(() => resolve())
        .start();
    });
  }

  // ============================================
  // 工具方法
  // ============================================

  /**
   * 停止节点所有动画
   */
  static stopAll(node: Node) {
    Tween.stopAllByTarget(node);
  }

  /**
   * 延迟执行
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 并行执行多个动画
   */
  static parallel(...animations: Promise<void>[]): Promise<void[]> {
    return Promise.all(animations);
  }

  /**
   * 顺序执行多个动画
   */
  static async sequence(...animations: (() => Promise<void>)[]): Promise<void> {
    for (const anim of animations) {
      await anim();
    }
  }
}
