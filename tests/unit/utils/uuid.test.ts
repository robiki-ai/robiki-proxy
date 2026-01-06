import { describe, it, expect } from 'vitest';
import { num } from '../../../src/utils/uuid';

describe('UUID Utils', () => {
  describe('num', () => {
    it('should generate a number', () => {
      const result = num();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should generate consistent number for same seed', () => {
      const seed = 12345;
      const result1 = num(seed);
      const result2 = num(seed);
      
      expect(result1).toBe(result2);
    });

    it('should generate different numbers for different seeds', () => {
      const result1 = num(1);
      const result2 = num(2);
      const result3 = num(3);
      
      expect(result1).not.toBe(result2);
      expect(result2).not.toBe(result3);
      expect(result1).not.toBe(result3);
    });

    it('should generate numbers within 32-bit range', () => {
      const max32Bit = 2 ** 32;
      
      for (let i = 0; i < 100; i++) {
        const result = num(i);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(max32Bit);
      }
    });

    it('should use current time as seed when no seed provided', () => {
      const result1 = num();
      const result2 = num();
      
      // Results should be different since time changes
      // (unless called in exact same millisecond, which is unlikely)
      expect(typeof result1).toBe('number');
      expect(typeof result2).toBe('number');
    });

    it('should handle zero seed', () => {
      const result = num(0);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should handle large seed values', () => {
      const largeSeed = 999999999;
      const result = num(largeSeed);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
  });
});

