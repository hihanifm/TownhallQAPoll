/**
 * Tests for dateFormat utility
 */

import { describe, test, expect } from 'vitest';
import { formatRelativeTime, formatDateTime } from '../../utils/dateFormat';

describe('dateFormat utility', () => {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  describe('formatRelativeTime', () => {
    test('should format time as "just now" for very recent times', () => {
      const result = formatRelativeTime(now.toISOString());
      expect(result).toContain('just now');
    });

    test('should format time in minutes', () => {
      const result = formatRelativeTime(oneMinuteAgo.toISOString());
      expect(result).toContain('minute');
    });

    test('should format time in hours', () => {
      const result = formatRelativeTime(oneHourAgo.toISOString());
      expect(result).toContain('hour');
    });

    test('should format time in days', () => {
      const result = formatRelativeTime(oneDayAgo.toISOString());
      expect(result).toContain('day');
    });
  });

  describe('formatDateTime', () => {
    test('should format date as readable string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDateTime(date.toISOString());
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should handle ISO string input', () => {
      const isoString = '2024-01-15T10:30:00.000Z';
      const result = formatDateTime(isoString);
      expect(result).toBeDefined();
    });
  });
});
