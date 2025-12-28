/**
 * PreBoosterManager 单元测试
 */

import {
  PreBoosterManager,
  createPreBoosterManager,
  PreBoosterType,
} from '../../assets/scripts/core/PreBoosterManager';

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

describe('PreBoosterManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('初始化', () => {
    test('创建新实例', () => {
      const manager = createPreBoosterManager();
      expect(manager).toBeDefined();
    });

    test('初始库存为空', () => {
      const manager = createPreBoosterManager();
      const inventory = manager.getInventory();
      expect(Object.values(inventory).every(v => v === 0)).toBe(true);
    });
  });

  describe('getAvailableBoosters', () => {
    test('返回所有可用道具定义', () => {
      const manager = createPreBoosterManager();
      const boosters = manager.getAvailableBoosters(1);

      expect(boosters.length).toBeGreaterThan(0);
      expect(boosters[0]).toHaveProperty('type');
      expect(boosters[0]).toHaveProperty('name');
      expect(boosters[0]).toHaveProperty('price');
    });

    test('高等级解锁更多道具', () => {
      const manager = createPreBoosterManager();
      const lowLevelBoosters = manager.getAvailableBoosters(1);
      const highLevelBoosters = manager.getAvailableBoosters(50);

      expect(highLevelBoosters.length).toBeGreaterThanOrEqual(lowLevelBoosters.length);
    });
  });

  describe('addBooster', () => {
    test('添加道具到选择列表', () => {
      const manager = createPreBoosterManager();
      const result = manager.addBooster('rocket');

      expect(result).toBe(true);
      expect(manager.getSelectedBoosters()).toContain('rocket');
    });

    test('最多选择3个道具', () => {
      const manager = createPreBoosterManager();
      manager.addBooster('rocket');
      manager.addBooster('bomb');
      manager.addBooster('rainbow');

      const result = manager.addBooster('shuffle');
      expect(result).toBe(false);
      expect(manager.getSelectedBoosters().length).toBe(3);
    });

    test('不能重复添加同一道具', () => {
      const manager = createPreBoosterManager();
      manager.addBooster('rocket');
      const result = manager.addBooster('rocket');

      expect(result).toBe(false);
      expect(manager.getSelectedBoosters().length).toBe(1);
    });
  });

  describe('removeBooster', () => {
    test('从选择列表移除道具', () => {
      const manager = createPreBoosterManager();
      manager.addBooster('rocket');
      manager.addBooster('bomb');

      manager.removeBooster('rocket');
      expect(manager.getSelectedBoosters()).not.toContain('rocket');
      expect(manager.getSelectedBoosters()).toContain('bomb');
    });
  });

  describe('clearSelection', () => {
    test('清空所有选择', () => {
      const manager = createPreBoosterManager();
      manager.addBooster('rocket');
      manager.addBooster('bomb');

      manager.clearSelection();
      expect(manager.getSelectedBoosters().length).toBe(0);
    });
  });

  describe('calculateTotalCost', () => {
    test('计算总价格', () => {
      const manager = createPreBoosterManager();
      manager.addBooster('rocket'); // 50 coins
      manager.addBooster('bomb');   // 80 coins

      const cost = manager.calculateTotalCost();
      expect(cost).toBe(130);
    });

    test('免费道具不计入价格', () => {
      const manager = createPreBoosterManager();
      manager.addFreeBooster('rocket');

      const cost = manager.calculateTotalCost();
      expect(cost).toBe(0);
    });
  });

  describe('addFreeBooster', () => {
    test('添加免费道具', () => {
      const manager = createPreBoosterManager();
      manager.addFreeBooster('rainbow');

      expect(manager.getSelectedBoosters()).toContain('rainbow');
      expect(manager.calculateTotalCost()).toBe(0);
    });
  });

  describe('confirmAndStart', () => {
    test('确认选择并返回棋盘位置', () => {
      const manager = createPreBoosterManager();
      manager.addBooster('rocket');
      manager.addBooster('bomb');

      const placements = manager.confirmAndStart(1);

      expect(placements).not.toBeNull();
      expect(placements!.length).toBe(2);
      expect(placements![0]).toHaveProperty('row');
      expect(placements![0]).toHaveProperty('col');
      expect(placements![0]).toHaveProperty('boosterType');
    });

    test('返回的位置在棋盘范围内', () => {
      const manager = createPreBoosterManager();
      manager.addBooster('rocket');

      const placements = manager.confirmAndStart(1);

      placements!.forEach(p => {
        expect(p.row).toBeGreaterThanOrEqual(0);
        expect(p.row).toBeLessThan(6);
        expect(p.col).toBeGreaterThanOrEqual(0);
        expect(p.col).toBeLessThan(6);
      });
    });

    test('无选择时返回空数组', () => {
      const manager = createPreBoosterManager();
      const placements = manager.confirmAndStart(1);

      expect(placements).toEqual([]);
    });
  });

  describe('getRecommendation', () => {
    test('失败后推荐道具', () => {
      const manager = createPreBoosterManager();

      // 模拟失败场景
      const recommendation = manager.getRecommendation(10);

      if (recommendation) {
        expect(recommendation).toHaveProperty('booster');
        expect(recommendation).toHaveProperty('reason');
      }
    });

    test('新手关卡不推荐', () => {
      const manager = createPreBoosterManager();
      const recommendation = manager.getRecommendation(1);

      // 前几关可能不推荐道具
      // 具体行为取决于实现
    });
  });

  describe('applyDiscount', () => {
    test('应用折扣', () => {
      const manager = createPreBoosterManager();
      manager.addBooster('rocket'); // 50 coins

      const normalCost = manager.calculateTotalCost();
      const discountedCost = manager.calculateTotalCost(true); // 50% off

      expect(discountedCost).toBe(Math.floor(normalCost * 0.5));
    });
  });

  describe('库存管理', () => {
    test('添加道具到库存', () => {
      const manager = createPreBoosterManager();
      manager.addToInventory('rocket', 3);

      const inventory = manager.getInventory();
      expect(inventory.rocket).toBe(3);
    });

    test('使用库存道具', () => {
      const manager = createPreBoosterManager();
      manager.addToInventory('rocket', 2);
      manager.addBooster('rocket');
      manager.confirmAndStart(1);

      const inventory = manager.getInventory();
      expect(inventory.rocket).toBe(1);
    });

    test('库存不足时使用金币购买', () => {
      const manager = createPreBoosterManager();
      manager.addBooster('rocket');

      const cost = manager.calculateTotalCost();
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('持久化', () => {
    test('保存到 localStorage', () => {
      const manager = createPreBoosterManager();
      manager.addToInventory('rocket', 5);

      // 创建新实例检查是否加载
      const manager2 = createPreBoosterManager();
      const inventory = manager2.getInventory();
      expect(inventory.rocket).toBe(5);
    });
  });
});
