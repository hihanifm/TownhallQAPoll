const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../db/database');

// GET /api/campaigns/:id/questions - Get questions for a campaign
router.get('/campaigns/:campaignId/questions', async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    
    const questions = await allQuery(
      `SELECT q.*, 
       COUNT(v.id) as vote_count,
       GROUP_CONCAT(v.user_id) as voters
       FROM questions q
       LEFT JOIN votes v ON q.id = v.question_id
       WHERE q.campaign_id = ?
       GROUP BY q.id
       ORDER BY vote_count DESC, q.created_at ASC`,
      [campaignId]
    );
    
    // Parse voters string to array for easier checking
    const questionsWithVotes = questions.map(q => ({
      ...q,
      voters: q.voters ? q.voters.split(',') : [],
      vote_count: q.vote_count || 0
    }));
    
    res.json(questionsWithVotes);
  } catch (error) {
    next(error);
  }
});

// POST /api/campaigns/:id/questions - Create new question
router.post('/campaigns/:campaignId/questions', async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const { question_text } = req.body;
    
    if (!question_text || question_text.trim() === '') {
      return res.status(400).json({ error: 'Question text is required' });
    }
    
    // Verify campaign exists
    const campaign = await getQuery(
      'SELECT * FROM campaigns WHERE id = ?',
      [campaignId]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const result = await runQuery(
      'INSERT INTO questions (campaign_id, question_text, is_moderator_created) VALUES (?, ?, ?)',
      [campaignId, question_text.trim(), 0]
    );
    
    const question = await getQuery(
      `SELECT q.*, 
       COUNT(v.id) as vote_count
       FROM questions q
       LEFT JOIN votes v ON q.id = v.question_id
       WHERE q.id = ?
       GROUP BY q.id`,
      [result.lastID]
    );
    
    res.status(201).json({
      ...question,
      vote_count: question.vote_count || 0,
      voters: []
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/questions/:id/votes - Check if user has voted
// Note: This route is mounted at /api, so the full path is /api/questions/:id/votes
router.get('/questions/:id/votes', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    const vote = await getQuery(
      'SELECT * FROM votes WHERE question_id = ? AND user_id = ?',
      [id, user_id]
    );
    
    res.json({ hasVoted: !!vote });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

