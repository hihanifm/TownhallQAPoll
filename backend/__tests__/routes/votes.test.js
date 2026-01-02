/**
 * Tests for votes API routes
 */

const request = require('supertest');
const express = require('express');
const votesRouter = require('../../src/routes/votes');
const {
  initTestDatabase,
  closeTestDatabase,
  runQuery,
  getQuery,
  clearTestDatabase
} = require('../../tests/setup');

// Mock database module to use test database
jest.mock('../../src/db/database', () => {
  const testDb = require('../../tests/setup');
  return {
    allQuery: (...args) => testDb.allQuery(...args),
    getQuery: (...args) => testDb.getQuery(...args),
    runQuery: (...args) => testDb.runQuery(...args)
  };
});

// Mock SSE service
const mockBroadcast = jest.fn();
jest.mock('../../src/services/sseService', () => ({
  broadcast: jest.fn()
}));

// Get the mocked broadcast function
const sseService = require('../../src/services/sseService');

const app = express();
app.use(express.json());
app.use('/api', votesRouter);

describe('Votes API', () => {
  let testCampaignId;
  let testQuestionId;

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    mockBroadcast.mockClear();

    // Create a test campaign
    const campaignResult = await runQuery(
      'INSERT INTO campaigns (title, description, creator_id) VALUES (?, ?, ?)',
      ['Test Campaign', 'Description', 'user123']
    );
    testCampaignId = campaignResult.lastID;

    // Create a test question
    const questionResult = await runQuery(
      'INSERT INTO questions (campaign_id, question_text) VALUES (?, ?)',
      [testCampaignId, 'Test Question']
    );
    testQuestionId = questionResult.lastID;
  });

  describe('POST /api/questions/:id/upvote', () => {
    test('should add a vote when user has not voted', async () => {
      const response = await request(app)
        .post(`/api/questions/${testQuestionId}/upvote`)
        .send({ user_id: 'user1' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        hasVoted: true,
        vote_count: 1
      });

      // Verify vote in database
      const vote = await getQuery(
        'SELECT * FROM votes WHERE question_id = ? AND user_id = ?',
        [testQuestionId, 'user1']
      );
      expect(vote).toBeDefined();

      // Verify SSE broadcast was called
      expect(sseService.broadcast).toHaveBeenCalledWith(
        testCampaignId.toString(),
        expect.objectContaining({
          type: 'vote_updated',
          question_id: testQuestionId,
          vote_count: 1
        })
      );
    });

    test('should remove a vote when user has already voted (toggle)', async () => {
      // Add initial vote
      await runQuery(
        'INSERT INTO votes (question_id, user_id) VALUES (?, ?)',
        [testQuestionId, 'user1']
      );

      const response = await request(app)
        .post(`/api/questions/${testQuestionId}/upvote`)
        .send({ user_id: 'user1' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        hasVoted: false,
        vote_count: 0
      });

      // Verify vote removed from database
      const vote = await getQuery(
        'SELECT * FROM votes WHERE question_id = ? AND user_id = ?',
        [testQuestionId, 'user1']
      );
      expect(vote).toBeUndefined();
    });

    test('should require user_id', async () => {
      const response = await request(app)
        .post(`/api/questions/${testQuestionId}/upvote`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('user_id');
    });

    test('should return 404 for non-existent question', async () => {
      const response = await request(app)
        .post('/api/questions/99999/upvote')
        .send({ user_id: 'user1' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    test('should correctly count multiple votes', async () => {
      // Add votes from multiple users
      await request(app)
        .post(`/api/questions/${testQuestionId}/upvote`)
        .send({ user_id: 'user1' })
        .expect(200);

      await request(app)
        .post(`/api/questions/${testQuestionId}/upvote`)
        .send({ user_id: 'user2' })
        .expect(200);

      await request(app)
        .post(`/api/questions/${testQuestionId}/upvote`)
        .send({ user_id: 'user3' })
        .expect(200);

      // Verify vote count
      const voteCount = await getQuery(
        'SELECT COUNT(*) as count FROM votes WHERE question_id = ?',
        [testQuestionId]
      );
      expect(voteCount.count).toBe(3);
    });
  });
});
