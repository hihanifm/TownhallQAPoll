import { useState, useEffect } from 'react';
import { api } from '../services/api';
import QuestionCard from './QuestionCard';
import CreateQuestionForm from './CreateQuestionForm';
import { formatRelativeTime, formatDateTime } from '../utils/dateFormat';
import { getUserId } from '../utils/userId';
import { hasVerifiedPin, getVerifiedPin } from '../utils/campaignPin';
import './QuestionPanel.css';

function QuestionPanel({ campaignId, onCampaignClosed, onCampaignDeleted }) {
  const [questions, setQuestions] = useState([]);
  const [previousQuestions, setPreviousQuestions] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareFeedback, setShowShareFeedback] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
      loadQuestions();
    }
  }, [campaignId]);

  // SSE connection for real-time updates
  useEffect(() => {
    if (!campaignId) return;

    const eventSource = new EventSource(`/api/sse/campaigns/${campaignId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          console.log('SSE connected for campaign:', campaignId);
          break;
        case 'vote_updated':
          // Update vote count for the specific question
          setQuestions(prevQuestions => {
            const updated = prevQuestions.map(q => 
              q.id === data.question_id 
                ? { ...q, vote_count: data.vote_count }
                : q
            );
            // Re-sort by vote count
            return updated.sort((a, b) => b.vote_count - a.vote_count);
          });
          break;
        case 'question_created':
          // Add new question to the list
          setQuestions(prevQuestions => {
            const updated = [...prevQuestions, data.question];
            return updated.sort((a, b) => b.vote_count - a.vote_count);
          });
          break;
        case 'question_deleted':
          // Remove deleted question from the list
          setQuestions(prevQuestions => 
            prevQuestions.filter(q => q.id !== data.question_id)
          );
          break;
        case 'question_updated':
          // Update the question in the list
          setQuestions(prevQuestions => {
            const updated = prevQuestions.map(q => 
              q.id === data.question.id 
                ? { ...q, ...data.question }
                : q
            );
            // Re-sort by vote count
            return updated.sort((a, b) => b.vote_count - a.vote_count);
          });
          break;
        case 'comment_created':
          // Add new comment to the appropriate question
          setQuestions(prevQuestions => {
            return prevQuestions.map(q => {
              if (q.id === data.question_id) {
                return {
                  ...q,
                  comments: [...(q.comments || []), data.comment]
                };
              }
              return q;
            });
          });
          break;
        case 'comment_updated':
          // Update comment in the appropriate question
          setQuestions(prevQuestions => {
            return prevQuestions.map(q => {
              if (q.id === data.question_id) {
                return {
                  ...q,
                  comments: (q.comments || []).map(c => 
                    c.id === data.comment.id ? data.comment : c
                  )
                };
              }
              return q;
            });
          });
          break;
        case 'comment_deleted':
          // Remove comment from the appropriate question
          setQuestions(prevQuestions => {
            return prevQuestions.map(q => {
              if (q.id === data.question_id) {
                return {
                  ...q,
                  comments: (q.comments || []).filter(c => c.id !== data.comment_id)
                };
              }
              return q;
            });
          });
          break;
        default:
          // For any other update, refresh the full list
          loadQuestions();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      // Optionally reconnect after a delay
    };

    return () => {
      eventSource.close();
    };
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      const data = await api.getCampaign(campaignId);
      setCampaign(data);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error loading campaign:', err);
      setError(err.message || 'Campaign not found');
      setCampaign(null);
    }
  };

  const loadQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getQuestions(campaignId);
      // Sort by vote count (descending)
      const sortedQuestions = data.sort((a, b) => b.vote_count - a.vote_count);
      
      // Store previous questions for animation comparison
      setPreviousQuestions([...questions]);
      setQuestions(sortedQuestions);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleQuestionCreated = (newQuestion) => {
    loadQuestions(); // Reload to get updated list with vote counts
  };

  const handleVoteUpdate = () => {
    loadQuestions(); // Reload to update vote counts and rankings
  };

  const handleQuestionDeleted = (questionId) => {
    loadQuestions(); // Reload to remove deleted question from list
  };

  const handleCloseCampaign = async () => {
    if (!window.confirm('Are you sure you want to close this campaign?')) {
      return;
    }

    try {
      const userId = getUserId();
      const campaignPin = hasVerifiedPin(campaignId) ? getVerifiedPin(campaignId) : undefined;
      const updatedCampaign = await api.closeCampaign(campaignId, userId, campaignPin);
      setCampaign(updatedCampaign);
      if (onCampaignClosed) {
        onCampaignClosed(campaignId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!window.confirm('Are you sure you want to delete this campaign? This will delete all questions and votes. This action cannot be undone.')) {
      return;
    }

    try {
      const userId = getUserId();
      const campaignPin = hasVerifiedPin(campaignId) ? getVerifiedPin(campaignId) : undefined;
      await api.deleteCampaign(campaignId, userId, campaignPin);
      if (onCampaignDeleted) {
        onCampaignDeleted(campaignId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/campaign/${campaignId}`;
    const shareText = campaign 
      ? `Check out this campaign: ${campaign.title}`
      : 'Check out this campaign';

    // Try Web Share API first (works on mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign?.title || 'Townhall Q&A Poll',
          text: shareText,
          url: url,
        });
        return;
      } catch (err) {
        // User cancelled or error occurred, fall back to clipboard
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }

    // Fall back to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setShowShareFeedback(true);
      setTimeout(() => {
        setShowShareFeedback(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setShowShareFeedback(true);
        setTimeout(() => {
          setShowShareFeedback(false);
        }, 2000);
      } catch (err) {
        alert('Failed to copy URL. Please copy it manually: ' + url);
      }
      document.body.removeChild(textArea);
    }
  };

  if (!campaignId) {
    return (
      <div className="question-panel empty">
        <p>Select a campaign to view questions</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="question-panel">
        <div className="loading">Loading questions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="question-panel">
        <div className="error">
          <p>Error: {error}</p>
          {error.includes('not found') || error.includes('Failed to fetch campaign') ? (
            <p>This campaign may have been deleted or the ID is invalid.</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="question-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          {campaign && (
            <div className="campaign-title-container">
              <h2 className="campaign-title">
                {campaign.title}
                {campaign.has_pin && (
                  <svg 
                    className="pin-icon" 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    title="PIN protected"
                  >
                    <path d="M12 17v5"></path>
                    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 0 0-6 0v3.76"></path>
                  </svg>
                )}
              </h2>
              <button
                className="share-campaign-btn"
                onClick={handleShare}
                title="Share campaign"
                aria-label="Share campaign"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share
              </button>
            </div>
          )}
          <p className="panel-subtitle">While it may not be possible to answer every question, priority will be given to those questions with the most votes - so if you see an existing question that closely matches your concern, vote for it!</p>
        </div>
        <div className="question-stats">
          Total: {questions.length} questions
        </div>
      </div>

      {showShareFeedback && (
        <div className="share-feedback">
          <span>✓ URL copied to clipboard!</span>
        </div>
      )}

      {questions.length > 0 && (
        <div className="questions-section">
          {questions.map((question, index) => {
            // Find previous position for animation
            const previousQuestion = previousQuestions.find(q => q.id === question.id);
            const previousIndex = previousQuestion ? previousQuestions.findIndex(q => q.id === question.id) : index;
            
            const hasAdminAccess = campaign && (
              (campaign.creator_id && campaign.creator_id === getUserId()) ||
              hasVerifiedPin(campaignId)
            );
            
            return (
              <QuestionCard
                key={question.id}
                question={question}
                campaignId={campaignId}
                onVoteUpdate={handleVoteUpdate}
                onQuestionDeleted={handleQuestionDeleted}
                number={index + 1}
                previousNumber={previousIndex >= 0 ? previousIndex + 1 : undefined}
                hasAdminAccess={hasAdminAccess || false}
              />
            );
          })}
        </div>
      )}

      {questions.length === 0 && (
        <div className="empty-state">
          <p>No questions yet. Be the first to ask a question!</p>
        </div>
      )}

      <CreateQuestionForm 
        campaignId={campaignId} 
        onQuestionCreated={handleQuestionCreated}
      />

      {campaign && (
        <div className="campaign-footer">
          <div className="campaign-timestamps-footer">
            {campaign.creator_name && (
              <span className="campaign-creator-name">
                Created by {campaign.creator_name}
              </span>
            )}
            <span className="campaign-timestamp" title={formatDateTime(campaign.created_at)}>
              Created {formatRelativeTime(campaign.created_at)}
            </span>
            <span className="campaign-timestamp" title={formatDateTime(campaign.last_updated || campaign.created_at)}>
              • Updated {formatRelativeTime(campaign.last_updated || campaign.created_at)}
            </span>
          </div>
          {((campaign.creator_id && campaign.creator_id === getUserId()) || hasVerifiedPin(campaignId)) && (
            <div className="campaign-actions-footer">
              {campaign.status === 'active' && (
                <button
                  className="close-campaign-btn"
                  onClick={handleCloseCampaign}
                  title="Close campaign"
                >
                  Close
                </button>
              )}
              <button
                className="delete-campaign-btn"
                onClick={handleDeleteCampaign}
                title="Delete campaign"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuestionPanel;

