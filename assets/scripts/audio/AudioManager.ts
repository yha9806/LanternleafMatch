import {
  _decorator, Component, AudioSource, AudioClip, resources, director
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * 音频管理器（单例）
 * 管理背景音乐、白噪音、游戏音效
 */
@ccclass('AudioManager')
export class AudioManager extends Component {
  private static _instance: AudioManager | null = null;

  @property({ type: AudioSource })
  bgmSource: AudioSource = null!;

  @property({ type: AudioSource })
  sfxSource: AudioSource = null!;

  @property({ range: [0, 1], slide: true })
  bgmVolume: number = 0.5;

  @property({ range: [0, 1], slide: true })
  sfxVolume: number = 0.8;

  @property
  muteBGM: boolean = false;

  @property
  muteSFX: boolean = false;

  // 音效缓存
  private sfxCache: Map<string, AudioClip> = new Map();
  private bgmCache: Map<string, AudioClip> = new Map();

  // 预加载的音效列表
  private readonly SFX_LIST = [
    'sfx_select',
    'sfx_swap',
    'sfx_invalid',
    'sfx_match_3',
    'sfx_match_4',
    'sfx_match_5',
    'sfx_combo',
    'sfx_moss_clear',
    'sfx_special_create',
    'sfx_special_trigger',
    'sfx_shuffle',
    'sfx_win',
    'sfx_lose',
    'sfx_button'
  ];

  // 背景音列表
  private readonly BGM_LIST = [
    'forest_ambience',
    'grass_wind',
    'stream'
  ];

  static getInstance(): AudioManager | null {
    return AudioManager._instance;
  }

  onLoad() {
    // 单例模式
    if (AudioManager._instance && AudioManager._instance !== this) {
      this.destroy();
      return;
    }
    AudioManager._instance = this;

    // 跨场景保留
    director.addPersistRootNode(this.node);

    // 初始化音源
    this.initAudioSources();

    // 预加载音频
    this.preloadAudio();
  }

  onDestroy() {
    if (AudioManager._instance === this) {
      AudioManager._instance = null;
    }
  }

  // ============================================
  // 背景音乐/白噪音
  // ============================================

  /**
   * 播放背景音乐（循环）
   * @param name 音频名称（不带路径和扩展名）
   * @param fadeIn 淡入时间（秒）
   */
  playBGM(name: string, fadeIn: number = 1) {
    if (this.muteBGM) return;

    const clip = this.bgmCache.get(name);
    if (clip) {
      this.bgmSource.clip = clip;
      this.bgmSource.loop = true;
      this.bgmSource.volume = 0;
      this.bgmSource.play();

      // 淡入效果
      this.fadeVolume(this.bgmSource, this.bgmVolume, fadeIn);
    } else {
      // 尝试动态加载
      this.loadAndPlayBGM(name, fadeIn);
    }
  }

  /**
   * 停止背景音乐
   * @param fadeOut 淡出时间（秒）
   */
  stopBGM(fadeOut: number = 0.5) {
    if (fadeOut > 0) {
      this.fadeVolume(this.bgmSource, 0, fadeOut, () => {
        this.bgmSource.stop();
      });
    } else {
      this.bgmSource.stop();
    }
  }

  /**
   * 暂停背景音乐
   */
  pauseBGM() {
    this.bgmSource.pause();
  }

  /**
   * 恢复背景音乐
   */
  resumeBGM() {
    if (!this.muteBGM) {
      this.bgmSource.play();
    }
  }

  /**
   * 设置背景音量
   */
  setBGMVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (!this.muteBGM) {
      this.bgmSource.volume = this.bgmVolume;
    }
  }

  // ============================================
  // 游戏音效
  // ============================================

  /**
   * 播放音效（一次性）
   * @param name 音效名称
   */
  playSFX(name: string) {
    if (this.muteSFX) return;

    const clip = this.sfxCache.get(name);
    if (clip) {
      this.sfxSource.playOneShot(clip, this.sfxVolume);
    } else {
      // 尝试动态加载
      this.loadAndPlaySFX(name);
    }
  }

  /**
   * 播放消除音效（根据消除数量）
   */
  playMatchSFX(matchLength: number) {
    if (matchLength >= 5) {
      this.playSFX('sfx_match_5');
    } else if (matchLength === 4) {
      this.playSFX('sfx_match_4');
    } else {
      this.playSFX('sfx_match_3');
    }
  }

  /**
   * 播放连消音效
   * @param comboCount 连消次数
   */
  playComboSFX(comboCount: number) {
    if (comboCount > 1) {
      this.playSFX('sfx_combo');
      // 可以根据 comboCount 调整音调（需要额外实现）
    }
  }

  /**
   * 设置音效音量
   */
  setSFXVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  // ============================================
  // 全局控制
  // ============================================

  /**
   * 静音/取消静音背景音乐
   */
  toggleBGMMute(muted?: boolean) {
    this.muteBGM = muted !== undefined ? muted : !this.muteBGM;
    if (this.muteBGM) {
      this.bgmSource.volume = 0;
    } else {
      this.bgmSource.volume = this.bgmVolume;
    }
  }

  /**
   * 静音/取消静音音效
   */
  toggleSFXMute(muted?: boolean) {
    this.muteSFX = muted !== undefined ? muted : !this.muteSFX;
  }

  /**
   * 全部静音
   */
  muteAll(muted: boolean) {
    this.toggleBGMMute(muted);
    this.toggleSFXMute(muted);
  }

  /**
   * 保存音频设置
   */
  saveSettings() {
    const settings = {
      bgmVolume: this.bgmVolume,
      sfxVolume: this.sfxVolume,
      muteBGM: this.muteBGM,
      muteSFX: this.muteSFX
    };
    localStorage.setItem('lanternleaf_audio', JSON.stringify(settings));
  }

  /**
   * 加载音频设置
   */
  loadSettings() {
    const saved = localStorage.getItem('lanternleaf_audio');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.bgmVolume = settings.bgmVolume ?? 0.5;
        this.sfxVolume = settings.sfxVolume ?? 0.8;
        this.muteBGM = settings.muteBGM ?? false;
        this.muteSFX = settings.muteSFX ?? false;
      } catch {
        // 使用默认值
      }
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  private initAudioSources() {
    // 如果没有设置音源，自动创建
    if (!this.bgmSource) {
      this.bgmSource = this.node.addComponent(AudioSource);
      this.bgmSource.loop = true;
      this.bgmSource.playOnAwake = false;
    }
    if (!this.sfxSource) {
      this.sfxSource = this.node.addComponent(AudioSource);
      this.sfxSource.loop = false;
      this.sfxSource.playOnAwake = false;
    }

    // 加载设置
    this.loadSettings();

    // 应用音量
    this.bgmSource.volume = this.muteBGM ? 0 : this.bgmVolume;
  }

  private preloadAudio() {
    // 预加载音效
    for (const name of this.SFX_LIST) {
      resources.load(`audio/sfx/${name}`, AudioClip, (err, clip) => {
        if (!err && clip) {
          this.sfxCache.set(name, clip);
        }
      });
    }

    // 预加载背景音乐
    for (const name of this.BGM_LIST) {
      resources.load(`audio/bgm/${name}`, AudioClip, (err, clip) => {
        if (!err && clip) {
          this.bgmCache.set(name, clip);
        }
      });
    }
  }

  private loadAndPlayBGM(name: string, fadeIn: number) {
    resources.load(`audio/bgm/${name}`, AudioClip, (err, clip) => {
      if (!err && clip) {
        this.bgmCache.set(name, clip);
        this.bgmSource.clip = clip;
        this.bgmSource.loop = true;
        this.bgmSource.volume = 0;
        this.bgmSource.play();
        this.fadeVolume(this.bgmSource, this.bgmVolume, fadeIn);
      } else {
        console.warn(`[AudioManager] BGM not found: ${name}`);
      }
    });
  }

  private loadAndPlaySFX(name: string) {
    resources.load(`audio/sfx/${name}`, AudioClip, (err, clip) => {
      if (!err && clip) {
        this.sfxCache.set(name, clip);
        this.sfxSource.playOneShot(clip, this.sfxVolume);
      } else {
        console.warn(`[AudioManager] SFX not found: ${name}`);
      }
    });
  }

  private fadeVolume(
    source: AudioSource,
    targetVolume: number,
    duration: number,
    onComplete?: () => void
  ) {
    const startVolume = source.volume;
    const startTime = Date.now();
    const durationMs = duration * 1000;

    const update = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      source.volume = startVolume + (targetVolume - startVolume) * progress;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        onComplete?.();
      }
    };

    update();
  }
}

// 全局访问函数
export function getAudioManager(): AudioManager | null {
  return AudioManager.getInstance();
}
