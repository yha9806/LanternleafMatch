/**
 * 迷你游戏单元测试
 * - RescueMiniGame
 * - ColorSortMiniGame
 * - TreasureHuntMiniGame
 * - MiniGameManager
 */

import {
  RescueMiniGame,
  createRescueMiniGame,
  getAllRescueScenarios,
} from '../../assets/scripts/minigames/RescueMiniGame';

import {
  ColorSortMiniGame,
  createColorSortMiniGame,
  getRecommendedDifficulty,
} from '../../assets/scripts/minigames/ColorSortMiniGame';

import {
  TreasureHuntMiniGame,
  createTreasureHuntMiniGame,
  getTreasureHuntConfigForLevel,
} from '../../assets/scripts/minigames/TreasureHuntMiniGame';

import {
  MiniGameManager,
  createMiniGameManager,
  resetMiniGameManager,
} from '../../assets/scripts/minigames/MiniGameManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock setInterval/clearInterval
jest.useFakeTimers();

// ============================================
// RescueMiniGame Tests
// ============================================
describe('RescueMiniGame', () => {
  describe('初始化', () => {
    test('创建随机场景', () => {
      const game = createRescueMiniGame();
      const scenario = game.getScenario();

      expect(scenario).toBeDefined();
      expect(scenario.id).toBeDefined();
      expect(scenario.options.length).toBeGreaterThanOrEqual(3);
    });

    test('创建指定场景', () => {
      const game = createRescueMiniGame('cat_tree');
      const scenario = game.getScenario();

      expect(scenario.id).toBe('cat_tree');
    });

    test('初始状态为 idle', () => {
      const game = createRescueMiniGame();
      expect(game.getState()).toBe('idle');
    });
  });

  describe('getAllRescueScenarios', () => {
    test('返回所有场景', () => {
      const scenarios = getAllRescueScenarios();
      expect(scenarios.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('start', () => {
    test('开始游戏改变状态', () => {
      const game = createRescueMiniGame();
      game.start();

      expect(game.getState()).toBe('playing');
    });

    test('开始后时间为10秒', () => {
      const game = createRescueMiniGame();
      game.start();

      expect(game.getTimeRemaining()).toBe(10);
    });

    test('重复开始无效', () => {
      const game = createRescueMiniGame();
      game.start();
      game.start();

      expect(game.getState()).toBe('playing');
    });
  });

  describe('selectOption', () => {
    test('选择正确选项成功', () => {
      const game = createRescueMiniGame('cat_tree');
      game.start();

      const scenario = game.getScenario();
      const result = game.selectOption(scenario.correctOptionIndex);

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(game.getState()).toBe('success');
    });

    test('选择错误选项失败', () => {
      const game = createRescueMiniGame('cat_tree');
      game.start();

      const scenario = game.getScenario();
      const wrongIndex = (scenario.correctOptionIndex + 1) % scenario.options.length;
      const result = game.selectOption(wrongIndex);

      expect(result).not.toBeNull();
      expect(result!.success).toBe(false);
      expect(game.getState()).toBe('fail');
    });

    test('游戏未开始时选择无效', () => {
      const game = createRescueMiniGame();
      const result = game.selectOption(0);

      expect(result).toBeNull();
    });

    test('返回正确的奖励', () => {
      const game = createRescueMiniGame('cat_tree');
      game.start();

      const scenario = game.getScenario();
      const result = game.selectOption(scenario.correctOptionIndex);

      expect(result!.reward.coins).toBeGreaterThan(0);
    });
  });

  describe('超时', () => {
    test('时间耗尽触发超时', () => {
      const game = createRescueMiniGame();
      const events: string[] = [];

      game.onEvent((e) => events.push(e.type));
      game.start();

      // 快进11秒
      jest.advanceTimersByTime(11000);

      expect(events).toContain('timeout');
      expect(game.getState()).toBe('timeout');
    });
  });

  describe('事件监听', () => {
    test('开始事件', () => {
      const game = createRescueMiniGame();
      const events: string[] = [];

      game.onEvent((e) => events.push(e.type));
      game.start();

      expect(events).toContain('start');
    });

    test('tick 事件', () => {
      const game = createRescueMiniGame();
      let tickCount = 0;

      game.onEvent((e) => {
        if (e.type === 'tick') tickCount++;
      });
      game.start();

      jest.advanceTimersByTime(3000);
      expect(tickCount).toBe(3);
    });
  });

  describe('destroy', () => {
    test('销毁清理定时器', () => {
      const game = createRescueMiniGame();
      game.start();
      game.destroy();

      // 快进后不应触发超时
      jest.advanceTimersByTime(20000);
      // 没有抛出错误即可
    });
  });
});

// ============================================
// ColorSortMiniGame Tests
// ============================================
describe('ColorSortMiniGame', () => {
  describe('初始化', () => {
    test('创建默认难度', () => {
      const game = createColorSortMiniGame();
      const config = game.getConfig();

      expect(config.difficulty).toBe('medium');
    });

    test('创建指定难度', () => {
      const game = createColorSortMiniGame('hard');
      const config = game.getConfig();

      expect(config.difficulty).toBe('hard');
    });

    test('初始状态为 idle', () => {
      const game = createColorSortMiniGame();
      expect(game.getState()).toBe('idle');
    });
  });

  describe('getRecommendedDifficulty', () => {
    test('低等级推荐简单', () => {
      expect(getRecommendedDifficulty(5)).toBe('easy');
    });

    test('中等级推荐中等', () => {
      expect(getRecommendedDifficulty(15)).toBe('medium');
    });

    test('高等级推荐困难', () => {
      expect(getRecommendedDifficulty(30)).toBe('hard');
    });
  });

  describe('getTargetOrder / getShuffledOrder', () => {
    test('目标顺序和打乱顺序长度相同', () => {
      const game = createColorSortMiniGame('easy');
      const target = game.getTargetOrder();
      const shuffled = game.getShuffledOrder();

      expect(target.length).toBe(shuffled.length);
    });

    test('打乱顺序与目标顺序不同', () => {
      const game = createColorSortMiniGame('medium');
      const target = game.getTargetOrder();
      const shuffled = game.getShuffledOrder();

      const targetIds = target.map(t => t.id).join(',');
      const shuffledIds = shuffled.map(s => s.id).join(',');

      expect(shuffledIds).not.toBe(targetIds);
    });
  });

  describe('start', () => {
    test('开始游戏', () => {
      const game = createColorSortMiniGame();
      game.start();

      expect(game.getState()).toBe('playing');
    });
  });

  describe('selectColor', () => {
    test('选择正确颜色', () => {
      const game = createColorSortMiniGame('easy');
      game.start();

      const target = game.getTargetOrder();
      const shuffled = game.getShuffledOrder();

      // 找到第一个目标颜色在打乱顺序中的位置
      const firstTargetId = target[0].id;
      const shuffledIndex = shuffled.findIndex(s => s.id === firstTargetId);

      const result = game.selectColor(shuffledIndex);
      expect(result).toBe('correct');
    });

    test('选择错误颜色', () => {
      const game = createColorSortMiniGame('easy');
      game.start();

      const target = game.getTargetOrder();
      const shuffled = game.getShuffledOrder();

      // 找到一个不是第一个目标的颜色
      const firstTargetId = target[0].id;
      const wrongIndex = shuffled.findIndex(s => s.id !== firstTargetId);

      if (wrongIndex >= 0) {
        const result = game.selectColor(wrongIndex);
        expect(result).toBe('wrong');
        expect(game.getMistakes()).toBe(1);
      }
    });

    test('已选择的不能再选', () => {
      const game = createColorSortMiniGame('easy');
      game.start();

      const target = game.getTargetOrder();
      const shuffled = game.getShuffledOrder();

      const firstTargetId = target[0].id;
      const shuffledIndex = shuffled.findIndex(s => s.id === firstTargetId);

      game.selectColor(shuffledIndex);
      const result = game.selectColor(shuffledIndex);

      expect(result).toBe('already_selected');
    });

    test('2次错误游戏结束', () => {
      const game = createColorSortMiniGame('easy');
      game.start();

      const target = game.getTargetOrder();
      const shuffled = game.getShuffledOrder();

      // 故意选错两次
      for (let i = 0; i < 2; i++) {
        const wrongIndex = shuffled.findIndex(s =>
          s.id !== target[game.getSelectedCount()].id && !game.isSelected(s.originalIndex)
        );
        if (wrongIndex >= 0) {
          game.selectColor(wrongIndex);
        }
      }

      expect(game.getState()).toBe('fail');
    });

    test('全部正确完成游戏', () => {
      const game = createColorSortMiniGame('easy');
      game.start();

      const target = game.getTargetOrder();
      const shuffled = game.getShuffledOrder();

      // 按正确顺序选择
      for (const t of target) {
        const idx = shuffled.findIndex(s => s.id === t.id);
        game.selectColor(idx);
      }

      expect(game.getState()).toBe('success');
    });
  });

  describe('isSelected', () => {
    test('检查是否已选', () => {
      const game = createColorSortMiniGame('easy');
      game.start();

      const target = game.getTargetOrder();
      const shuffled = game.getShuffledOrder();

      const firstTargetId = target[0].id;
      const shuffledIndex = shuffled.findIndex(s => s.id === firstTargetId);

      expect(game.isSelected(shuffledIndex)).toBe(false);
      game.selectColor(shuffledIndex);
      expect(game.isSelected(shuffledIndex)).toBe(true);
    });
  });
});

// ============================================
// TreasureHuntMiniGame Tests
// ============================================
describe('TreasureHuntMiniGame', () => {
  describe('初始化', () => {
    test('创建默认配置', () => {
      const game = createTreasureHuntMiniGame();
      expect(game.getShovelsRemaining()).toBe(5);
    });

    test('创建自定义配置', () => {
      const game = createTreasureHuntMiniGame({ shovels: 10 });
      expect(game.getShovelsRemaining()).toBe(10);
    });

    test('初始状态为 idle', () => {
      const game = createTreasureHuntMiniGame();
      expect(game.getState()).toBe('idle');
    });
  });

  describe('getTreasureHuntConfigForLevel', () => {
    test('新手更多铲子', () => {
      const config = getTreasureHuntConfigForLevel(5);
      expect(config.shovels).toBe(7);
    });

    test('高等级更少铲子', () => {
      const config = getTreasureHuntConfigForLevel(30);
      expect(config.shovels).toBe(4);
    });
  });

  describe('getVisibleMap', () => {
    test('返回5x5网格', () => {
      const game = createTreasureHuntMiniGame();
      const map = game.getVisibleMap();

      expect(map.length).toBe(5);
      expect(map[0].length).toBe(5);
    });

    test('未揭示的格子内容隐藏', () => {
      const game = createTreasureHuntMiniGame();
      const map = game.getVisibleMap();

      // 所有格子初始都未揭示
      for (const row of map) {
        for (const cell of row) {
          expect(cell.revealed).toBe(false);
        }
      }
    });
  });

  describe('start', () => {
    test('开始游戏', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      expect(game.getState()).toBe('playing');
    });
  });

  describe('dig', () => {
    test('挖掘消耗铲子', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      const before = game.getShovelsRemaining();
      game.dig(0, 0);
      const after = game.getShovelsRemaining();

      expect(after).toBe(before - 1);
    });

    test('挖掘揭示格子', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      const cell = game.dig(0, 0);
      expect(cell).not.toBeNull();
      expect(cell!.revealed).toBe(true);
    });

    test('不能重复挖掘同一格子', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      game.dig(0, 0);
      const result = game.dig(0, 0);

      expect(result).toBeNull();
    });

    test('找到宝藏游戏成功', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      const fullMap = game.getFullMap();
      const { row, col } = fullMap.treasurePosition;

      game.dig(row, col);
      expect(game.getState()).toBe('found');
    });

    test('铲子用尽游戏结束', () => {
      const game = createTreasureHuntMiniGame({ shovels: 2, maxAdShovels: 0 });
      game.start();

      const fullMap = game.getFullMap();
      const { row: tRow, col: tCol } = fullMap.treasurePosition;

      // 挖两个非宝藏格子
      let dug = 0;
      for (let r = 0; r < 5 && dug < 2; r++) {
        for (let c = 0; c < 5 && dug < 2; c++) {
          if (r !== tRow || c !== tCol) {
            game.dig(r, c);
            dug++;
          }
        }
      }

      expect(game.getState()).toBe('exhausted');
    });
  });

  describe('addShovelFromAd', () => {
    test('广告获取铲子', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      game.dig(0, 0); // 用掉一个
      const before = game.getShovelsRemaining();

      const success = game.addShovelFromAd();
      expect(success).toBe(true);
      expect(game.getShovelsRemaining()).toBe(before + 1);
    });

    test('广告铲子有上限', () => {
      const game = createTreasureHuntMiniGame({ maxAdShovels: 2 });
      game.start();

      game.addShovelFromAd();
      game.addShovelFromAd();
      const result = game.addShovelFromAd();

      expect(result).toBe(false);
    });
  });

  describe('getHint', () => {
    test('方向提示', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      const hint = game.getHint('direction');
      expect(typeof hint).toBe('string');
    });

    test('距离提示', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      const hint = game.getHint('distance');
      expect(typeof hint).toBe('string');
    });

    test('区域提示', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      const hint = game.getHint('area');
      expect(Array.isArray(hint)).toBe(true);
      expect((hint as any[]).length).toBe(4); // 2x2 区域
    });
  });

  describe('getCollectedRewards', () => {
    test('追踪收集的奖励', () => {
      const game = createTreasureHuntMiniGame();
      game.start();

      game.dig(0, 0);
      const rewards = game.getCollectedRewards();

      expect(rewards).toHaveProperty('totalCoins');
      expect(rewards).toHaveProperty('totalGems');
      expect(rewards).toHaveProperty('boosters');
    });
  });
});

// ============================================
// MiniGameManager Tests
// ============================================
describe('MiniGameManager', () => {
  beforeEach(() => {
    localStorage.clear();
    resetMiniGameManager();
  });

  describe('初始化', () => {
    test('创建管理器', () => {
      const manager = createMiniGameManager();
      expect(manager).toBeDefined();
    });

    test('初始统计为零', () => {
      const manager = createMiniGameManager();
      const stats = manager.getStats();

      expect(stats.totalPlayed).toBe(0);
      expect(stats.totalWon).toBe(0);
    });
  });

  describe('shouldTrigger', () => {
    test('冷却期内不触发', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 30 });

      // 先触发一次
      manager.trigger({ type: 'level_complete', condition: { levelIndex: 5 } });
      manager.skipGame();

      // 立即再次检查
      const should = manager.shouldTrigger({
        type: 'level_complete',
        condition: { levelIndex: 10 },
      });

      expect(should).toBe(false);
    });

    test('连胜达到阈值必触发', () => {
      const manager = createMiniGameManager({ streakThreshold: 5, cooldownMinutes: 0 });

      const should = manager.shouldTrigger({
        type: 'streak',
        condition: { streakCount: 5 },
      });

      expect(should).toBe(true);
    });

    test('特殊事件必触发', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0 });

      const should = manager.shouldTrigger({
        type: 'special_event',
        condition: { eventId: 'holiday' },
      });

      expect(should).toBe(true);
    });
  });

  describe('trigger', () => {
    test('触发返回游戏类型', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });

      const type = manager.trigger({
        type: 'level_complete',
        condition: { levelIndex: 5 },
      });

      expect(['rescue', 'color_sort', 'treasure_hunt']).toContain(type);
    });

    test('可指定游戏类型', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });

      const type = manager.trigger(
        { type: 'level_complete', condition: { levelIndex: 5 } },
        'rescue'
      );

      expect(type).toBe('rescue');
    });

    test('创建游戏会话', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });

      manager.trigger({ type: 'level_complete', condition: { levelIndex: 5 } });
      const session = manager.getCurrentSession();

      expect(session).not.toBeNull();
      expect(session!.id).toBeDefined();
    });
  });

  describe('startGame', () => {
    test('返回游戏实例', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });

      manager.trigger(
        { type: 'level_complete', condition: { levelIndex: 5 } },
        'rescue'
      );
      const game = manager.startGame();

      expect(game).toBeInstanceOf(RescueMiniGame);
    });

    test('无会话时返回 null', () => {
      const manager = createMiniGameManager();
      const game = manager.startGame();

      expect(game).toBeNull();
    });
  });

  describe('completeGame', () => {
    test('完成游戏更新统计', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });

      manager.trigger(
        { type: 'level_complete', condition: { levelIndex: 5 } },
        'rescue'
      );
      manager.startGame();

      const mockResult = {
        success: true,
        scenario: getAllRescueScenarios()[0],
        selectedOption: 0,
        timeUsed: 5,
        reward: { coins: 100 },
      };

      manager.completeGame(mockResult);
      const stats = manager.getStats();

      expect(stats.totalPlayed).toBe(1);
      expect(stats.totalWon).toBe(1);
    });

    test('返回解析后的结果', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });

      manager.trigger(
        { type: 'level_complete', condition: { levelIndex: 5 } },
        'rescue'
      );
      manager.startGame();

      const mockResult = {
        success: true,
        scenario: getAllRescueScenarios()[0],
        selectedOption: 0,
        timeUsed: 5,
        reward: { coins: 100, booster: 'rocket' },
      };

      const result = manager.completeGame(mockResult);

      expect(result).not.toBeNull();
      expect(result!.coins).toBe(100);
      expect(result!.boosters).toContain('rocket');
    });
  });

  describe('skipGame', () => {
    test('跳过清除会话', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });

      manager.trigger({ type: 'level_complete', condition: { levelIndex: 5 } });
      manager.skipGame();

      expect(manager.getCurrentSession()).toBeNull();
    });
  });

  describe('事件监听', () => {
    test('触发事件', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });
      const events: string[] = [];

      manager.onEvent((e) => events.push(e.type));
      manager.trigger({ type: 'level_complete', condition: { levelIndex: 5 } });

      expect(events).toContain('trigger');
    });

    test('完成事件', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });
      const events: string[] = [];

      manager.onEvent((e) => events.push(e.type));
      manager.trigger(
        { type: 'level_complete', condition: { levelIndex: 5 } },
        'rescue'
      );
      manager.startGame();

      const mockResult = {
        success: true,
        scenario: getAllRescueScenarios()[0],
        selectedOption: 0,
        timeUsed: 5,
        reward: { coins: 100 },
      };
      manager.completeGame(mockResult);

      expect(events).toContain('complete');
    });
  });

  describe('reset', () => {
    test('重置清除所有数据', () => {
      const manager = createMiniGameManager({ cooldownMinutes: 0, triggerChance: 1 });

      manager.trigger({ type: 'level_complete', condition: { levelIndex: 5 } });
      manager.reset();

      const stats = manager.getStats();
      expect(stats.totalPlayed).toBe(0);
      expect(manager.getCurrentSession()).toBeNull();
    });
  });
});
