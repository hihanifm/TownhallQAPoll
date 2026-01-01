import { API_BASE_URL } from '../config/apiConfig';

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

  closeCampaign: async (campaignId, creatorId) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/close`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ creator_id: creatorId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to close campaign');
    }
    return response.json();
  },

  deleteCampaign: async (campaignId, creatorId) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ creator_id: creatorId }),
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

  createQuestion: async (campaignId, questionText) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question_text: questionText }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create question');
    }
    return response.json();
  },

  checkVote: async (questionId, userId) => {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/votes?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to check vote');
    return response.json();
  },

  deleteQuestion: async (questionId, creatorId) => {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ creator_id: creatorId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete question');
    }
    return response.json();
  },

  // Votes
  upvoteQuestion: async (questionId, userId) => {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/upvote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
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

