/**
 * Tests for userId utility
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { getUserId } from '../../utils/userId';

describe('userId utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should generate a new user ID if none exists', () => {
    const userId = getUserId();
    expect(userId).toBeDefined();
    expect(typeof userId).toBe('string');
    expect(userId.length).toBeGreaterThan(0);
  });

  test('should return the same user ID on subsequent calls', () => {
    const userId1 = getUserId();
    const userId2 = getUserId();
    expect(userId1).toBe(userId2);
  });

  test('should persist user ID in localStorage', () => {
    const userId = getUserId();
    const stored = localStorage.getItem('townhall_user_id');
    expect(stored).toBe(userId);
  });

  test('should retrieve existing user ID from localStorage', () => {
    localStorage.setItem('townhall_user_id', 'test-user-123');
    const userId = getUserId();
    expect(userId).toBe('test-user-123');
  });
});
