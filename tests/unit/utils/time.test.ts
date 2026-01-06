import { describe, it, expect, vi } from 'vitest';
import { second, minute, hour, day, week, timer } from '../../../src/utils/time';

describe('Time Utils', () => {
  describe('second', () => {
    it('should return milliseconds for 1 second by default', () => {
      expect(second()).toBe(1000);
    });

    it('should return milliseconds for given seconds', () => {
      expect(second(1)).toBe(1000);
      expect(second(5)).toBe(5000);
      expect(second(60)).toBe(60000);
    });

    it('should handle fractional seconds', () => {
      expect(second(0.5)).toBe(500);
      expect(second(1.5)).toBe(1500);
    });
  });

  describe('minute', () => {
    it('should return milliseconds for 1 minute by default', () => {
      expect(minute()).toBe(60000);
    });

    it('should return milliseconds for given minutes', () => {
      expect(minute(1)).toBe(60000);
      expect(minute(5)).toBe(300000);
      expect(minute(60)).toBe(3600000);
    });

    it('should handle fractional minutes', () => {
      expect(minute(0.5)).toBe(30000);
      expect(minute(1.5)).toBe(90000);
    });
  });

  describe('hour', () => {
    it('should return milliseconds for 1 hour by default', () => {
      expect(hour()).toBe(3600000);
    });

    it('should return milliseconds for given hours', () => {
      expect(hour(1)).toBe(3600000);
      expect(hour(2)).toBe(7200000);
      expect(hour(24)).toBe(86400000);
    });

    it('should handle fractional hours', () => {
      expect(hour(0.5)).toBe(1800000);
      expect(hour(1.5)).toBe(5400000);
    });
  });

  describe('day', () => {
    it('should return milliseconds for 1 day by default', () => {
      expect(day()).toBe(86400000);
    });

    it('should return milliseconds for given days', () => {
      expect(day(1)).toBe(86400000);
      expect(day(7)).toBe(604800000);
      expect(day(30)).toBe(2592000000);
    });

    it('should handle fractional days', () => {
      expect(day(0.5)).toBe(43200000);
    });
  });

  describe('week', () => {
    it('should return milliseconds for 1 week by default', () => {
      expect(week()).toBe(604800000);
    });

    it('should return milliseconds for given weeks', () => {
      expect(week(1)).toBe(604800000);
      expect(week(2)).toBe(1209600000);
      expect(week(4)).toBe(2419200000);
    });

    it('should handle fractional weeks', () => {
      expect(week(0.5)).toBe(302400000);
    });
  });

  describe('timer', () => {
    it('should resolve after default time (1000ms)', async () => {
      const start = Date.now();
      await timer();
      const elapsed = Date.now() - start;
      
      // Allow some tolerance for timing
      expect(elapsed).toBeGreaterThanOrEqual(950);
      expect(elapsed).toBeLessThan(1100);
    });

    it('should resolve after specified time', async () => {
      const start = Date.now();
      await timer(500);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(450);
      expect(elapsed).toBeLessThan(600);
    });

    it('should return a Promise', () => {
      const result = timer(100);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('time unit relationships', () => {
    it('should have correct relationships between units', () => {
      expect(minute(1)).toBe(second(60));
      expect(hour(1)).toBe(minute(60));
      expect(day(1)).toBe(hour(24));
      expect(week(1)).toBe(day(7));
    });
  });
});

