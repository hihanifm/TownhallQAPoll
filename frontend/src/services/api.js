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
    const body = {};
    if (creatorId) {
      body.creator_id = creatorId;
    }
    if (campaignPin) {
      body.campaign_pin = campaignPin;
    }
    
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
    const body = {};
    if (creatorId) {
      body.creator_id = creatorId;
    }
    if (campaignPin) {
      body.campaign_pin = campaignPin;
    }
    
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
    const body = { question_text: questionText };
    if (creatorId) {
      body.creator_id = creatorId;
    }
    if (campaignPin) {
      body.campaign_pin = campaignPin;
    }
    
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
    const body = {};
    if (creatorId) {
      body.creator_id = creatorId;
    }
    if (campaignPin) {
      body.campaign_pin = campaignPin;
    }
    
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

  // Comments
  createComment: async (questionId, commentText, creatorId, campaignPin) => {
    const body = { comment_text: commentText };
    if (creatorId) {
      body.creator_id = creatorId;
    }
    if (campaignPin) {
      body.campaign_pin = campaignPin;
    }
    
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create comment');
    }
    return response.json();
  },

  updateComment: async (questionId, commentId, commentText, creatorId, campaignPin) => {
    const body = { comment_text: commentText };
    if (creatorId) {
      body.creator_id = creatorId;
    }
    if (campaignPin) {
      body.campaign_pin = campaignPin;
    }
    
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/comments/${commentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update comment');
    }
    return response.json();
  },

  deleteComment: async (questionId, commentId, creatorId, campaignPin) => {
    const body = {};
    if (creatorId) {
      body.creator_id = creatorId;
    }
    if (campaignPin) {
      body.campaign_pin = campaignPin;
    }
    
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete comment');
    }
    return response.json();
  },

  // Feedback
  getFeedback: async (sortBy = 'votes') => {
    const params = new URLSearchParams();
    if (sortBy) {
      params.append('sort', sortBy);
    }
    const url = `${API_BASE_URL}/feedback${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch feedback');
    return response.json();
  },

  createFeedback: async (feedbackText, creatorId) => {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feedback_text: feedbackText, creator_id: creatorId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create feedback');
    }
    return response.json();
  },

  checkFeedbackVote: async (feedbackId, userId, fingerprintHash) => {
    const params = new URLSearchParams({ user_id: userId });
    if (fingerprintHash) {
      params.append('fingerprint_hash', fingerprintHash);
    }
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}/votes?${params}`);
    if (!response.ok) throw new Error('Failed to check vote');
    return response.json();
  },

  upvoteFeedback: async (feedbackId, userId, fingerprintHash) => {
    if (!fingerprintHash) {
      throw new Error('fingerprint_hash is required');
    }
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}/upvote`, {
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

  verifyFeedbackPin: async (pin) => {
    const response = await fetch(`${API_BASE_URL}/feedback/verify-pin`, {
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

  updateFeedback: async (feedbackId, feedbackText, creatorId) => {
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feedback_text: feedbackText, creator_id: creatorId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update feedback');
    }
    return response.json();
  },

  closeFeedback: async (feedbackId, pin) => {
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}/close`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feedback_pin: pin }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to close feedback');
    }
    return response.json();
  },

  // Surveys
  getSurveys: async ({ creatorId } = {}) => {
    const params = new URLSearchParams();
    if (creatorId) params.append('creator_id', creatorId);
    const qs = params.toString();
    const response = await fetch(`${API_BASE_URL}/surveys${qs ? `?${qs}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch surveys');
    return response.json();
  },

  getSurvey: async (id, { participantPin, surveyPin, creatorId } = {}) => {
    const params = new URLSearchParams();
    if (participantPin) params.append('participant_pin', participantPin);
    if (surveyPin) params.append('survey_pin', surveyPin);
    if (creatorId) params.append('creator_id', creatorId);
    const qs = params.toString();
    const response = await fetch(`${API_BASE_URL}/surveys/${id}${qs ? `?${qs}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch survey');
    return response.json();
  },

  createSurvey: async (surveyData) => {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(surveyData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create survey');
    }
    return response.json();
  },

  verifySurveyPin: async (surveyId, pin) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify PIN');
    }
    return response.json();
  },

  verifySurveyParticipantPin: async (surveyId, pin) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/verify-participant-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify participant PIN');
    }
    return response.json();
  },

  getSurveySubmissionStatus: async (surveyId, userId, { participantPin, surveyPin, creatorId } = {}) => {
    const params = new URLSearchParams({ user_id: userId });
    if (participantPin) params.append('participant_pin', participantPin);
    if (surveyPin) params.append('survey_pin', surveyPin);
    if (creatorId) params.append('creator_id', creatorId);
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/submission-status?${params}`);
    if (!response.ok) throw new Error('Failed to check submission status');
    return response.json();
  },

  submitSurvey: async (surveyId, userId, answers, { fingerprintHash, participantPin, creatorId } = {}) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        fingerprint_hash: fingerprintHash || null,
        answers,
        participant_pin: participantPin || null,
        creator_id: creatorId || null,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit survey');
    }
    return response.json();
  },

  getSurveyResults: async (surveyId, { userId, surveyPin, creatorId } = {}) => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (surveyPin) params.append('survey_pin', surveyPin);
    if (creatorId) params.append('creator_id', creatorId);
    const qs = params.toString();
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/results${qs ? `?${qs}` : ''}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch results');
    }
    return response.json();
  },

  downloadSurveyResponsesExport: async (surveyId, { creatorId, surveyPin } = {}) => {
    const params = new URLSearchParams();
    if (creatorId) params.append('creator_id', creatorId);
    if (surveyPin) params.append('survey_pin', surveyPin);
    const qs = params.toString();
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/export${qs ? `?${qs}` : ''}`);
    if (!response.ok) {
      let message = 'Failed to export responses';
      try {
        const error = await response.json();
        message = error.error || message;
      } catch {
        /* non-JSON error body */
      }
      throw new Error(message);
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `survey-${surveyId}-responses.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  closeSurvey: async (surveyId, creatorId, surveyPin) => {
    const body = {};
    if (creatorId) body.creator_id = creatorId;
    if (surveyPin) body.survey_pin = surveyPin;
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/close`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to close survey');
    }
    return response.json();
  },

  deleteSurvey: async (surveyId, creatorId, surveyPin) => {
    const body = {};
    if (creatorId) body.creator_id = creatorId;
    if (surveyPin) body.survey_pin = surveyPin;
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete survey');
    }
    return response.json();
  },

  // System status
  getSystemStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/status`);
    if (!response.ok) throw new Error('Failed to fetch system status');
    return response.json();
  },
};

