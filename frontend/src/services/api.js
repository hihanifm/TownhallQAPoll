const API_BASE_URL = '/api';

export const api = {
  // Campaigns
  getCampaigns: async () => {
    const response = await fetch(`${API_BASE_URL}/campaigns`);
    if (!response.ok) throw new Error('Failed to fetch campaigns');
    return response.json();
  },

  getCampaign: async (id) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`);
    if (!response.ok) throw new Error('Failed to fetch campaign');
    return response.json();
  },

  createCampaign: async (campaignData) => {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaignData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create campaign');
    }
    return response.json();
  },

  verifyCampaignPin: async (campaignId, pin) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify PIN');
    }
    return response.json();
  },

  closeCampaign: async (campaignId, creatorId, campaignPin) => {
    const body = campaignPin 
      ? { campaign_pin: campaignPin }
      : { creator_id: creatorId };
    
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/close`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to close campaign');
    }
    return response.json();
  },

  deleteCampaign: async (campaignId, creatorId, campaignPin) => {
    const body = campaignPin 
      ? { campaign_pin: campaignPin }
      : { creator_id: creatorId };
    
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete campaign');
    }
    return response.json();
  },

  // Questions
  getQuestions: async (campaignId) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/questions`);
    if (!response.ok) throw new Error('Failed to fetch questions');
    return response.json();
  },

  createQuestion: async (campaignId, questionText, creatorId) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question_text: questionText, creator_id: creatorId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create question');
    }
    return response.json();
  },

  updateQuestion: async (questionId, questionText, creatorId, campaignPin) => {
    const body = campaignPin 
      ? { question_text: questionText, campaign_pin: campaignPin }
      : { question_text: questionText, creator_id: creatorId };
    
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update question');
    }
    return response.json();
  },

  checkVote: async (questionId, userId, fingerprintHash) => {
    const params = new URLSearchParams({ user_id: userId });
    if (fingerprintHash) {
      params.append('fingerprint_hash', fingerprintHash);
    }
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/votes?${params}`);
    if (!response.ok) throw new Error('Failed to check vote');
    return response.json();
  },

  deleteQuestion: async (questionId, creatorId, campaignPin) => {
    const body = campaignPin 
      ? { campaign_pin: campaignPin }
      : { creator_id: creatorId };
    
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete question');
    }
    return response.json();
  },

  // Votes
  upvoteQuestion: async (questionId, userId, fingerprintHash) => {
    if (!fingerprintHash) {
      throw new Error('fingerprint_hash is required');
    }
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/upvote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        user_id: userId,
        fingerprint_hash: fingerprintHash 
      }),
    });
    if (!response.ok) {
      let errorMessage = 'Failed to upvote';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },
};

