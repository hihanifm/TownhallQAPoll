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
  }, [question.id, question.vote_count, number, previousNumber, checkVoteStatus]);

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

  return (
    <div className={`question-card ${hasVoted ? 'voted' : ''} ${isMoving ? 'moving slide-up' : ''} ${voteUpdated ? 'vote-updated' : ''}`}>
      <span className="question-number">{number}</span>
      <div className="question-content">
        <span className="question-text">{question.question_text?.trim()}</span>
        {Boolean(question.is_moderator_created) && (
          <span className="moderator-badge">Moderator</span>
        )}
      </div>
      <button
        className={`upvote-button ${hasVoted ? 'voted' : ''}`}
        onClick={handleUpvote}
        disabled={isVoting || isDeleting}
      >
        <span className="upvote-icon">{hasVoted ? '✓' : '↑'}</span>
        <span className="upvote-text">{hasVoted ? 'Voted' : 'Upvote'}</span>
        {voteCount > 0 && <span className="vote-count-inline">{voteCount}</span>}
      </button>
      {hasAdminAccess && (
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
  );
}

export default QuestionCard;

