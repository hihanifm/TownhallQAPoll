// SSE Service for real-time updates
class SSEService {
  constructor() {
    this.clients = new Map(); // Map of campaignId -> Set of response objects
  }

  // Subscribe a client to updates for a specific campaign
  subscribe(campaignId, res) {
    if (!this.clients.has(campaignId)) {
      this.clients.set(campaignId, new Set());
    }
    
    this.clients.get(campaignId).add(res);
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Handle client disconnect
    res.on('close', () => {
      this.unsubscribe(campaignId, res);
    });
  }

  // Unsubscribe a client
  unsubscribe(campaignId, res) {
    if (this.clients.has(campaignId)) {
      this.clients.get(campaignId).delete(res);
      if (this.clients.get(campaignId).size === 0) {
        this.clients.delete(campaignId);
      }
    }
  }

  // Broadcast an event to all clients subscribed to a campaign
  broadcast(campaignId, event) {
    if (!this.clients.has(campaignId)) {
      return;
    }

    const message = `data: ${JSON.stringify(event)}\n\n`;
    const clients = this.clients.get(campaignId);
    
    // Send to all clients and remove dead connections
    const deadClients = [];
    clients.forEach(res => {
      try {
        res.write(message);
      } catch (err) {
        console.error('Error sending SSE message:', err);
        deadClients.push(res);
      }
    });

    // Clean up dead connections
    deadClients.forEach(res => {
      this.unsubscribe(campaignId, res);
    });
  }

  // Broadcast to all campaigns (for campaign list updates)
  broadcastAll(event) {
    this.clients.forEach((clients, campaignId) => {
      this.broadcast(campaignId, event);
    });
  }
}

// Singleton instance
const sseService = new SSEService();

module.exports = sseService;

