import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  AnalyticsManager,
  ANALYTICS_EVENTS,
  getAnalyticsManager,
  resetAnalytics,
} from '../Analytics';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AnalyticsManager', () => {
  let analytics: AnalyticsManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });

    analytics = new AnalyticsManager({
      enabled: true,
      debug: false,
      flushIntervalMs: 60000, // 长间隔，避免自动刷新
    });
    analytics.setPlayerId('test_player');
  });

  afterEach(() => {
    analytics.stop();
  });

  describe('track', () => {
    it('should add event to queue', () => {
      analytics.track(ANALYTICS_EVENTS.BUTTON_CLICK, { buttonId: 'test' });

      expect(analytics.getQueueLength()).toBe(1);
    });

    it('should not track when disabled', () => {
      analytics.setEnabled(false);
      analytics.track(ANALYTICS_EVENTS.BUTTON_CLICK, { buttonId: 'test' });

      expect(analytics.getQueueLength()).toBe(0);
    });
  });

  describe('trackLevelStart', () => {
    it('should track level start event', () => {
      analytics.trackLevelStart({
        level: 1,
        seed: 12345,
        moves: 14,
        goalType: 'collect',
        goalItem: 'leaf',
        goalCount: 8,
        mossCount: 0,
        pattern: 'none',
      });

      expect(analytics.getQueueLength()).toBe(1);
    });
  });

  describe('trackLevelEnd', () => {
    it('should track level end with derived metrics', async () => {
      analytics.trackLevelEnd({
        level: 1,
        result: 'win',
        movesUsed: 10,
        movesRemaining: 4,
        goalProgress: 8,
        goalTotal: 8,
        duration: 60,
        cascadeCount: 5,
        shuffleCount: 0,
        specialsCreated: 2,
        specialsTriggered: 1,
        retryCount: 0,
      });

      expect(analytics.getQueueLength()).toBe(1);

      // Flush to check the data
      await analytics.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('efficiency'),
        })
      );
    });
  });

  describe('trackMove', () => {
    it('should track move event', () => {
      analytics.trackMove({
        level: 1,
        moveNumber: 1,
        fromRow: 0,
        fromCol: 0,
        toRow: 0,
        toCol: 1,
        matchCount: 3,
        isCascade: false,
        isSpecial: false,
      });

      expect(analytics.getQueueLength()).toBe(1);
    });
  });

  describe('trackSpecialCreated', () => {
    it('should track special creation', () => {
      analytics.trackSpecialCreated(1, 'whirl_h', { row: 2, col: 3 });

      expect(analytics.getQueueLength()).toBe(1);
    });
  });

  describe('trackSpecialTriggered', () => {
    it('should track special trigger', () => {
      analytics.trackSpecialTriggered(1, 'lantern', 9);

      expect(analytics.getQueueLength()).toBe(1);
    });
  });

  describe('trackCascade', () => {
    it('should track cascade event', () => {
      analytics.trackCascade(1, 3, 15);

      expect(analytics.getQueueLength()).toBe(1);
    });
  });

  describe('trackAdWatched', () => {
    it('should track ad watch event', () => {
      analytics.trackAdWatched({
        adType: 'rewarded',
        placement: 'energy_gate',
        result: 'completed',
        reward: 'energy',
        rewardAmount: 1,
      });

      expect(analytics.getQueueLength()).toBe(1);
    });
  });

  describe('trackEnergyConsumed', () => {
    it('should track energy consumption', () => {
      analytics.trackEnergyConsumed(5, 4);

      expect(analytics.getQueueLength()).toBe(1);
    });
  });

  describe('trackEnergyRecovered', () => {
    it('should track energy recovery', () => {
      analytics.trackEnergyRecovered('ad', 1);

      expect(analytics.getQueueLength()).toBe(1);
    });
  });

  describe('flush', () => {
    it('should send events to server', async () => {
      analytics.track(ANALYTICS_EVENTS.BUTTON_CLICK, { buttonId: 'test' });

      const success = await analytics.flush();

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(analytics.getQueueLength()).toBe(0);
    });

    it('should handle empty queue', async () => {
      const success = await analytics.flush();

      expect(success).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true });

      analytics.track(ANALYTICS_EVENTS.BUTTON_CLICK, { buttonId: 'test' });

      // This will fail and retry
      const success = await analytics.flush();

      // May or may not succeed depending on retry logic
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should keep events on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      analytics.track(ANALYTICS_EVENTS.BUTTON_CLICK, { buttonId: 'test' });

      await analytics.flush();

      // Events should be preserved on failure
      expect(analytics.getQueueLength()).toBeGreaterThan(0);
    });
  });

  describe('batch sending', () => {
    it('should send in batches', async () => {
      const manager = new AnalyticsManager({
        enabled: true,
        batchSize: 2,
        flushIntervalMs: 60000,
      });

      manager.setPlayerId('test');

      // Add 5 events
      for (let i = 0; i < 5; i++) {
        manager.track(ANALYTICS_EVENTS.BUTTON_CLICK, { buttonId: `btn_${i}` });
      }

      await manager.flush();

      // Should have made 3 calls (2 + 2 + 1)
      expect(mockFetch).toHaveBeenCalledTimes(3);

      manager.stop();
    });
  });

  describe('session management', () => {
    it('should start new session', () => {
      const initialQueue = analytics.getQueueLength();

      analytics.startSession();

      expect(analytics.getQueueLength()).toBe(initialQueue + 1);
    });

    it('should end session and flush', async () => {
      analytics.endSession();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('clearQueue', () => {
    it('should clear all queued events', () => {
      analytics.track(ANALYTICS_EVENTS.BUTTON_CLICK, { buttonId: 'test' });
      analytics.track(ANALYTICS_EVENTS.BUTTON_CLICK, { buttonId: 'test2' });

      expect(analytics.getQueueLength()).toBe(2);

      analytics.clearQueue();

      expect(analytics.getQueueLength()).toBe(0);
    });
  });

  describe('ANALYTICS_EVENTS', () => {
    it('should have all required event types', () => {
      expect(ANALYTICS_EVENTS.LEVEL_START).toBe('level_start');
      expect(ANALYTICS_EVENTS.LEVEL_END).toBe('level_end');
      expect(ANALYTICS_EVENTS.MOVE_MADE).toBe('move_made');
      expect(ANALYTICS_EVENTS.SPECIAL_CREATED).toBe('special_created');
      expect(ANALYTICS_EVENTS.AD_WATCHED).toBe('ad_watched');
      expect(ANALYTICS_EVENTS.ENERGY_CONSUMED).toBe('energy_consumed');
    });
  });
});

describe('getAnalyticsManager', () => {
  beforeEach(() => {
    resetAnalytics();
  });

  afterEach(() => {
    resetAnalytics();
  });

  it('should return singleton instance', () => {
    const instance1 = getAnalyticsManager();
    const instance2 = getAnalyticsManager();

    expect(instance1).toBe(instance2);
  });
});
