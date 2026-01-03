import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import './QuestionCard.css';

function QuestionCard({ question, campaignId, onVoteUpdate, onQuestionDeleted, onQuestionUpdated, number, previousNumber, isCampaignCreator }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(question.vote_count || 0);
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.question_text || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [voteUpdated, setVoteUpdated] = useState(false);
  const justToggledRef = useRef(false);
  const previousVoteCountRef = useRef(question.vote_count || 0);
  const previousNumberRef = useRef(number);
  const hasCheckedVoteStatusRef = useRef(false);
  
  const userId = getUserId();
  const isQuestionCreator = question.user_id && question.user_id === userId;

  const checkVoteStatus = useCallback(async () => {
    // Skip checking if we just toggled (to avoid race condition)
    if (justToggledRef.current) {
      justToggledRef.current = false;
      return;
    }
    // Only check vote status on initial load, not on every vote_count change
    // The API response from upvote already updates hasVoted state
    try {
      const userId = getUserId();
      const result = await api.checkVote(question.id, userId);
      setHasVoted(result.hasVoted);
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  }, [question.id]);

  // Sync editText with external question text changes (only when not editing)
  useEffect(() => {
    if (!isEditing && question.question_text && question.question_text !== editText) {
      setEditText(question.question_text);
    }
  }, [question.question_text, isEditing]);

  // Check vote status only once when question ID is set (initial load)
  useEffect(() => {
    if (question.id && !isEditing && !hasCheckedVoteStatusRef.current) {
      hasCheckedVoteStatusRef.current = true;
      checkVoteStatus();
    }
    // Reset when question ID changes
    return () => {
      if (question.id) {
        hasCheckedVoteStatusRef.current = false;
      }
    };
  }, [question.id, isEditing, checkVoteStatus]);

  // Handle vote count updates and position changes (separate from vote status check)
  useEffect(() => {
    const newVoteCount = question.vote_count || 0;
    
    // Update vote count
    setVoteCount(newVoteCount);
    
    // Check if position changed (moved up in list) - only if we have previous number
    if (previousNumber !== undefined && previousNumber > 0 && number < previousNumber) {
      setIsMoving(true);
      setTimeout(() => setIsMoving(false), 1000);
    }
    
    // Update refs
    previousVoteCountRef.current = newVoteCount;
    previousNumberRef.current = number;
  }, [question.vote_count, number, previousNumber]);

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
      
      // Don't call onVoteUpdate - SSE will handle the update for all clients
      // The vote count is already updated from the API response above
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

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(question.question_text || '');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(question.question_text || '');
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    
    if (!editText.trim()) {
      alert('Question text cannot be empty');
      return;
    }

    if (editText.trim() === question.question_text?.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const updatedQuestion = await api.updateQuestion(question.id, editText.trim(), userId);
      setIsEditing(false);
      if (onQuestionUpdated) {
        onQuestionUpdated(updatedQuestion);
      }
    } catch (error) {
      console.error('Error updating question:', error);
      alert(error.message || 'Failed to update question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation(); // Prevent any parent click handlers
    
    if (!window.confirm('Are you sure you want to delete this question? This will also delete all votes. This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteQuestion(question.id, userId);
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

  return (
    <div className={`question-card ${hasVoted ? 'voted' : ''} ${isMoving ? 'moving slide-up' : ''} ${voteUpdated ? 'vote-updated' : ''} ${isEditing ? 'editing' : ''}`}>
      <div className="question-left-actions">
        <span className="question-number">{number}</span>
        {!isEditing && isQuestionCreator && (
          <button
            className="edit-question-btn"
            onClick={handleEdit}
            disabled={isDeleting || isVoting}
            title="Edit question"
          >
            ✎
          </button>
        )}
      </div>
      <div className="question-content">
        {isEditing ? (
          <div className="edit-question-form">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveEdit(e);
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              disabled={isSaving}
              autoFocus
              className="edit-question-input"
            />
            <div className="edit-actions">
              <button
                className="save-edit-btn"
                onClick={handleSaveEdit}
                disabled={isSaving || !editText.trim()}
                title="Save (Enter)"
              >
                {isSaving ? '...' : '✓'}
              </button>
              <button
                className="cancel-edit-btn"
                onClick={handleCancelEdit}
                disabled={isSaving}
                title="Cancel (Esc)"
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="question-text">{question.question_text?.trim()}</span>
            {Boolean(question.is_moderator_created) && (
              <span className="moderator-badge">Moderator</span>
            )}
            {question.updated_at && question.updated_at !== question.created_at && (
              <span className="edited-badge" title="This question was edited">(edited)</span>
            )}
          </>
        )}
      </div>
      {!isEditing && (
        <div className="question-right-actions">
          <button
            className={`upvote-button ${hasVoted ? 'voted' : ''}`}
            onClick={handleUpvote}
            disabled={isVoting || isDeleting}
          >
            <span className="upvote-icon">{hasVoted ? '✓' : '↑'}</span>
            <span className="upvote-text">{hasVoted ? 'Voted' : 'Upvote'}</span>
            {voteCount > 0 && <span className="vote-count-inline">{voteCount}</span>}
          </button>
          {isCampaignCreator && (
            <button
              className="delete-question-btn"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete question"
            >
              {isDeleting ? '...' : '×'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default QuestionCard;

