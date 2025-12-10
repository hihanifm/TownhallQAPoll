import { useState, useEffect } from 'react';
import { api } from '../services/api';
import './CampaignList.css';

function CampaignList({ selectedCampaignId, onCampaignSelect, onCampaignCreated }) {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCampaigns();
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
      const campaignData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null
      };
      
      const newCampaign = await api.createCampaign(campaignData);
      setCampaigns([newCampaign, ...campaigns]);
      setFormData({ title: '', description: '' });
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

  const handleCloseCampaign = async (e, campaignId) => {
    e.stopPropagation(); // Prevent campaign selection
    
    if (!window.confirm('Are you sure you want to close this campaign?')) {
      return;
    }

    try {
      const updatedCampaign = await api.closeCampaign(campaignId);
      setCampaigns(campaigns.map(c => c.id === campaignId ? updatedCampaign : c));
      // If the closed campaign was selected, deselect it
      if (selectedCampaignId === campaignId && onCampaignSelect) {
        onCampaignSelect(null);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCampaign = async (e, campaignId) => {
    e.stopPropagation(); // Prevent campaign selection
    
    if (!window.confirm('Are you sure you want to delete this campaign? This will delete all questions and votes. This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteCampaign(campaignId);
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      // If the deleted campaign was selected, deselect it
      if (selectedCampaignId === campaignId && onCampaignSelect) {
        onCampaignSelect(null);
      }
    } catch (err) {
      alert(err.message);
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
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
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
          campaigns.map(campaign => (
            <div
              key={campaign.id}
              className={`campaign-item ${selectedCampaignId === campaign.id ? 'selected' : ''}`}
            >
              <div 
                className="campaign-content"
                onClick={() => onCampaignSelect && onCampaignSelect(campaign.id)}
              >
                <div className="campaign-title">{campaign.title}</div>
                <div className="campaign-meta">
                  <span className={`campaign-status ${campaign.status === 'closed' ? 'status-closed' : 'status-active'}`}>
                    {campaign.status}
                  </span>
                  <span className="campaign-questions">
                    {campaign.question_count || 0} questions
                  </span>
                </div>
                {campaign.description && (
                  <div className="campaign-description">{campaign.description}</div>
                )}
              </div>
              <div className="campaign-actions">
                {campaign.status === 'active' && (
                  <button
                    className="close-campaign-btn"
                    onClick={(e) => handleCloseCampaign(e, campaign.id)}
                    title="Close campaign"
                  >
                    Close
                  </button>
                )}
                <button
                  className="delete-campaign-btn"
                  onClick={(e) => handleDeleteCampaign(e, campaign.id)}
                  title="Delete campaign"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CampaignList;

