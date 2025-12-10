import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import './QuestionCard.css';

function QuestionCard({ question, campaignId, onVoteUpdate, number }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(question.vote_count || 0);
  const [isVoting, setIsVoting] = useState(false);
  const justToggledRef = useRef(false);

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
    setVoteCount(question.vote_count || 0);
    // Check vote status when question ID changes or on initial load
    if (question.id) {
      checkVoteStatus();
    }
  }, [question.id, checkVoteStatus]);

  const handleUpvote = async () => {
    if (isVoting) return;

    setIsVoting(true);
    justToggledRef.current = true; // Mark that we just toggled
    
    try {
      const userId = getUserId();
      console.log('Toggling vote for question:', question.id, 'user:', userId, 'current hasVoted:', hasVoted);
      const result = await api.upvoteQuestion(question.id, userId);
      console.log('Toggle result:', result);
      // Update state immediately from API response
      setHasVoted(result.hasVoted);
      setVoteCount(result.vote_count);
      
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

  return (
    <div className={`question-card ${hasVoted ? 'voted' : ''}`}>
      <span className="question-number">{number}</span>
      <div className="question-content">
        <span className="question-text">{question.question_text}</span>
        {question.is_moderator_created && (
          <span className="moderator-badge">Moderator</span>
        )}
      </div>
      <button
        className={`upvote-button ${hasVoted ? 'voted' : ''}`}
        onClick={handleUpvote}
        disabled={isVoting}
      >
        <span className="upvote-icon">{hasVoted ? '✓' : '↑'}</span>
        <span className="upvote-text">{hasVoted ? 'Voted' : 'Upvote'}</span>
      </button>
      <span className="vote-count">{voteCount}</span>
    </div>
  );
}

export default QuestionCard;

