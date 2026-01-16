const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../db/database');
const sseService = require('../services/sseService');

// GET /api/campaigns - List all campaigns
router.get('/', async (req, res, next) => {
  try {
    const campaigns = await allQuery(
      `SELECT c.id, c.title, c.description, c.created_at, c.status, c.creator_id, c.creator_name,
       COUNT(DISTINCT q.id) as question_count,
       CASE WHEN c.pin IS NOT NULL AND c.pin != '' THEN 1 ELSE 0 END as has_pin
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
        last_updated: lastUpdated,
        has_pin: campaign.has_pin === 1
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
      `SELECT id, title, description, created_at, status, creator_id, creator_name,
       CASE WHEN pin IS NOT NULL AND pin != '' THEN 1 ELSE 0 END as has_pin
       FROM campaigns WHERE id = ?`,
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
      last_updated: lastUpdated,
      has_pin: campaign.has_pin === 1
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to check if user is authorized (creator or PIN verified)
async function isAuthorized(campaignId, creatorId, campaignPin) {
  const campaign = await getQuery(
    'SELECT * FROM campaigns WHERE id = ?',
    [campaignId]
  );
  
  if (!campaign) {
    return { authorized: false, error: 'Campaign not found' };
  }
  
  // Check if user is the creator
  if (campaign.creator_id && campaign.creator_id === creatorId) {
    return { authorized: true };
  }
  
  // Check if PIN is provided and matches
  if (campaignPin && campaign.pin && campaign.pin === campaignPin) {
    return { authorized: true };
  }
  
  return { authorized: false, error: 'Not authorized' };
}

// POST /api/campaigns - Create new campaign
router.post('/', async (req, res, next) => {
  try {
    const { title, description, creator_id, creator_name, pin } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!creator_id) {
      return res.status(400).json({ error: 'creator_id is required' });
    }
    
    const result = await runQuery(
      'INSERT INTO campaigns (title, description, status, creator_id, creator_name, pin) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || null, 'active', creator_id, creator_name || null, pin || null]
    );
    
    const campaignId = result.lastID;
    
    const campaign = await getQuery(
      `SELECT id, title, description, created_at, status, creator_id, creator_name,
       CASE WHEN pin IS NOT NULL AND pin != '' THEN 1 ELSE 0 END as has_pin
       FROM campaigns WHERE id = ?`,
      [campaignId]
    );
    
    // Add has_pin boolean to response
    const campaignWithPin = {
      ...campaign,
      has_pin: campaign.has_pin === 1
    };
    
    // Broadcast new campaign to all clients (without PIN)
    sseService.broadcast('all', {
      type: 'campaign_created',
      campaign: campaignWithPin
    });
    
    res.status(201).json(campaignWithPin);
  } catch (error) {
    next(error);
  }
});

// POST /api/campaigns/:id/verify-pin - Verify PIN for a campaign
router.post('/:id/verify-pin', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }
    
    const campaign = await getQuery(
      'SELECT id, pin FROM campaigns WHERE id = ?',
      [id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    if (!campaign.pin) {
      return res.status(400).json({ error: 'This campaign does not have a PIN set' });
    }
    
    if (campaign.pin !== pin) {
      return res.status(403).json({ error: 'Invalid PIN' });
    }
    
    res.json({ success: true, message: 'PIN verified successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/campaigns/:id/close - Close a campaign
router.patch('/:id/close', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { creator_id, campaign_pin } = req.body;
    
    if (!creator_id && !campaign_pin) {
      return res.status(400).json({ error: 'Either creator_id or campaign_pin is required' });
    }
    
    const auth = await isAuthorized(id, creator_id || null, campaign_pin || null);
    
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.error || 'Only the campaign creator or someone with a valid PIN can close this campaign' });
    }
    
    await runQuery(
      'UPDATE campaigns SET status = ? WHERE id = ?',
      ['closed', id]
    );
    
    const updatedCampaign = await getQuery(
      `SELECT id, title, description, created_at, status, creator_id, creator_name,
       CASE WHEN pin IS NOT NULL AND pin != '' THEN 1 ELSE 0 END as has_pin
       FROM campaigns WHERE id = ?`,
      [id]
    );
    
    // Add has_pin boolean to response
    const campaignWithPin = {
      ...updatedCampaign,
      has_pin: updatedCampaign.has_pin === 1
    };
    
    // Broadcast campaign update to all clients
    sseService.broadcast('all', {
      type: 'campaign_updated',
      campaign: campaignWithPin
    });
    
    res.json(campaignWithPin);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/campaigns/:id - Delete a campaign
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { creator_id, campaign_pin } = req.body;
    
    if (!creator_id && !campaign_pin) {
      return res.status(400).json({ error: 'Either creator_id or campaign_pin is required' });
    }
    
    const auth = await isAuthorized(id, creator_id || null, campaign_pin || null);
    
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.error || 'Only the campaign creator or someone with a valid PIN can delete this campaign' });
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

