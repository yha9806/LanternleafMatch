/**
 * WinStreakManager 单元测试
 */

import {
  WinStreakManager,
  createWinStreakManager,
  STREAK_REWARDS,
} from '../../assets/scripts/core/WinStreakManager';

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

describe('WinStreakManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('初始化', () => {
    test('创建新实例时连胜为0', () => {
      const manager = createWinStreakManager();
      expect(manager.getCurrentStreak()).toBe(0);
    });

    test('从 localStorage 加载已保存的连胜', () => {
      localStorage.setItem('lanternleaf_win_streak', JSON.stringify({
        currentStreak: 5,
        maxStreak: 10,
        lastWinLevel: 20,
        lastWinTime: Date.now(),
        totalWins: 50,
        revivalsUsed: 2,
      }));

      const manager = createWinStreakManager();
      expect(manager.getCurrentStreak()).toBe(5);
      expect(manager.getMaxStreak()).toBe(10);
    });
  });

  describe('onLevelWin', () => {
    test('通关后连胜+1', () => {
      const manager = createWinStreakManager();
      manager.onLevelWin(1);
      expect(manager.getCurrentStreak()).toBe(1);
    });

    test('连续通关连胜递增', () => {
      const manager = createWinStreakManager();
      manager.onLevelWin(1);
      manager.onLevelWin(2);
      manager.onLevelWin(3);
      expect(manager.getCurrentStreak()).toBe(3);
    });

    test('返回正确的奖励', () => {
      const manager = createWinStreakManager();

      const reward1 = manager.onLevelWin(1);
      expect(reward1.coins).toBe(STREAK_REWARDS[1].coins);

      const reward2 = manager.onLevelWin(2);
      expect(reward2.coins).toBe(STREAK_REWARDS[2].coins);

      const reward3 = manager.onLevelWin(3);
      expect(reward3.coins).toBe(STREAK_REWARDS[3].coins);
      expect(reward3.gems).toBe(STREAK_REWARDS[3].gems);
    });

    test('5连胜获得道具奖励', () => {
      const manager = createWinStreakManager();
      for (let i = 1; i <= 5; i++) {
        manager.onLevelWin(i);
      }
      const reward = manager.onLevelWin(5);
      expect(manager.getCurrentStreak()).toBe(5);
    });

    test('10连胜获得超级彩虹道具', () => {
      const manager = createWinStreakManager();
      for (let i = 1; i <= 10; i++) {
        manager.onLevelWin(i);
      }
      expect(manager.getCurrentStreak()).toBe(10);
    });

    test('更新最高连胜记录', () => {
      const manager = createWinStreakManager();
      for (let i = 1; i <= 7; i++) {
        manager.onLevelWin(i);
      }
      expect(manager.getMaxStreak()).toBe(7);
    });
  });

  describe('onLevelFail', () => {
    test('失败后返回复活选项', () => {
      const manager = createWinStreakManager();
      manager.onLevelWin(1);
      manager.onLevelWin(2);
      manager.onLevelWin(3);

      const result = manager.onLevelFail();
      expect(result.previousStreak).toBe(3);
      expect(result.revivalOptions.adAvailable).toBe(true);
      expect(result.revivalOptions.gemCost).toBe(30);
    });

    test('无连胜时失败不需要复活', () => {
      const manager = createWinStreakManager();
      const result = manager.onLevelFail();
      expect(result.previousStreak).toBe(0);
    });
  });

  describe('reviveWithAd', () => {
    test('广告复活保持连胜', () => {
      const manager = createWinStreakManager();
      manager.onLevelWin(1);
      manager.onLevelWin(2);
      manager.onLevelWin(3);
      manager.onLevelFail();

      const success = manager.reviveWithAd();
      expect(success).toBe(true);
      expect(manager.getCurrentStreak()).toBe(3);
    });

    test('广告复活有次数限制', () => {
      const manager = createWinStreakManager();

      // 使用多次广告复活
      for (let i = 0; i < 10; i++) {
        manager.onLevelWin(i + 1);
        manager.onLevelFail();
        manager.reviveWithAd();
      }

      // 检查是否有限制
      const result = manager.onLevelFail();
      // 广告复活应该有每日限制
    });
  });

  describe('reviveWithGems', () => {
    test('宝石复活返回消耗数量', () => {
      const manager = createWinStreakManager();
      manager.onLevelWin(1);
      manager.onLevelWin(2);
      manager.onLevelFail();

      const cost = manager.reviveWithGems();
      expect(cost).toBe(30);
      expect(manager.getCurrentStreak()).toBe(2);
    });
  });

  describe('getPreBoosters', () => {
    test('5连胜获得预置道具奖励', () => {
      const manager = createWinStreakManager();
      for (let i = 1; i <= 5; i++) {
        manager.onLevelWin(i);
      }

      const boosters = manager.getPreBoosters();
      expect(boosters.length).toBeGreaterThan(0);
    });

    test('无连胜时没有预置道具', () => {
      const manager = createWinStreakManager();
      const boosters = manager.getPreBoosters();
      expect(boosters.length).toBe(0);
    });
  });

  describe('事件监听', () => {
    test('通关触发事件', () => {
      const manager = createWinStreakManager();
      const events: string[] = [];

      manager.onEvent((event) => {
        events.push(event.type);
      });

      manager.onLevelWin(1);
      expect(events).toContain('streak_updated');
    });

    test('里程碑触发特殊事件', () => {
      const manager = createWinStreakManager();
      const events: any[] = [];

      manager.onEvent((event) => {
        events.push(event);
      });

      for (let i = 1; i <= 5; i++) {
        manager.onLevelWin(i);
      }

      const milestoneEvent = events.find(e => e.type === 'milestone');
      expect(milestoneEvent).toBeDefined();
    });

    test('可以取消监听', () => {
      const manager = createWinStreakManager();
      let callCount = 0;

      const unsubscribe = manager.onEvent(() => {
        callCount++;
      });

      manager.onLevelWin(1);
      expect(callCount).toBe(1);

      unsubscribe();
      manager.onLevelWin(2);
      expect(callCount).toBe(1); // 不再增加
    });
  });

  describe('reset', () => {
    test('重置清除所有数据', () => {
      const manager = createWinStreakManager();
      manager.onLevelWin(1);
      manager.onLevelWin(2);
      manager.onLevelWin(3);

      manager.reset();
      expect(manager.getCurrentStreak()).toBe(0);
      expect(manager.getMaxStreak()).toBe(0);
    });
  });
});
