const express = require('express');
const router = express.Router();
const { getQuery, runQuery } = require('../db/database');
const sseService = require('../services/sseService');

// POST /api/questions/:id/upvote - Toggle upvote on a question
router.post('/questions/:id/upvote', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, fingerprint_hash } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    if (!fingerprint_hash) {
      return res.status(400).json({ error: 'fingerprint_hash is required' });
    }
    
    // Check if question exists
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Check if this fingerprint has already voted (primary check - prevents incognito abuse)
    const existingVoteByFingerprint = await getQuery(
      'SELECT * FROM votes WHERE question_id = ? AND fingerprint_hash = ?',
      [id, fingerprint_hash]
    );
    
    // Also check by user_id for backwards compatibility and toggle behavior
    const existingVoteByUserId = await getQuery(
      'SELECT * FROM votes WHERE question_id = ? AND user_id = ?',
      [id, user_id]
    );
    
    let hasVoted = false;
    
    // If vote exists by fingerprint OR user_id, remove it (toggle off)
    if (existingVoteByFingerprint || existingVoteByUserId) {
      // Remove vote (toggle off) - delete by fingerprint_hash to prevent incognito abuse
      console.log('Removing vote for question:', id, 'fingerprint:', fingerprint_hash.substring(0, 8) + '...');
      const deleteResult = await runQuery(
        'DELETE FROM votes WHERE question_id = ? AND fingerprint_hash = ?',
        [id, fingerprint_hash]
      );
      console.log('Delete result:', deleteResult);
      hasVoted = false;
    } else {
      // Create vote (toggle on)
      console.log('Adding vote for question:', id, 'fingerprint:', fingerprint_hash.substring(0, 8) + '...');
      try {
        const insertResult = await runQuery(
          'INSERT INTO votes (question_id, user_id, fingerprint_hash) VALUES (?, ?, ?)',
          [id, user_id, fingerprint_hash]
        );
        console.log('Insert result:', insertResult);
        hasVoted = true;
      } catch (insertError) {
        // If it's a constraint error (duplicate), the vote already exists
        if (insertError.code === 'SQLITE_CONSTRAINT') {
          console.log('Constraint error - vote already exists (fingerprint or user_id), setting hasVoted to true');
          hasVoted = true;
        } else {
          console.error('Error inserting vote:', insertError);
          throw insertError;
        }
      }
    }
    
    // Get updated vote count
    const voteCount = await getQuery(
      'SELECT COUNT(*) as count FROM votes WHERE question_id = ?',
      [id]
    );
    
    // Double-check the vote status after the operation (check by fingerprint)
    const finalVoteCheck = await getQuery(
      'SELECT * FROM votes WHERE question_id = ? AND fingerprint_hash = ?',
      [id, fingerprint_hash]
    );
    
    console.log('Final vote check:', { hasVoted, finalVoteCheck: !!finalVoteCheck, voteCount: voteCount.count });
    
    // Broadcast update to all clients watching this campaign
    sseService.broadcast(question.campaign_id.toString(), {
      type: 'vote_updated',
      question_id: parseInt(id),
      vote_count: voteCount.count
    });
    
    res.json({ 
      success: true, 
      vote_count: voteCount.count,
      hasVoted: !!finalVoteCheck
    });
  } catch (error) {
    console.error('Error in upvote endpoint:', error);
    next(error);
  }
});

module.exports = router;

