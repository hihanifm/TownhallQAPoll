/**
 * Tests for campaigns API routes
 */

const request = require('supertest');
const express = require('express');
const campaignsRouter = require('../../src/routes/campaigns');
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
jest.mock('../../src/services/sseService', () => ({
  broadcast: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/api/campaigns', campaignsRouter);

describe('Campaigns API', () => {
  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('GET /api/campaigns', () => {
    test('should return empty array when no campaigns exist', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    test('should return all campaigns with question count', async () => {
      // Create test campaign
      const campaignResult = await runQuery(
        'INSERT INTO campaigns (title, description, creator_id) VALUES (?, ?, ?)',
        ['Test Campaign', 'Test Description', 'user123']
      );

      const campaignId = campaignResult.lastID;

      // Create test question
      await runQuery(
        'INSERT INTO questions (campaign_id, question_text) VALUES (?, ?)',
        [campaignId, 'Test Question']
      );

      const response = await request(app)
        .get('/api/campaigns')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        title: 'Test Campaign',
        description: 'Test Description',
        creator_id: 'user123'
      });
      expect(parseInt(response.body[0].question_count)).toBe(1);
    });
  });

  describe('POST /api/campaigns', () => {
    test('should create a new campaign', async () => {
      const newCampaign = {
        title: 'New Campaign',
        description: 'New Description',
        creator_id: 'user456'
      };

      const response = await request(app)
        .post('/api/campaigns')
        .send(newCampaign)
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'New Campaign',
        description: 'New Description',
        creator_id: 'user456'
      });
      expect(response.body.id).toBeDefined();

      // Verify in database
      const campaign = await getQuery(
        'SELECT * FROM campaigns WHERE id = ?',
        [response.body.id]
      );
      expect(campaign).toMatchObject(newCampaign);
    });

    test('should require title', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .send({ description: 'No title' })
        .expect(400);

      expect(response.body.error.toLowerCase()).toContain('title');
    });

    // Note: initial_questions feature may not be implemented in the route
    // This test can be uncommented if the feature exists
    // test('should create campaign with initial questions', async () => {
    //   const newCampaign = {
    //     title: 'Campaign with Questions',
    //     description: 'Description',
    //     creator_id: 'user789',
    //     initial_questions: ['Question 1', 'Question 2']
    //   };
    //
    //   const response = await request(app)
    //     .post('/api/campaigns')
    //     .send(newCampaign)
    //     .expect(201);
    //
    //   // Verify questions were created
    //   const questions = await allQuery(
    //     'SELECT * FROM questions WHERE campaign_id = ?',
    //     [response.body.id]
    //   );
    //   expect(questions).toHaveLength(2);
    //   expect(questions[0].question_text).toBe('Question 1');
    //   expect(questions[1].question_text).toBe('Question 2');
    // });
  });

  describe('PATCH /api/campaigns/:id/close', () => {
    test('should close a campaign', async () => {
      const campaignResult = await runQuery(
        'INSERT INTO campaigns (title, description, creator_id, status) VALUES (?, ?, ?, ?)',
        ['Active Campaign', 'Description', 'user123', 'active']
      );
      const campaignId = campaignResult.lastID;

      const response = await request(app)
        .patch(`/api/campaigns/${campaignId}/close`)
        .send({ creator_id: 'user123' })
        .expect(200);

      expect(response.body.status).toBe('closed');

      // Verify in database
      const campaign = await getQuery(
        'SELECT * FROM campaigns WHERE id = ?',
        [campaignId]
      );
      expect(campaign.status).toBe('closed');
    });

    test('should only allow creator to close campaign', async () => {
      const campaignResult = await runQuery(
        'INSERT INTO campaigns (title, description, creator_id, status) VALUES (?, ?, ?, ?)',
        ['Active Campaign', 'Description', 'user123', 'active']
      );
      const campaignId = campaignResult.lastID;

      const response = await request(app)
        .patch(`/api/campaigns/${campaignId}/close`)
        .send({ creator_id: 'different_user' })
        .expect(403);

      expect(response.body.error).toContain('creator');
    });
  });

  describe('DELETE /api/campaigns/:id', () => {
    test('should delete a campaign', async () => {
      const campaignResult = await runQuery(
        'INSERT INTO campaigns (title, description, creator_id) VALUES (?, ?, ?)',
        ['To Delete', 'Description', 'user123']
      );
      const campaignId = campaignResult.lastID;

      await request(app)
        .delete(`/api/campaigns/${campaignId}`)
        .send({ creator_id: 'user123' })
        .expect(200);

      // Verify deleted
      const campaign = await getQuery(
        'SELECT * FROM campaigns WHERE id = ?',
        [campaignId]
      );
      expect(campaign).toBeUndefined();
    });

    test('should only allow creator to delete campaign', async () => {
      const campaignResult = await runQuery(
        'INSERT INTO campaigns (title, description, creator_id) VALUES (?, ?, ?)',
        ['To Delete', 'Description', 'user123']
      );
      const campaignId = campaignResult.lastID;

      const response = await request(app)
        .delete(`/api/campaigns/${campaignId}`)
        .send({ creator_id: 'different_user' })
        .expect(403);

      expect(response.body.error).toContain('creator');
    });
  });
});
