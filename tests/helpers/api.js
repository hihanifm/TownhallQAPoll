/**
 * API helper functions for E2E tests
 */

const API_BASE_URL = 'http://localhost:3001/api';

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
 * @returns {Promise<Object>} Created campaign object
 */
export async function createCampaign(request, title, description = null, creatorId, creatorName = null) {
  const response = await request.post(`${API_BASE_URL}/campaigns`, {
    data: {
      title,
      description,
      creator_id: creatorId,
      creator_name: creatorName,
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
 * @returns {Promise<Object>} Created question object
 */
export async function createQuestion(request, campaignId, questionText) {
  const response = await request.post(`${API_BASE_URL}/campaigns/${campaignId}/questions`, {
    data: {
      question_text: questionText,
    },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create question: ${error.error || response.statusText()}`);
  }
  
  return await response.json();
}

/**
 * Upvote a question (toggles vote on/off)
 * @param {Object} request - Playwright request context
 * @param {number} questionId - Question ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Vote response with vote_count and hasVoted
 */
export async function upvoteQuestion(request, questionId, userId) {
  const response = await request.post(`${API_BASE_URL}/questions/${questionId}/upvote`, {
    data: {
      user_id: userId,
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
