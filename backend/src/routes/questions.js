const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../db/database');
const sseService = require('../services/sseService');

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
    const { question_text, user_id } = req.body;
    
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
    
    // Check if campaign is active (can't add questions to closed campaigns)
    if (campaign.status === 'closed') {
      return res.status(403).json({ error: 'Cannot add questions to a closed campaign' });
    }
    
    const result = await runQuery(
      'INSERT INTO questions (campaign_id, question_text, user_id, is_moderator_created) VALUES (?, ?, ?, ?)',
      [campaignId, question_text.trim(), user_id || null, 0]
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
    
    const newQuestion = {
      ...question,
      vote_count: question.vote_count || 0,
      voters: []
    };
    
    // Broadcast new question to all clients watching this campaign
    sseService.broadcast(campaignId.toString(), {
      type: 'question_created',
      question: newQuestion
    });
    
    res.status(201).json(newQuestion);
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

// PATCH /api/questions/:id - Update a question
router.patch('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question_text, user_id } = req.body;
    
    if (!question_text || question_text.trim() === '') {
      return res.status(400).json({ error: 'Question text is required' });
    }
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // Get the question
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Get the campaign to check status
    const campaign = await getQuery(
      'SELECT * FROM campaigns WHERE id = ?',
      [question.campaign_id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check if campaign is active (can't edit questions in closed campaigns)
    if (campaign.status === 'closed') {
      return res.status(403).json({ error: 'Cannot edit questions in a closed campaign' });
    }
    
    // Check if user is the question creator
    if (!question.user_id) {
      return res.status(403).json({ error: 'This question has no creator. Only questions with a creator can be edited.' });
    }
    if (question.user_id !== user_id) {
      return res.status(403).json({ error: 'Only the question creator can edit this question' });
    }
    
    // Update the question
    await runQuery(
      'UPDATE questions SET question_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [question_text.trim(), id]
    );
    
    // Get updated question with vote count
    const updatedQuestion = await getQuery(
      `SELECT q.*, 
       COUNT(v.id) as vote_count
       FROM questions q
       LEFT JOIN votes v ON q.id = v.question_id
       WHERE q.id = ?
       GROUP BY q.id`,
      [id]
    );
    
    const questionWithVotes = {
      ...updatedQuestion,
      vote_count: updatedQuestion.vote_count || 0,
      voters: []
    };
    
    // Broadcast update to all clients watching this campaign
    sseService.broadcast(question.campaign_id.toString(), {
      type: 'question_updated',
      question: questionWithVotes
    });
    
    res.json(questionWithVotes);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/questions/:id - Delete a question
router.delete('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { creator_id } = req.body;
    
    if (!creator_id) {
      return res.status(400).json({ error: 'creator_id is required' });
    }
    
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Get the campaign to check if user is the creator
    const campaign = await getQuery(
      'SELECT * FROM campaigns WHERE id = ?',
      [question.campaign_id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check if user is the campaign creator
    if (!campaign.creator_id) {
      return res.status(403).json({ error: 'This campaign has no creator. Only campaigns with a creator can have questions deleted.' });
    }
    if (campaign.creator_id !== creator_id) {
      return res.status(403).json({ error: 'Only the campaign creator can delete questions' });
    }
    
    // Delete all votes for this question
    await runQuery(
      'DELETE FROM votes WHERE question_id = ?',
      [id]
    );
    
    // Delete the question
    await runQuery(
      'DELETE FROM questions WHERE id = ?',
      [id]
    );
    
    // Broadcast deletion to all clients watching this campaign
    sseService.broadcast(question.campaign_id.toString(), {
      type: 'question_deleted',
      question_id: parseInt(id)
    });
    
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

