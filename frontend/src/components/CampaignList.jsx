import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import './CampaignList.css';

function CampaignList({ selectedCampaignId, onCampaignSelect, onCampaignCreated }) {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', creator_name: '', pin: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  // SSE connection for real-time campaign updates
  useEffect(() => {
    const eventSource = new EventSource('/api/sse/campaigns');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          console.log('SSE connected for campaigns');
          break;
        case 'campaign_created':
          // Add new campaign to the list
          setCampaigns(prevCampaigns => [data.campaign, ...prevCampaigns]);
          break;
        case 'campaign_updated':
          // Update existing campaign
          setCampaigns(prevCampaigns =>
            prevCampaigns.map(c => c.id === data.campaign.id ? data.campaign : c)
          );
          break;
        case 'campaign_deleted':
          // Remove deleted campaign from the list
          setCampaigns(prevCampaigns =>
            prevCampaigns.filter(c => c.id !== data.campaign_id)
          );
          break;
        default:
          // For any other update, refresh the full list
          loadCampaigns();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      // Optionally reconnect after a delay
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const loadCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a campaign title');
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = getUserId();
      const campaignData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        creator_id: userId,
        creator_name: formData.creator_name.trim() || null,
        pin: formData.pin.trim() || null
      };
      
      const newCampaign = await api.createCampaign(campaignData);
      setCampaigns([newCampaign, ...campaigns]);
      setFormData({ title: '', description: '', creator_name: '', pin: '' });
      setShowCreateForm(false);
      if (onCampaignCreated) {
        onCampaignCreated(newCampaign);
      }
      // Auto-select the new campaign
      if (onCampaignSelect) {
        onCampaignSelect(newCampaign.id);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="campaign-list">
        <div className="loading">Loading campaigns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="campaign-list">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="campaign-list">
      <div className="campaign-list-header">
        <h2>Campaigns</h2>
        <button 
          className="create-campaign-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Campaign'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-campaign-form">
          <h3>Create New Campaign</h3>
          <form onSubmit={handleCreateCampaign}>
            <input
              type="text"
              placeholder="Campaign Title *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={isSubmitting}
            />
            <input
              type="text"
              placeholder="Your Name (optional)"
              value={formData.creator_name}
              onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
              disabled={isSubmitting}
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={isSubmitting}
            />
            <input
              type="password"
              placeholder="Admin PIN (optional - share with others to grant admin access)"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Campaign'}
            </button>
          </form>
        </div>
      )}

      <div className="campaign-items">
        {campaigns.length === 0 ? (
          <div className="empty-state">
            <p>No campaigns yet. Create one to get started!</p>
          </div>
        ) : (
          campaigns.slice(0, 25).map(campaign => (
            <div
              key={campaign.id}
              className={`campaign-item ${selectedCampaignId === campaign.id ? 'selected' : ''}`}
            >
              <div 
                className="campaign-content"
                onClick={() => onCampaignSelect && onCampaignSelect(campaign.id)}
              >
                <div className="campaign-header">
                  <div className="campaign-title">
                    {campaign.title}
                  </div>
                  <div className="campaign-status-container">
                    {campaign.has_pin && (
                      <svg 
                        className="pin-icon" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        title="PIN protected"
                      >
                        <path d="M12 17v5"></path>
                        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 0 0-6 0v3.76"></path>
                      </svg>
                    )}
                    <span className={`campaign-status ${campaign.status === 'closed' ? 'status-closed' : 'status-active'}`}>
                      {campaign.status}
                    </span>
                  </div>
                </div>
                <div className="campaign-meta">
                  <span className="campaign-questions">
                    {campaign.question_count || 0} questions
                  </span>
                  {campaign.creator_name && (
                    <span className="campaign-creator">
                      Created by {campaign.creator_name}
                    </span>
                  )}
                </div>
                {campaign.description && (
                  <div className="campaign-description">{campaign.description}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CampaignList;

