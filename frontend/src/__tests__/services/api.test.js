/**
 * Tests for API service
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { api } from '../../services/api';

// Mock fetch globally
global.fetch = vi.fn();

describe('API service', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getCampaigns', () => {
    test('should fetch campaigns successfully', async () => {
      const mockCampaigns = [
        { id: 1, title: 'Campaign 1', description: 'Desc 1' },
        { id: 2, title: 'Campaign 2', description: 'Desc 2' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaigns
      });

      const result = await api.getCampaigns();
      expect(result).toEqual(mockCampaigns);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/campaigns'));
    });

    test('should throw error on failed request', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(api.getCampaigns()).rejects.toThrow();
    });
  });

  describe('createCampaign', () => {
    test('should create campaign with correct data', async () => {
      const newCampaign = {
        title: 'New Campaign',
        description: 'Description',
        creator_id: 'user123'
      };

      const mockResponse = { id: 1, ...newCampaign };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.createCampaign(newCampaign);
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/campaigns'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(newCampaign)
        })
      );
    });
  });

  describe('upvoteQuestion', () => {
    test('should upvote question with user_id', async () => {
      const mockResponse = {
        success: true,
        vote_count: 5,
        hasVoted: true
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.upvoteQuestion(1, 'user123');
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/questions/1/upvote'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ user_id: 'user123' })
        })
      );
    });
  });
});
