import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BalanceConfigManager,
  getBalanceConfigManager,
  resetBalanceConfigManager,
} from '../BalanceConfig';
import { BALANCE_CONSTANTS } from '../BalanceFormulas';

describe('BalanceConfigManager', () => {
  let manager: BalanceConfigManager;

  beforeEach(() => {
    manager = new BalanceConfigManager();
  });

  describe('getConfig', () => {
    it('should return default config', () => {
      const config = manager.getConfig();

      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('constants');
      expect(config).toHaveProperty('phases');
      expect(config).toHaveProperty('events');
      expect(config).toHaveProperty('abTests');
    });

    it('should have default constants matching BALANCE_CONSTANTS', () => {
      const config = manager.getConfig();

      expect(config.constants.MOVES_BASE).toBe(BALANCE_CONSTANTS.MOVES_BASE);
      expect(config.constants.GOAL_BASE).toBe(BALANCE_CONSTANTS.GOAL_BASE);
    });
  });

  describe('getConstant', () => {
    it('should return correct constant value', () => {
      expect(manager.getConstant('MOVES_BASE')).toBe(14);
      expect(manager.getConstant('GOAL_BASE')).toBe(8);
      expect(manager.getConstant('DENSITY_CAP')).toBe(0.35);
    });
  });

  describe('getPhase', () => {
    it('should return correct phase for each level range', () => {
      expect(manager.getPhase(1).name).toBe('新手期');
      expect(manager.getPhase(10).name).toBe('新手期');
      expect(manager.getPhase(11).name).toBe('成长期');
      expect(manager.getPhase(25).name).toBe('成长期');
      expect(manager.getPhase(26).name).toBe('挑战期');
      expect(manager.getPhase(50).name).toBe('大师期');
      expect(manager.getPhase(100).name).toBe('无限期');
    });
  });

  describe('updateConfig', () => {
    it('should update config values', () => {
      manager.updateConfig({
        version: '2.0.0',
      });

      expect(manager.getVersion()).toBe('2.0.0');
    });

    it('should merge constants', () => {
      manager.updateConfig({
        constants: {
          ...manager.getConfig().constants,
          MOVES_BASE: 16,
        },
      });

      expect(manager.getConstant('MOVES_BASE')).toBe(16);
      expect(manager.getConstant('GOAL_BASE')).toBe(8); // unchanged
    });
  });

  describe('updateConstant', () => {
    it('should update single constant', () => {
      manager.updateConstant('MOVES_BASE', 12);

      expect(manager.getConstant('MOVES_BASE')).toBe(12);
    });
  });

  describe('event levels', () => {
    it('should check boss levels', () => {
      expect(manager.isBossLevel(25)).toBe(true);
      expect(manager.isBossLevel(50)).toBe(true);
      expect(manager.isBossLevel(24)).toBe(false);
    });

    it('should check easy levels', () => {
      expect(manager.isEasyLevel(1)).toBe(false);

      manager.updateConfig({
        events: {
          ...manager.getConfig().events,
          easyLevels: [1, 2, 3],
        },
      });

      expect(manager.isEasyLevel(1)).toBe(true);
    });
  });

  describe('listeners', () => {
    it('should notify listeners on config change', () => {
      const listener = vi.fn();
      manager.addListener(listener);

      manager.updateConfig({ version: '2.0.0' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        version: '2.0.0',
      }));
    });

    it('should remove listener', () => {
      const listener = vi.fn();
      const remove = manager.addListener(listener);

      remove();
      manager.updateConfig({ version: '2.0.0' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('A/B Tests', () => {
    beforeEach(() => {
      manager.addABTest({
        testId: 'test_1',
        name: 'Test 1',
        description: 'Test description',
        enabled: true,
        parameter: 'constants.MOVES_BASE',
        variants: [
          { name: 'control', value: 14, weight: 50 },
          { name: 'variant_a', value: 12, weight: 50 },
        ],
      });
    });

    it('should assign player to variant deterministically', () => {
      const assignment1 = manager.getABTestVariant('player_1', 'test_1');
      const assignment2 = manager.getABTestVariant('player_1', 'test_1');

      expect(assignment1).toEqual(assignment2);
    });

    it('should return null for disabled test', () => {
      manager.setABTestEnabled('test_1', false);

      const assignment = manager.getABTestVariant('player_1', 'test_1');

      expect(assignment).toBeNull();
    });

    it('should return null for non-existent test', () => {
      const assignment = manager.getABTestVariant('player_1', 'non_existent');

      expect(assignment).toBeNull();
    });

    it('should get all active assignments', () => {
      manager.addABTest({
        testId: 'test_2',
        name: 'Test 2',
        description: 'Test 2',
        enabled: true,
        parameter: 'constants.GOAL_BASE',
        variants: [
          { name: 'control', value: 8, weight: 100 },
        ],
      });

      const assignments = manager.getAllABTestAssignments('player_1');

      expect(assignments.length).toBe(2);
    });

    it('should distribute players across variants', () => {
      const counts = { control: 0, variant_a: 0 };

      for (let i = 0; i < 100; i++) {
        const assignment = manager.getABTestVariant(`player_${i}`, 'test_1');
        if (assignment) {
          counts[assignment.variantName as keyof typeof counts]++;
        }
      }

      // With 50/50 weight, should be roughly equal (allow 20% variance)
      expect(counts.control).toBeGreaterThan(30);
      expect(counts.variant_a).toBeGreaterThan(30);
    });

    it('should remove A/B test', () => {
      manager.removeABTest('test_1');

      const assignment = manager.getABTestVariant('player_1', 'test_1');

      expect(assignment).toBeNull();
    });
  });

  describe('serialization', () => {
    it('should export to JSON', () => {
      const json = manager.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe(manager.getVersion());
      expect(parsed.constants).toEqual(manager.getConfig().constants);
    });

    it('should import from JSON', () => {
      const newConfig = {
        version: '3.0.0',
        lastUpdated: new Date().toISOString(),
        constants: { ...BALANCE_CONSTANTS, MOVES_BASE: 20 },
        phases: [],
        events: { bossLevels: [], easyLevels: [], hardLevels: [] },
        abTests: [],
      };

      manager.fromJSON(JSON.stringify(newConfig));

      expect(manager.getVersion()).toBe('3.0.0');
      expect(manager.getConstant('MOVES_BASE')).toBe(20);
    });
  });

  describe('reset', () => {
    it('should reset to default config', () => {
      manager.updateConfig({ version: '2.0.0' });
      manager.updateConstant('MOVES_BASE', 20);

      manager.reset();

      expect(manager.getVersion()).toBe('1.0.0');
      expect(manager.getConstant('MOVES_BASE')).toBe(14);
    });
  });
});

describe('getBalanceConfigManager', () => {
  beforeEach(() => {
    resetBalanceConfigManager();
  });

  it('should return singleton instance', () => {
    const instance1 = getBalanceConfigManager();
    const instance2 = getBalanceConfigManager();

    expect(instance1).toBe(instance2);
  });

  it('should create new instance after reset', () => {
    const instance1 = getBalanceConfigManager();
    instance1.updateConfig({ version: '2.0.0' });

    resetBalanceConfigManager();
    const instance2 = getBalanceConfigManager();

    expect(instance2.getVersion()).toBe('1.0.0');
  });
});
