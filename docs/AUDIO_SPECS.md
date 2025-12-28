# 音效资源规格

## 文件格式要求
- 格式：MP3 (128kbps) 或 OGG
- 采样率：44100Hz
- 声道：单声道 (Mono) - 减小文件大小
- 响度：-14 LUFS (适合手机扬声器)

## 游戏音效 (SFX)

| 文件名 | 时长 | 描述 | 风格 |
|--------|------|------|------|
| `sfx_select.mp3` | 0.1s | 选中方块 | 轻柔点击，木质/软质触感 |
| `sfx_swap.mp3` | 0.15s | 交换成功 | 柔和滑动，像树叶摩擦 |
| `sfx_swap_invalid.mp3` | 0.2s | 交换失败 | 低沉短促，轻微挫败感 |
| `sfx_match_3.mp3` | 0.3s | 3连消除 | 清脆消除，轻快 |
| `sfx_match_4.mp3` | 0.35s | 4连消除 | 更明亮，带尾音 |
| `sfx_match_5.mp3` | 0.4s | 5连消除 | 华丽，多层音效 |
| `sfx_combo.mp3` | 0.25s | 连消 | 递进式，可变音调 |
| `sfx_moss_clear.mp3` | 0.3s | 苔藓清除 | 露珠破裂/水滴音 |
| `sfx_special_create.mp3` | 0.4s | 特殊块生成 | 魔法音效，神秘感 |
| `sfx_special_trigger.mp3` | 0.5s | 特殊块触发 | 柔和版爆炸，有力但不刺耳 |
| `sfx_shuffle.mp3` | 0.5s | 洗牌 | 卡牌洗动，多层叠加 |
| `sfx_win.mp3` | 2-3s | 通关 | 欢快庆祝，温暖感 |
| `sfx_lose.mp3` | 1.5s | 失败 | 温和遗憾，不沮丧 |
| `sfx_button.mp3` | 0.1s | UI按钮 | 轻快点击 |
| `sfx_collect.mp3` | 0.2s | 收集目标 | 叮当声，成就感 |

## 角色音效 (可选)

| 文件名 | 时长 | 描述 |
|--------|------|------|
| `cat_meow.mp3` | 0.5s | 猫叫 - 通关时偶尔触发 |
| `dog_bark.mp3` | 0.5s | 狗叫 - 开始关卡时偶尔触发 |

## 背景音乐 / 白噪音 (BGM)

| 文件名 | 时长 | 描述 | 状态 |
|--------|------|------|------|
| `forest_ambience.mp3` | 60s+ | 森林环境音 | ✅ 已有 |
| `grass_wind.mp3` | 30s+ | 草丛风声 | ✅ 已有 |
| `stream.mp3` | 45s+ | 溪流声 | ✅ 已有 |

## 吉卜力风格音效特点

1. **自然感**: 避免电子合成音，偏向自然/木质/有机音色
2. **温暖柔和**: 避免尖锐高频，中低频为主
3. **不突兀**: 音量过渡平滑，不会吓到玩家
4. **一致性**: 所有音效共享相似的混响和空间感

## 推荐音效资源

### 免费资源
- [Freesound.org](https://freesound.org) - CC协议音效库
- [OpenGameArt.org](https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=13) - 游戏音效
- [Kenney Assets](https://kenney.nl/assets?q=audio) - 免费游戏资源

### 商业资源
- [Epidemic Sound](https://www.epidemicsound.com) - 订阅制
- [AudioJungle](https://audiojungle.net) - 单次购买

### 音效生成工具
- [SFXR](https://sfxr.me/) - 8bit风格（不太适合本项目）
- [ChipTone](https://sfbgames.itch.io/chiptone) - 复古音效
- [Audacity](https://www.audacityteam.org/) - 音频编辑

## 音效制作脚本 (Node.js)

如果需要快速生成占位音效用于开发测试：

```bash
npm install tone
```

```javascript
// scripts/generate-placeholder-sfx.js
const Tone = require('tone');
const fs = require('fs');

// 生成简单的正弦波音效
async function generateTone(filename, frequency, duration) {
  // 需要更复杂的实现...
}
```

## 当前缺失文件

```
assets/resources/audio/sfx/
├── sfx_select.mp3         ❌ 缺失
├── sfx_swap.mp3           ❌ 缺失
├── sfx_swap_invalid.mp3   ❌ 缺失
├── sfx_match_3.mp3        ❌ 缺失
├── sfx_match_4.mp3        ❌ 缺失
├── sfx_match_5.mp3        ❌ 缺失
├── sfx_combo.mp3          ❌ 缺失
├── sfx_moss_clear.mp3     ❌ 缺失
├── sfx_special_create.mp3 ❌ 缺失
├── sfx_special_trigger.mp3 ❌ 缺失
├── sfx_shuffle.mp3        ❌ 缺失
├── sfx_win.mp3            ❌ 缺失
├── sfx_lose.mp3           ❌ 缺失
├── sfx_button.mp3         ❌ 缺失
└── sfx_collect.mp3        ❌ 缺失
```

## 下一步

1. 从 Freesound/OpenGameArt 搜索合适音效
2. 使用 Audacity 调整音量和格式
3. 放入 `assets/resources/audio/sfx/` 目录
4. 在 Cocos Creator 中设置为 AudioClip
