/**
 * Tests for questions API routes
 */

const request = require('supertest');
const express = require('express');
const questionsRouter = require('../../src/routes/questions');
const {
  initTestDatabase,
  closeTestDatabase,
  runQuery,
  getQuery,
  allQuery,
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
jest.mock('../../src/services/sseService', () => ({
  broadcast: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/api', questionsRouter);

describe('Questions API', () => {
  let testCampaignId;

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    // Create a test campaign
    const campaignResult = await runQuery(
      'INSERT INTO campaigns (title, description, creator_id) VALUES (?, ?, ?)',
      ['Test Campaign', 'Description', 'user123']
    );
    testCampaignId = campaignResult.lastID;
  });

  describe('GET /api/campaigns/:campaignId/questions', () => {
    test('should return empty array when no questions exist', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/questions`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    test('should return questions with vote counts', async () => {
      // Create questions
      const q1Result = await runQuery(
        'INSERT INTO questions (campaign_id, question_text) VALUES (?, ?)',
        [testCampaignId, 'Question 1']
      );
      const q1Id = q1Result.lastID;

      const q2Result = await runQuery(
        'INSERT INTO questions (campaign_id, question_text) VALUES (?, ?)',
        [testCampaignId, 'Question 2']
      );
      const q2Id = q2Result.lastID;

      // Add votes to question 1
      await runQuery(
        'INSERT INTO votes (question_id, user_id) VALUES (?, ?)',
        [q1Id, 'user1']
      );
      await runQuery(
        'INSERT INTO votes (question_id, user_id) VALUES (?, ?)',
        [q1Id, 'user2']
      );

      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/questions`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      // Question 1 should be first (higher vote count)
      expect(response.body[0].question_text).toBe('Question 1');
      expect(parseInt(response.body[0].vote_count)).toBe(2);
      expect(response.body[1].question_text).toBe('Question 2');
      expect(parseInt(response.body[1].vote_count)).toBe(0);
    });
  });

  describe('POST /api/campaigns/:campaignId/questions', () => {
    test('should create a new question', async () => {
      const newQuestion = {
        question_text: 'New Question'
      };

      const response = await request(app)
        .post(`/api/campaigns/${testCampaignId}/questions`)
        .send(newQuestion)
        .expect(201);

      expect(response.body).toMatchObject({
        question_text: 'New Question',
        campaign_id: testCampaignId
      });
      expect(response.body.id).toBeDefined();

      // Verify in database
      const question = await getQuery(
        'SELECT * FROM questions WHERE id = ?',
        [response.body.id]
      );
      expect(question).toMatchObject({
        question_text: 'New Question',
        campaign_id: testCampaignId
      });
    });

    test('should require question text', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaignId}/questions`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    test('should reject empty question text', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaignId}/questions`)
        .send({ question_text: '   ' })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    test('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .post('/api/campaigns/99999/questions')
        .send({ question_text: 'Question' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/questions/:id', () => {
    test('should delete a question', async () => {
      const questionResult = await runQuery(
        'INSERT INTO questions (campaign_id, question_text) VALUES (?, ?)',
        [testCampaignId, 'To Delete']
      );
      const questionId = questionResult.lastID;

      await request(app)
        .delete(`/api/questions/${questionId}`)
        .send({ creator_id: 'user123' })
        .expect(200);

      // Verify deleted
      const question = await getQuery(
        'SELECT * FROM questions WHERE id = ?',
        [questionId]
      );
      expect(question).toBeUndefined();
    });

    test('should only allow campaign creator to delete question', async () => {
      const questionResult = await runQuery(
        'INSERT INTO questions (campaign_id, question_text) VALUES (?, ?)',
        [testCampaignId, 'To Delete']
      );
      const questionId = questionResult.lastID;

      const response = await request(app)
        .delete(`/api/questions/${questionId}`)
        .send({ creator_id: 'different_user' })
        .expect(403);

      expect(response.body.error).toContain('creator');
    });
  });
});
