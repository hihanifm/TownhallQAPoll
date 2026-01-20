/**
 * API helper functions for E2E tests
 */

const API_BASE_URL = 'http://localhost:33001/api';

/**
 * Generate a test user ID
 */
export function generateUserId() {
  return `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a campaign
 * @param {Object} request - Playwright request context
 * @param {string} title - Campaign title
 * @param {string} description - Campaign description (optional)
 * @param {string} creatorId - Creator user ID
 * @param {string} creatorName - Creator name (optional)
 * @param {string} pin - Campaign PIN (optional)
 * @returns {Promise<Object>} Created campaign object
 */
export async function createCampaign(request, title, description = null, creatorId, creatorName = null, pin = null) {
  const response = await request.post(`${API_BASE_URL}/campaigns`, {
    data: {
      title,
      description,
      creator_id: creatorId,
      creator_name: creatorName,
      pin,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create campaign: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Create a question for a campaign
 * @param {Object} request - Playwright request context
 * @param {number} campaignId - Campaign ID
 * @param {string} questionText - Question text
 * @param {string} creatorId - Creator user ID (required)
 * @returns {Promise<Object>} Created question object
 */
export async function createQuestion(request, campaignId, questionText, creatorId = null) {
  // Generate a default creator ID if not provided
  const questionCreatorId = creatorId || generateUserId();
  
  const response = await request.post(`${API_BASE_URL}/campaigns/${campaignId}/questions`, {
    data: {
      question_text: questionText,
      creator_id: questionCreatorId,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create question: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Update a question
 * @param {Object} request - Playwright request context
 * @param {number} questionId - Question ID
 * @param {string} questionText - Updated question text
 * @param {string} creatorId - Creator user ID (optional if using PIN)
 * @param {string} campaignPin - Campaign PIN (optional if using creator_id)
 * @returns {Promise<Object>} Updated question object
 */
export async function updateQuestion(request, questionId, questionText, creatorId = null, campaignPin = null) {
  const body = campaignPin 
    ? { question_text: questionText, campaign_pin: campaignPin }
    : { question_text: questionText, creator_id: creatorId };
  
  const response = await request.patch(`${API_BASE_URL}/questions/${questionId}`, {
    data: body,
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to update question: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Generate a test fingerprint hash for a user ID
 * In a real browser, this would be generated from browser characteristics,
 * but for tests we generate a consistent hash from the user ID
 * @param {string} userId - User ID
 * @returns {string} Fingerprint hash
 */
function generateTestFingerprint(userId) {
  // Simple hash function for test purposes
  let hash = 0;
  const str = `test-fingerprint-${userId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `test-${Math.abs(hash).toString(36)}`;
}

/**
 * Upvote a question (toggles vote on/off)
 * @param {Object} request - Playwright request context
 * @param {number} questionId - Question ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Vote response with vote_count and hasVoted
 */
export async function upvoteQuestion(request, questionId, userId) {
  // Generate a test fingerprint hash for this user
  // In a real browser, this would be generated from browser characteristics
  const fingerprintHash = generateTestFingerprint(userId);
  
  const response = await request.post(`${API_BASE_URL}/questions/${questionId}/upvote`, {
    data: {
      user_id: userId,
      fingerprint_hash: fingerprintHash,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to upvote question: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Get campaign details
 * @param {Object} request - Playwright request context
 * @param {number} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign object
 */
export async function getCampaign(request, campaignId) {
  const response = await request.get(`${API_BASE_URL}/campaigns/${campaignId}`);
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to get campaign: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Get questions for a campaign
 * @param {Object} request - Playwright request context
 * @param {number} campaignId - Campaign ID
 * @returns {Promise<Array>} Array of question objects
 */
export async function getQuestions(request, campaignId) {
  const response = await request.get(`${API_BASE_URL}/campaigns/${campaignId}/questions`);
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to get questions: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Verify PIN for a campaign
 * @param {Object} request - Playwright request context
 * @param {number} campaignId - Campaign ID
 * @param {string} pin - PIN to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyCampaignPin(request, campaignId, pin) {
  const response = await request.post(`${API_BASE_URL}/campaigns/${campaignId}/verify-pin`, {
    data: {
      pin,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to verify PIN: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Close a campaign
 * @param {Object} request - Playwright request context
 * @param {number} campaignId - Campaign ID
 * @param {string} creatorId - Creator user ID (optional if using PIN)
 * @param {string} campaignPin - Campaign PIN (optional if using creator_id)
 * @returns {Promise<Object>} Updated campaign object
 */
export async function closeCampaign(request, campaignId, creatorId = null, campaignPin = null) {
  const body = campaignPin 
    ? { campaign_pin: campaignPin }
    : { creator_id: creatorId };
  
  const response = await request.patch(`${API_BASE_URL}/campaigns/${campaignId}/close`, {
    data: body,
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to close campaign: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Delete a campaign
 * @param {Object} request - Playwright request context
 * @param {number} campaignId - Campaign ID
 * @param {string} creatorId - Creator user ID (optional if using PIN)
 * @param {string} campaignPin - Campaign PIN (optional if using creator_id)
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteCampaign(request, campaignId, creatorId = null, campaignPin = null) {
  const body = campaignPin 
    ? { campaign_pin: campaignPin }
    : { creator_id: creatorId };
  
  const response = await request.delete(`${API_BASE_URL}/campaigns/${campaignId}`, {
    data: body,
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to delete campaign: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Delete a question
 * @param {Object} request - Playwright request context
 * @param {number} questionId - Question ID
 * @param {string} creatorId - Creator user ID (optional if using PIN)
 * @param {string} campaignPin - Campaign PIN (optional if using creator_id)
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteQuestion(request, questionId, creatorId = null, campaignPin = null) {
  const body = campaignPin 
    ? { campaign_pin: campaignPin }
    : { creator_id: creatorId };
  
  const response = await request.delete(`${API_BASE_URL}/questions/${questionId}`, {
    data: body,
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to delete question: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Create a comment on a question
 * @param {Object} request - Playwright request context
 * @param {number} questionId - Question ID
 * @param {string} commentText - Comment text
 * @param {string} creatorId - Creator user ID (optional if using PIN)
 * @param {string} campaignPin - Campaign PIN (optional if using creator_id)
 * @returns {Promise<Object>} Created comment object
 */
export async function createComment(request, questionId, commentText, creatorId = null, campaignPin = null) {
  const body = { comment_text: commentText };
  if (creatorId) {
    body.creator_id = creatorId;
  }
  if (campaignPin) {
    body.campaign_pin = campaignPin;
  }
  
  const response = await request.post(`${API_BASE_URL}/questions/${questionId}/comments`, {
    data: body,
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create comment: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Update a comment
 * @param {Object} request - Playwright request context
 * @param {number} questionId - Question ID
 * @param {number} commentId - Comment ID
 * @param {string} commentText - Updated comment text
 * @param {string} creatorId - Creator user ID (optional if using PIN)
 * @param {string} campaignPin - Campaign PIN (optional if using creator_id)
 * @returns {Promise<Object>} Updated comment object
 */
export async function updateComment(request, questionId, commentId, commentText, creatorId = null, campaignPin = null) {
  const body = { comment_text: commentText };
  if (creatorId) {
    body.creator_id = creatorId;
  }
  if (campaignPin) {
    body.campaign_pin = campaignPin;
  }
  
  const response = await request.patch(`${API_BASE_URL}/questions/${questionId}/comments/${commentId}`, {
    data: body,
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to update comment: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Delete a comment
 * @param {Object} request - Playwright request context
 * @param {number} questionId - Question ID
 * @param {number} commentId - Comment ID
 * @param {string} creatorId - Creator user ID (optional if using PIN)
 * @param {string} campaignPin - Campaign PIN (optional if using creator_id)
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteComment(request, questionId, commentId, creatorId = null, campaignPin = null) {
  const body = {};
  if (creatorId) {
    body.creator_id = creatorId;
  }
  if (campaignPin) {
    body.campaign_pin = campaignPin;
  }
  
  const response = await request.delete(`${API_BASE_URL}/questions/${questionId}/comments/${commentId}`, {
    data: body,
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to delete comment: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Get all feedback
 * @param {Object} request - Playwright request context
 * @param {string} sortBy - Sort by 'votes' or 'time' (optional, defaults to 'votes')
 * @returns {Promise<Array>} Array of feedback objects
 */
export async function getFeedback(request, sortBy = 'votes') {
  const params = sortBy ? `?sort=${sortBy}` : '';
  const response = await request.get(`${API_BASE_URL}/feedback${params}`);
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to get feedback: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Create feedback
 * @param {Object} request - Playwright request context
 * @param {string} feedbackText - Feedback text
 * @param {string} creatorId - Creator user ID
 * @returns {Promise<Object>} Created feedback object
 */
export async function createFeedback(request, feedbackText, creatorId) {
  const response = await request.post(`${API_BASE_URL}/feedback`, {
    data: {
      feedback_text: feedbackText,
      creator_id: creatorId,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create feedback: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Upvote feedback (toggles vote on/off)
 * @param {Object} request - Playwright request context
 * @param {number} feedbackId - Feedback ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Vote response with vote_count and hasVoted
 */
export async function upvoteFeedback(request, feedbackId, userId) {
  // Generate a test fingerprint hash for this user
  // In a real browser, this would be generated from browser characteristics
  const fingerprintHash = generateTestFingerprint(userId);
  
  const response = await request.post(`${API_BASE_URL}/feedback/${feedbackId}/upvote`, {
    data: {
      user_id: userId,
      fingerprint_hash: fingerprintHash,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to upvote feedback: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Update feedback (only by creator)
 * @param {Object} request - Playwright request context
 * @param {number} feedbackId - Feedback ID
 * @param {string} feedbackText - Updated feedback text
 * @param {string} creatorId - Creator user ID (required)
 * @returns {Promise<Object>} Updated feedback object
 */
export async function updateFeedback(request, feedbackId, feedbackText, creatorId) {
  const response = await request.patch(`${API_BASE_URL}/feedback/${feedbackId}`, {
    data: {
      feedback_text: feedbackText,
      creator_id: creatorId,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to update feedback: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Verify feedback PIN for admin access
 * @param {Object} request - Playwright request context
 * @param {string} pin - PIN to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyFeedbackPin(request, pin) {
  const response = await request.post(`${API_BASE_URL}/feedback/verify-pin`, {
    data: {
      pin,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to verify feedback PIN: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Close feedback (requires admin PIN)
 * @param {Object} request - Playwright request context
 * @param {number} feedbackId - Feedback ID
 * @param {string} pin - Admin PIN
 * @returns {Promise<Object>} Updated feedback object
 */
export async function closeFeedback(request, feedbackId, pin) {
  const response = await request.patch(`${API_BASE_URL}/feedback/${feedbackId}/close`, {
    data: {
      feedback_pin: pin,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to close feedback: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Check if backend is running
 * @param {Object} request - Playwright request context
 * @returns {Promise<boolean>} True if backend is running
 */
export async function checkBackendHealth(request) {
  try {
    const response = await request.get(`${API_BASE_URL}/health`);
    return response.ok();
  } catch (error) {
    return false;
  }
}
