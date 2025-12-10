const express = require('express');
const router = express.Router();
const sseService = require('../services/sseService');

// GET /api/sse/campaigns/:campaignId - SSE endpoint for campaign updates
router.get('/campaigns/:campaignId', (req, res) => {
  const { campaignId } = req.params;
  
  // Subscribe this client to updates for this campaign
  sseService.subscribe(campaignId, res);
  
  // Handle client disconnect
  res.on('close', () => {
    sseService.unsubscribe(campaignId, res);
  });
});

// GET /api/sse/campaigns - SSE endpoint for all campaign updates (campaign list)
router.get('/campaigns', (req, res) => {
  // Use 'all' as the campaignId for campaign list updates
  sseService.subscribe('all', res);
  
  // Handle client disconnect
  res.on('close', () => {
    sseService.unsubscribe('all', res);
  });
});

module.exports = router;

