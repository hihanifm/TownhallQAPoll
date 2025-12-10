const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../db/database');

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
    
    res.json(campaigns);
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
    
    res.json(campaign);
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
    
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

