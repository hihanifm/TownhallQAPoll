const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../db/database');
const sseService = require('../services/sseService');

// GET /api/campaigns - List all campaigns
router.get('/', async (req, res, next) => {
  try {
    const campaigns = await allQuery(
      `SELECT c.*, 
       COUNT(DISTINCT q.id) as question_count
       FROM campaigns c
       LEFT JOIN questions q ON c.id = q.campaign_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    
    // Calculate last_updated for each campaign (latest question or vote activity)
    const campaignsWithTimestamps = await Promise.all(campaigns.map(async (campaign) => {
      // Get latest question creation time
      const latestQuestion = await getQuery(
        'SELECT MAX(created_at) as max_time FROM questions WHERE campaign_id = ?',
        [campaign.id]
      );
      
      // Get latest vote time for questions in this campaign
      const latestVote = await getQuery(
        `SELECT MAX(v.created_at) as max_time 
         FROM votes v
         INNER JOIN questions q ON v.question_id = q.id
         WHERE q.campaign_id = ?`,
        [campaign.id]
      );
      
      // Determine the most recent activity
      const questionTime = latestQuestion?.max_time || null;
      const voteTime = latestVote?.max_time || null;
      
      let lastUpdated = campaign.created_at;
      if (questionTime && (!lastUpdated || new Date(questionTime) > new Date(lastUpdated))) {
        lastUpdated = questionTime;
      }
      if (voteTime && (!lastUpdated || new Date(voteTime) > new Date(lastUpdated))) {
        lastUpdated = voteTime;
      }
      
      return {
        ...campaign,
        last_updated: lastUpdated
      };
    }));
    
    res.json(campaignsWithTimestamps);
  } catch (error) {
    next(error);
  }
});

// GET /api/campaigns/:id - Get single campaign
router.get('/:id', async (req, res, next) => {
  try {
    const campaign = await getQuery(
      'SELECT * FROM campaigns WHERE id = ?',
      [req.params.id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Calculate last_updated (latest question or vote activity)
    const latestQuestion = await getQuery(
      'SELECT MAX(created_at) as max_time FROM questions WHERE campaign_id = ?',
      [campaign.id]
    );
    
    const latestVote = await getQuery(
      `SELECT MAX(v.created_at) as max_time 
       FROM votes v
       INNER JOIN questions q ON v.question_id = q.id
       WHERE q.campaign_id = ?`,
      [campaign.id]
    );
    
    const questionTime = latestQuestion?.max_time || null;
    const voteTime = latestVote?.max_time || null;
    
    let lastUpdated = campaign.created_at;
    if (questionTime && (!lastUpdated || new Date(questionTime) > new Date(lastUpdated))) {
      lastUpdated = questionTime;
    }
    if (voteTime && (!lastUpdated || new Date(voteTime) > new Date(lastUpdated))) {
      lastUpdated = voteTime;
    }
    
    res.json({
      ...campaign,
      last_updated: lastUpdated
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', async (req, res, next) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = await runQuery(
      'INSERT INTO campaigns (title, description, status) VALUES (?, ?, ?)',
      [title, description || null, 'active']
    );
    
    const campaignId = result.lastID;
    
    const campaign = await getQuery(
      'SELECT * FROM campaigns WHERE id = ?',
      [campaignId]
    );
    
    // Broadcast new campaign to all clients
    sseService.broadcast('all', {
      type: 'campaign_created',
      campaign: campaign
    });
    
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/campaigns/:id/close - Close a campaign
router.patch('/:id/close', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const campaign = await getQuery(
      'SELECT * FROM campaigns WHERE id = ?',
      [id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    await runQuery(
      'UPDATE campaigns SET status = ? WHERE id = ?',
      ['closed', id]
    );
    
    const updatedCampaign = await getQuery(
      'SELECT * FROM campaigns WHERE id = ?',
      [id]
    );
    
    // Broadcast campaign update to all clients
    sseService.broadcast('all', {
      type: 'campaign_updated',
      campaign: updatedCampaign
    });
    
    res.json(updatedCampaign);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/campaigns/:id - Delete a campaign
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const campaign = await getQuery(
      'SELECT * FROM campaigns WHERE id = ?',
      [id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Delete all votes for questions in this campaign
    await runQuery(
      `DELETE FROM votes 
       WHERE question_id IN (SELECT id FROM questions WHERE campaign_id = ?)`,
      [id]
    );
    
    // Delete all questions in this campaign
    await runQuery(
      'DELETE FROM questions WHERE campaign_id = ?',
      [id]
    );
    
    // Delete the campaign
    await runQuery(
      'DELETE FROM campaigns WHERE id = ?',
      [id]
    );
    
    // Broadcast campaign deletion to all clients
    sseService.broadcast('all', {
      type: 'campaign_deleted',
      campaign_id: parseInt(id)
    });
    
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

