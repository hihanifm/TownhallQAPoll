const express = require('express');
const router = express.Router();
const { getQuery, runQuery } = require('../db/database');

// POST /api/questions/:id/upvote - Toggle upvote on a question
router.post('/questions/:id/upvote', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // Check if question exists
    const question = await getQuery(
      'SELECT * FROM questions WHERE id = ?',
      [id]
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Check if user has already voted
    const existingVote = await getQuery(
      'SELECT * FROM votes WHERE question_id = ? AND user_id = ?',
      [id, user_id]
    );
    
    let hasVoted = false;
    
    if (existingVote) {
      // Remove vote (toggle off)
      console.log('Removing vote for question:', id, 'user:', user_id);
      const deleteResult = await runQuery(
        'DELETE FROM votes WHERE question_id = ? AND user_id = ?',
        [id, user_id]
      );
      console.log('Delete result:', deleteResult);
      hasVoted = false;
    } else {
      // Create vote (toggle on)
      console.log('Adding vote for question:', id, 'user:', user_id);
      try {
        const insertResult = await runQuery(
          'INSERT INTO votes (question_id, user_id) VALUES (?, ?)',
          [id, user_id]
        );
        console.log('Insert result:', insertResult);
        hasVoted = true;
      } catch (insertError) {
        // If it's a constraint error (duplicate), the vote already exists
        if (insertError.code === 'SQLITE_CONSTRAINT') {
          console.log('Constraint error - vote already exists, setting hasVoted to true');
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
    
    // Double-check the vote status after the operation
    const finalVoteCheck = await getQuery(
      'SELECT * FROM votes WHERE question_id = ? AND user_id = ?',
      [id, user_id]
    );
    
    console.log('Final vote check:', { hasVoted, finalVoteCheck: !!finalVoteCheck, voteCount: voteCount.count });
    
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

