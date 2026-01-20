import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import { getFingerprint } from '../utils/browserFingerprint';
import { getVerifiedPin } from '../utils/feedbackPin';
import { formatRelativeTime, formatDateTime } from '../utils/dateFormat';
import './FeedbackCard.css';

function FeedbackCard({ feedback, onVoteUpdate, onFeedbackClosed, number, previousNumber, hasAdminAccess }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(feedback.vote_count || 0);
  const [isVoting, setIsVoting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [voteUpdated, setVoteUpdated] = useState(false);
  const [fingerprintHash, setFingerprintHash] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(feedback.feedback_text || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const justToggledRef = useRef(false);
  const previousVoteCountRef = useRef(feedback.vote_count || 0);
  const previousNumberRef = useRef(number);
  
  const isClosed = feedback.status === 'closed';
  
  // Determine if user can edit this feedback (only creator, not admin)
  const canEdit = feedback.creator_id === getUserId();

  // Get browser fingerprint on component mount
  useEffect(() => {
    getFingerprint().then(hash => {
      setFingerprintHash(hash);
    }).catch(error => {
      console.error('Error getting fingerprint:', error);
    });
  }, []);

  const checkVoteStatus = useCallback(async () => {
    // Skip checking if we just toggled (to avoid race condition)
    if (justToggledRef.current) {
      justToggledRef.current = false;
      return;
    }
    // Wait for fingerprint if not yet loaded
    if (!fingerprintHash) {
      return;
    }
    try {
      const userId = getUserId();
      const result = await api.checkFeedbackVote(feedback.id, userId, fingerprintHash);
      setHasVoted(result.hasVoted);
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  }, [feedback.id, fingerprintHash]);

  useEffect(() => {
    const newVoteCount = feedback.vote_count || 0;
    
    // Update vote count
    setVoteCount(newVoteCount);
    
    // Update edited text when feedback changes (but not when we're actively editing)
    if (!isEditing && feedback.feedback_text) {
      setEditedText(feedback.feedback_text);
    }
    
    // Check if position changed (moved up in list) - only if we have previous number
    if (previousNumber !== undefined && previousNumber > 0 && number < previousNumber) {
      setIsMoving(true);
      setTimeout(() => setIsMoving(false), 1000);
    }
    
    // Update refs
    previousVoteCountRef.current = newVoteCount;
    previousNumberRef.current = number;
    
    // Check vote status when feedback ID changes or on initial load (only for open feedback)
    if (feedback.id && feedback.status !== 'closed') {
      checkVoteStatus();
    }
  }, [feedback.id, feedback.vote_count, feedback.status, feedback.feedback_text, number, previousNumber, checkVoteStatus, isEditing]);

  const handleUpvote = async () => {
    if (isVoting || isClosed) return;
    
    // Require fingerprint before voting
    if (!fingerprintHash) {
      alert('Error: Browser fingerprint not available. Please refresh the page and try again.');
      return;
    }

    setIsVoting(true);
    justToggledRef.current = true; // Mark that we just toggled
    
    // Trigger vote animation immediately
    setVoteUpdated(true);
    setTimeout(() => setVoteUpdated(false), 1200);
    
    try {
      const userId = getUserId();
      console.log('Toggling vote for feedback:', feedback.id, 'user:', userId, 'current hasVoted:', hasVoted);
      const result = await api.upvoteFeedback(feedback.id, userId, fingerprintHash);
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
      justToggledRef.current = false; // Reset on error
      alert(`Error: ${error.message || 'Failed to toggle vote'}`);
    } finally {
      setIsVoting(false);
    }
  };

  const handleCloseFeedback = async () => {
    if (isClosing || isClosed) return;
    
    if (!window.confirm('Are you sure you want to close this feedback?')) {
      return;
    }

    setIsClosing(true);
    try {
      const pin = getVerifiedPin();
      if (!pin) {
        alert('Error: PIN not available. Please verify your PIN again.');
        return;
      }
      await api.closeFeedback(feedback.id, pin);
      if (onFeedbackClosed) {
        onFeedbackClosed(feedback.id);
      }
      if (onVoteUpdate) {
        onVoteUpdate();
      }
    } catch (error) {
      console.error('Error closing feedback:', error);
      alert(error.message || 'Failed to close feedback');
    } finally {
      setIsClosing(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedText(feedback.feedback_text || '');
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditedText(feedback.feedback_text || '');
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    
    if (!editedText.trim()) {
      alert('Feedback text cannot be empty');
      return;
    }

    if (editedText.trim() === feedback.feedback_text?.trim()) {
      // No changes, just cancel
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const userId = getUserId();
      const updatedFeedback = await api.updateFeedback(feedback.id, editedText.trim(), userId);
      setIsEditing(false);
      // Refresh the list
      if (onVoteUpdate) {
        onVoteUpdate();
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      alert(error.message || 'Failed to update feedback');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`feedback-card-wrapper ${hasVoted ? 'voted' : ''} ${isMoving ? 'moving slide-up' : ''} ${voteUpdated ? 'vote-updated' : ''} ${isClosed ? 'closed' : ''}`}>
      <div className={`feedback-card ${hasVoted ? 'voted' : ''} ${isMoving ? 'moving slide-up' : ''} ${voteUpdated ? 'vote-updated' : ''} ${isClosed ? 'closed' : ''}`}>
        <span className="feedback-number">{number}</span>
        <div className="feedback-content">
          {isEditing ? (
            <div className="feedback-edit-form">
              <input
                type="text"
                className="feedback-edit-input"
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
              <div className="feedback-edit-actions">
                <button
                  className="save-feedback-btn"
                  onClick={handleSaveEdit}
                  disabled={isUpdating || !editedText.trim()}
                  title="Save changes"
                >
                  {isUpdating ? '...' : '✓'}
                </button>
                <button
                  className="cancel-feedback-btn"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="feedback-text-container">
              <span className="feedback-text">{feedback.feedback_text?.trim()}</span>
              {isClosed && (
                <span className="feedback-status-badge closed-badge">Closed</span>
              )}
              {feedback.created_at && (
                <span className="feedback-timestamp" title={formatDateTime(feedback.created_at)}>
                  {formatRelativeTime(feedback.created_at)}
                </span>
              )}
            </div>
          )}
        </div>
        {canEdit && !isEditing && (
          <button
            className="edit-feedback-btn"
            onClick={handleEdit}
            disabled={isClosing || isVoting || isUpdating}
            title="Edit feedback"
          >
            ✎
          </button>
        )}
        {hasAdminAccess && !isClosed && !isEditing && (
          <button
            className="close-feedback-btn"
            onClick={handleCloseFeedback}
            disabled={isClosing || isVoting}
            title="Close feedback"
          >
            {isClosing ? '...' : 'Close'}
          </button>
        )}
        {!isEditing && (
          <button
            className={`upvote-button ${hasVoted ? 'voted' : ''} ${isClosed ? 'disabled' : ''}`}
            onClick={handleUpvote}
            disabled={isVoting || isClosed}
            title={isClosed ? 'Cannot vote on closed feedback' : ''}
          >
            <span className="upvote-icon">{hasVoted ? '✓' : '↑'}</span>
            <span className="upvote-text">{hasVoted ? 'Voted' : 'Upvote'}</span>
            {voteCount > 0 && <span className="vote-count-inline">{voteCount}</span>}
          </button>
        )}
      </div>
    </div>
  );
}

export default FeedbackCard;
