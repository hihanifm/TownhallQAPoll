/**
 * Tests for API configuration
 */

import { describe, test, expect } from 'vitest';
import { API_BASE_URL, SSE_BASE_URL, apiConfig } from '../../config/apiConfig';

describe('API Configuration', () => {
  test('should export API_BASE_URL', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
    // Should be either '/api' (proxy) or full URL
    expect(API_BASE_URL).toMatch(/^(\/api|https?:\/\/.*\/api)$/);
  });

  test('should export SSE_BASE_URL', () => {
    expect(SSE_BASE_URL).toBeDefined();
    expect(typeof SSE_BASE_URL).toBe('string');
    // Should be either '/api/sse' (proxy) or full URL
    expect(SSE_BASE_URL).toMatch(/\/api\/sse/);
  });

  test('should export apiConfig object with all properties', () => {
    expect(apiConfig).toBeDefined();
    expect(apiConfig).toHaveProperty('useProxy');
    expect(apiConfig).toHaveProperty('backendUrl');
    expect(apiConfig).toHaveProperty('apiBaseUrl');
    expect(apiConfig).toHaveProperty('sseBaseUrl');
    expect(typeof apiConfig.useProxy).toBe('boolean');
    expect(typeof apiConfig.backendUrl).toBe('string');
    expect(typeof apiConfig.apiBaseUrl).toBe('string');
    expect(typeof apiConfig.sseBaseUrl).toBe('string');
  });

  test('should have consistent URLs', () => {
    // apiBaseUrl should match API_BASE_URL
    expect(apiConfig.apiBaseUrl).toBe(API_BASE_URL);
    // sseBaseUrl should match SSE_BASE_URL
    expect(apiConfig.sseBaseUrl).toBe(SSE_BASE_URL);
  });
});
