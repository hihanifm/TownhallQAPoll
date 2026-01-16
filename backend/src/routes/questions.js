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
    
    // Fetch comments for all questions
    const questionIds = questionsWithVotes.map(q => q.id);
    let commentsMap = {};
    
    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => '?').join(',');
      const comments = await allQuery(
        `SELECT * FROM comments WHERE question_id IN (${placeholders}) ORDER BY created_at ASC`,
        questionIds
      );
      
      // Group comments by question_id
      comments.forEach(comment => {
        if (!commentsMap[comment.question_id]) {
          commentsMap[comment.question_id] = [];
        }
        commentsMap[comment.question_id].push({
          id: comment.id,
          comment_text: comment.comment_text,
          created_at: comment.created_at,
          updated_at: comment.updated_at
        });
      });
    }
    
    // Attach comments to questions
    const questionsWithComments = questionsWithVotes.map(q => ({
      ...q,
      comments: commentsMap[q.id] || []
    }));
    
    res.json(questionsWithComments);
  } catch (error) {
    next(error);
  }
});

// POST /api/campaigns/:id/questions - Create new question
router.post('/campaigns/:campaignId/questions', async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const { question_text, creator_id } = req.body;
    
    if (!question_text || question_text.trim() === '') {
      return res.status(400).json({ error: 'Question text is required' });
    }
    
    if (!creator_id) {
      return res.status(400).json({ error: 'creator_id is required' });
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
      'INSERT INTO questions (campaign_id, question_text, is_moderator_created, creator_id) VALUES (?, ?, ?, ?)',
      [campaignId, question_text.trim(), 0, creator_id]
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

// PATCH /api/questions/:id - Update a question
router.patch('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question_text, creator_id, campaign_pin } = req.body;
    
    if (!question_text || question_text.trim() === '') {
      return res.status(400).json({ error: 'Question text is required' });
    }
    
    if (!creator_id && !campaign_pin) {
      return res.status(400).json({ error: 'Either creator_id or campaign_pin is required' });
    }
    
    // Get the question
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Get the campaign to check authorization
    const campaign = await getQuery(
      'SELECT id, creator_id, pin FROM campaigns WHERE id = ?',
      [question.campaign_id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check authorization: user must be question creator, campaign creator, or have valid PIN
    const isQuestionCreator = question.creator_id && question.creator_id === creator_id;
    const isCampaignCreator = campaign.creator_id && campaign.creator_id === creator_id;
    const isPinValid = campaign_pin && campaign.pin && campaign.pin === campaign_pin;
    
    if (!isQuestionCreator && !isCampaignCreator && !isPinValid) {
      return res.status(403).json({ error: 'Only the question creator, campaign creator, or someone with a valid PIN can edit questions' });
    }
    
    // Update the question
    await runQuery(
      'UPDATE questions SET question_text = ? WHERE id = ?',
      [question_text.trim(), id]
    );
    
    // Get updated question with vote counts
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

// GET /api/questions/:id/votes - Check if user has voted
// Note: This route is mounted at /api, so the full path is /api/questions/:id/votes
router.get('/questions/:id/votes', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, fingerprint_hash } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // Check by fingerprint_hash first (prevents incognito abuse), fallback to user_id
    let vote = null;
    if (fingerprint_hash) {
      vote = await getQuery(
        'SELECT * FROM votes WHERE question_id = ? AND fingerprint_hash = ?',
        [id, fingerprint_hash]
      );
    }
    
    // If not found by fingerprint, check by user_id for backwards compatibility
    if (!vote) {
      vote = await getQuery(
        'SELECT * FROM votes WHERE question_id = ? AND user_id = ?',
        [id, user_id]
      );
    }
    
    res.json({ hasVoted: !!vote });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/questions/:id - Delete a question
router.delete('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { creator_id, campaign_pin } = req.body;
    
    if (!creator_id && !campaign_pin) {
      return res.status(400).json({ error: 'Either creator_id or campaign_pin is required' });
    }
    
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Get the campaign to check authorization
    const campaign = await getQuery(
      'SELECT id, creator_id, pin FROM campaigns WHERE id = ?',
      [question.campaign_id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check if user is the campaign creator
    const isCreator = campaign.creator_id && campaign.creator_id === creator_id;
    
    // Check if PIN is provided and matches
    const isPinValid = campaign_pin && campaign.pin && campaign.pin === campaign_pin;
    
    if (!isCreator && !isPinValid) {
      return res.status(403).json({ error: 'Only the campaign creator or someone with a valid PIN can delete questions' });
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

// POST /api/questions/:questionId/comments - Create a new comment
router.post('/questions/:questionId/comments', async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { comment_text, creator_id, campaign_pin } = req.body;
    
    if (!comment_text || comment_text.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    if (!creator_id && !campaign_pin) {
      return res.status(400).json({ error: 'Either creator_id or campaign_pin is required' });
    }
    
    // Get the question
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [questionId]
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Get the campaign to check authorization
    const campaign = await getQuery(
      'SELECT id, creator_id, pin FROM campaigns WHERE id = ?',
      [question.campaign_id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check authorization: must be campaign creator or have valid PIN
    const isCampaignCreator = campaign.creator_id && campaign.creator_id === creator_id;
    const isPinValid = campaign_pin && campaign.pin && campaign.pin === campaign_pin;
    
    if (!isCampaignCreator && !isPinValid) {
      return res.status(403).json({ error: 'Only the campaign creator or someone with a valid PIN can create comments' });
    }
    
    // Create the comment
    const result = await runQuery(
      'INSERT INTO comments (question_id, comment_text) VALUES (?, ?)',
      [questionId, comment_text.trim()]
    );
    
    const comment = await getQuery(
      'SELECT * FROM comments WHERE id = ?',
      [result.lastID]
    );
    
    // Broadcast new comment to all clients watching this campaign
    sseService.broadcast(question.campaign_id.toString(), {
      type: 'comment_created',
      question_id: parseInt(questionId),
      comment: {
        id: comment.id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        updated_at: comment.updated_at
      }
    });
    
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/questions/:questionId/comments/:commentId - Update a comment
router.patch('/questions/:questionId/comments/:commentId', async (req, res, next) => {
  try {
    const { questionId, commentId } = req.params;
    const { comment_text, creator_id, campaign_pin } = req.body;
    
    if (!comment_text || comment_text.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    if (!creator_id && !campaign_pin) {
      return res.status(400).json({ error: 'Either creator_id or campaign_pin is required' });
    }
    
    // Get the comment
    const comment = await getQuery(
      'SELECT * FROM comments WHERE id = ? AND question_id = ?',
      [commentId, questionId]
    );
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Get the question
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [questionId]
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Get the campaign to check authorization
    const campaign = await getQuery(
      'SELECT id, creator_id, pin FROM campaigns WHERE id = ?',
      [question.campaign_id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check authorization: must be campaign creator or have valid PIN
    const isCampaignCreator = campaign.creator_id && campaign.creator_id === creator_id;
    const isPinValid = campaign_pin && campaign.pin && campaign.pin === campaign_pin;
    
    if (!isCampaignCreator && !isPinValid) {
      return res.status(403).json({ error: 'Only the campaign creator or someone with a valid PIN can update comments' });
    }
    
    // Update the comment
    await runQuery(
      'UPDATE comments SET comment_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [comment_text.trim(), commentId]
    );
    
    const updatedComment = await getQuery(
      'SELECT * FROM comments WHERE id = ?',
      [commentId]
    );
    
    // Broadcast update to all clients watching this campaign
    sseService.broadcast(question.campaign_id.toString(), {
      type: 'comment_updated',
      question_id: parseInt(questionId),
      comment: {
        id: updatedComment.id,
        comment_text: updatedComment.comment_text,
        created_at: updatedComment.created_at,
        updated_at: updatedComment.updated_at
      }
    });
    
    res.json(updatedComment);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/questions/:questionId/comments/:commentId - Delete a comment
router.delete('/questions/:questionId/comments/:commentId', async (req, res, next) => {
  try {
    const { questionId, commentId } = req.params;
    const { creator_id, campaign_pin } = req.body;
    
    if (!creator_id && !campaign_pin) {
      return res.status(400).json({ error: 'Either creator_id or campaign_pin is required' });
    }
    
    // Get the comment
    const comment = await getQuery(
      'SELECT * FROM comments WHERE id = ? AND question_id = ?',
      [commentId, questionId]
    );
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Get the question
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [questionId]
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Get the campaign to check authorization
    const campaign = await getQuery(
      'SELECT id, creator_id, pin FROM campaigns WHERE id = ?',
      [question.campaign_id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check authorization: must be campaign creator or have valid PIN
    const isCampaignCreator = campaign.creator_id && campaign.creator_id === creator_id;
    const isPinValid = campaign_pin && campaign.pin && campaign.pin === campaign_pin;
    
    if (!isCampaignCreator && !isPinValid) {
      return res.status(403).json({ error: 'Only the campaign creator or someone with a valid PIN can delete comments' });
    }
    
    // Delete the comment
    await runQuery(
      'DELETE FROM comments WHERE id = ?',
      [commentId]
    );
    
    // Broadcast deletion to all clients watching this campaign
    sseService.broadcast(question.campaign_id.toString(), {
      type: 'comment_deleted',
      question_id: parseInt(questionId),
      comment_id: parseInt(commentId)
    });
    
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

