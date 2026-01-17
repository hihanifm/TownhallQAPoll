import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import { getFingerprint } from '../utils/browserFingerprint';
import { getVerifiedPin, hasVerifiedPin } from '../utils/campaignPin';
import { formatRelativeTime, formatDateTime } from '../utils/dateFormat';
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
  const [fingerprintHash, setFingerprintHash] = useState(null);
  const [comments, setComments] = useState(question.comments || []);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [showAddComment, setShowAddComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const justToggledRef = useRef(false);
  const previousVoteCountRef = useRef(question.vote_count || 0);
  const previousNumberRef = useRef(number);

  // Get browser fingerprint on component mount
  useEffect(() => {
    getFingerprint().then(hash => {
      setFingerprintHash(hash);
    }).catch(error => {
      console.error('Error getting fingerprint:', error);
      // Continue without fingerprint (will fallback to user_id only)
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
      const result = await api.checkVote(question.id, userId, fingerprintHash);
      setHasVoted(result.hasVoted);
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  }, [question.id, fingerprintHash]);

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
    
    // Update comments when question changes
    if (question.comments) {
      setComments(question.comments);
    }
  }, [question.id, question.vote_count, question.question_text, question.comments, number, previousNumber, checkVoteStatus, isEditing]);

  const handleUpvote = async () => {
    if (isVoting) return;
    
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
      console.log('Toggling vote for question:', question.id, 'user:', userId, 'current hasVoted:', hasVoted);
      const result = await api.upvoteQuestion(question.id, userId, fingerprintHash);
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

  // Comment handlers
  const handleAddComment = () => {
    setShowAddComment(true);
  };

  const handleCancelAddComment = () => {
    setShowAddComment(false);
    setNewCommentText('');
  };

  const handleSaveComment = async () => {
    if (!newCommentText.trim()) {
      alert('Comment text cannot be empty');
      return;
    }

    setIsCreatingComment(true);
    try {
      const userId = getUserId();
      const campaignPin = hasVerifiedPin(campaignId) ? getVerifiedPin(campaignId) : undefined;
      await api.createComment(question.id, newCommentText.trim(), userId, campaignPin);
      setShowAddComment(false);
      setNewCommentText('');
      // Reload questions to get updated comments
      if (onVoteUpdate) {
        onVoteUpdate();
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      alert(error.message || 'Failed to create comment');
    } finally {
      setIsCreatingComment(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditedCommentText(comment.comment_text);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditedCommentText('');
  };

  const handleSaveEditComment = async (commentId) => {
    if (!editedCommentText.trim()) {
      alert('Comment text cannot be empty');
      return;
    }

    setIsUpdatingComment(true);
    try {
      const userId = getUserId();
      const campaignPin = hasVerifiedPin(campaignId) ? getVerifiedPin(campaignId) : undefined;
      await api.updateComment(question.id, commentId, editedCommentText.trim(), userId, campaignPin);
      setEditingCommentId(null);
      setEditedCommentText('');
      // Reload questions to get updated comments
      if (onVoteUpdate) {
        onVoteUpdate();
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      alert(error.message || 'Failed to update comment');
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    setIsDeletingComment(true);
    try {
      const userId = getUserId();
      const campaignPin = hasVerifiedPin(campaignId) ? getVerifiedPin(campaignId) : undefined;
      await api.deleteComment(question.id, commentId, userId, campaignPin);
      // Reload questions to get updated comments
      if (onVoteUpdate) {
        onVoteUpdate();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(error.message || 'Failed to delete comment');
    } finally {
      setIsDeletingComment(false);
    }
  };

  const toggleCommentExpand = (commentId, e) => {
    // Don't expand if clicking on buttons
    if (e.target.closest('.comment-actions')) {
      return;
    }
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  return (
    <div className={`question-card-wrapper ${hasVoted ? 'voted' : ''} ${isMoving ? 'moving slide-up' : ''} ${voteUpdated ? 'vote-updated' : ''}`}>
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
              <div className="question-text-container">
                <span className="question-text">{question.question_text?.trim()}</span>
                {Boolean(question.is_moderator_created) && (
                  <span className="moderator-badge">Moderator</span>
                )}
                {question.created_at && (
                  <span className="question-timestamp" title={formatDateTime(question.created_at)}>
                    {formatRelativeTime(question.created_at)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
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
      </div>
      
      {/* Comments Section */}
      {!isEditing && (
        <div className="comments-section">
          {comments.length > 0 && (
            <div className="comments-list">
              {comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  {editingCommentId === comment.id ? (
                    <div className="comment-edit-form">
                      <textarea
                        className="comment-edit-textarea"
                        value={editedCommentText}
                        onChange={(e) => setEditedCommentText(e.target.value)}
                        disabled={isUpdatingComment}
                        autoFocus
                        rows={3}
                      />
                      <div className="comment-edit-actions">
                        <button
                          className="save-comment-btn"
                          onClick={() => handleSaveEditComment(comment.id)}
                          disabled={isUpdatingComment || !editedCommentText.trim()}
                          title="Save changes"
                        >
                          {isUpdatingComment ? '...' : '✓'}
                        </button>
                        <button
                          className="cancel-comment-btn"
                          onClick={handleCancelEditComment}
                          disabled={isUpdatingComment}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="comment-content">
                      <div 
                        className={`comment-text ${expandedComments.has(comment.id) ? 'expanded' : 'collapsed'}`}
                        onClick={(e) => toggleCommentExpand(comment.id, e)}
                        style={{ cursor: 'pointer' }}
                      >
                        {comment.comment_text}
                        <span className="comment-timestamp-inline" title={formatDateTime(comment.updated_at || comment.created_at)}>
                          {' '}{formatRelativeTime(comment.updated_at || comment.created_at)}
                        </span>
                      </div>
                      {hasAdminAccess && (
                        <div className="comment-actions">
                          <button
                            className="edit-comment-btn"
                            onClick={() => handleEditComment(comment)}
                            disabled={isDeletingComment || isUpdatingComment || isCreatingComment}
                            title="Edit comment"
                          >
                            ✎
                          </button>
                          <button
                            className="delete-comment-btn"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={isDeletingComment || isUpdatingComment || isCreatingComment}
                            title="Delete comment"
                          >
                            {isDeletingComment ? '...' : '×'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {hasAdminAccess && (
            <div className="add-comment-section">
              {showAddComment ? (
                <div className="add-comment-form">
                  <textarea
                    className="add-comment-textarea"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    disabled={isCreatingComment}
                    autoFocus
                    rows={3}
                  />
                  <div className="add-comment-actions">
                    <button
                      className="save-comment-btn"
                      onClick={handleSaveComment}
                      disabled={isCreatingComment || !newCommentText.trim()}
                      title="Save comment"
                    >
                      {isCreatingComment ? '...' : '✓ Save'}
                    </button>
                    <button
                      className="cancel-comment-btn"
                      onClick={handleCancelAddComment}
                      disabled={isCreatingComment}
                      title="Cancel"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="add-comment-btn"
                  onClick={handleAddComment}
                  disabled={isDeletingComment || isUpdatingComment || isCreatingComment}
                  title="Add comment"
                >
                  + Add Comment
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuestionCard;

