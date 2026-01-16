import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import { getVerifiedPin, hasVerifiedPin } from '../utils/campaignPin';
import './QuestionCard.css';

function QuestionCard({ question, campaignId, onVoteUpdate, onQuestionDeleted, number, previousNumber, hasAdminAccess }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(question.vote_count || 0);
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [voteUpdated, setVoteUpdated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(question.question_text || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const justToggledRef = useRef(false);
  const previousVoteCountRef = useRef(question.vote_count || 0);
  const previousNumberRef = useRef(number);

  const checkVoteStatus = useCallback(async () => {
    // Skip checking if we just toggled (to avoid race condition)
    if (justToggledRef.current) {
      justToggledRef.current = false;
      return;
    }
    try {
      const userId = getUserId();
      const result = await api.checkVote(question.id, userId);
      setHasVoted(result.hasVoted);
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  }, [question.id]);

  useEffect(() => {
    const newVoteCount = question.vote_count || 0;
    const oldVoteCount = previousVoteCountRef.current;
    
    // Update vote count
    setVoteCount(newVoteCount);
    
    // Update edited text when question changes (but not when we're actively editing)
    if (!isEditing && question.question_text) {
      setEditedText(question.question_text);
    }
    
    // Check if position changed (moved up in list) - only if we have previous number
    if (previousNumber !== undefined && previousNumber > 0 && number < previousNumber) {
      setIsMoving(true);
      setTimeout(() => setIsMoving(false), 1000);
    }
    
    // Update refs
    previousVoteCountRef.current = newVoteCount;
    previousNumberRef.current = number;
    
    // Check vote status when question ID changes or on initial load
    if (question.id) {
      checkVoteStatus();
    }
  }, [question.id, question.vote_count, question.question_text, number, previousNumber, checkVoteStatus, isEditing]);

  const handleUpvote = async () => {
    if (isVoting) return;

    setIsVoting(true);
    justToggledRef.current = true; // Mark that we just toggled
    
    // Trigger vote animation immediately
    setVoteUpdated(true);
    setTimeout(() => setVoteUpdated(false), 1200);
    
    try {
      const userId = getUserId();
      console.log('Toggling vote for question:', question.id, 'user:', userId, 'current hasVoted:', hasVoted);
      const result = await api.upvoteQuestion(question.id, userId);
      console.log('Toggle result:', result);
      // Update state immediately from API response
      setHasVoted(result.hasVoted);
      setVoteCount(result.vote_count);
      previousVoteCountRef.current = result.vote_count;
      
      // Call onVoteUpdate to refresh the list
      if (onVoteUpdate) {
        onVoteUpdate();
      }
    } catch (error) {
      console.error('Error toggling vote:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        questionId: question.id
      });
      justToggledRef.current = false; // Reset on error
      alert(`Error: ${error.message || 'Failed to toggle vote'}`);
    } finally {
      setIsVoting(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation(); // Prevent any parent click handlers
    
    if (!window.confirm('Are you sure you want to delete this question? This will also delete all votes. This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const userId = getUserId();
      const campaignPin = hasVerifiedPin(campaignId) ? getVerifiedPin(campaignId) : undefined;
      await api.deleteQuestion(question.id, userId, campaignPin);
      if (onQuestionDeleted) {
        onQuestionDeleted(question.id);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert(error.message || 'Failed to delete question');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedText(question.question_text || '');
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditedText(question.question_text || '');
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    
    if (!editedText.trim()) {
      alert('Question text cannot be empty');
      return;
    }

    if (editedText.trim() === question.question_text?.trim()) {
      // No changes, just cancel
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const userId = getUserId();
      const campaignPin = hasVerifiedPin(campaignId) ? getVerifiedPin(campaignId) : undefined;
      const updatedQuestion = await api.updateQuestion(question.id, editedText.trim(), userId, campaignPin);
      setIsEditing(false);
      // Update local state with the updated question
      if (onVoteUpdate) {
        onVoteUpdate();
      }
    } catch (error) {
      console.error('Error updating question:', error);
      alert(error.message || 'Failed to update question');
    } finally {
      setIsUpdating(false);
    }
  };

  // Determine if user can edit this question
  const canEdit = question.creator_id === getUserId() || hasAdminAccess;

  return (
    <div className={`question-card ${hasVoted ? 'voted' : ''} ${isMoving ? 'moving slide-up' : ''} ${voteUpdated ? 'vote-updated' : ''}`}>
      <span className="question-number">{number}</span>
      <div className="question-content">
        {isEditing ? (
          <div className="question-edit-form">
            <input
              type="text"
              className="question-edit-input"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              disabled={isUpdating}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveEdit(e);
                } else if (e.key === 'Escape') {
                  handleCancelEdit(e);
                }
              }}
            />
            <div className="question-edit-actions">
              <button
                className="save-question-btn"
                onClick={handleSaveEdit}
                disabled={isUpdating || !editedText.trim()}
                title="Save changes"
              >
                {isUpdating ? '...' : '✓'}
              </button>
              <button
                className="cancel-question-btn"
                onClick={handleCancelEdit}
                disabled={isUpdating}
                title="Cancel"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="question-text">{question.question_text?.trim()}</span>
            {Boolean(question.is_moderator_created) && (
              <span className="moderator-badge">Moderator</span>
            )}
          </>
        )}
      </div>
      {!isEditing && (
        <button
          className={`upvote-button ${hasVoted ? 'voted' : ''}`}
          onClick={handleUpvote}
          disabled={isVoting || isDeleting || isUpdating}
        >
          <span className="upvote-icon">{hasVoted ? '✓' : '↑'}</span>
          <span className="upvote-text">{hasVoted ? 'Voted' : 'Upvote'}</span>
          {voteCount > 0 && <span className="vote-count-inline">{voteCount}</span>}
        </button>
      )}
      {canEdit && !isEditing && (
        <>
          <button
            className="edit-question-btn"
            onClick={handleEdit}
            disabled={isDeleting || isUpdating}
            title="Edit question"
          >
            ✎
          </button>
          {hasAdminAccess && (
            <button
              className="delete-question-btn"
              onClick={handleDelete}
              disabled={isDeleting || isUpdating}
              title="Delete question"
            >
              {isDeleting ? '...' : '×'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default QuestionCard;

