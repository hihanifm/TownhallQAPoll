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
    } catch (err) {
      console.error('Error loading campaign:', err);
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
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="question-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          {campaign && (
            <h2 className="campaign-title">{campaign.title}</h2>
          )}
          <p className="panel-subtitle">While it may not be possible to answer every question, priority will be given to those questions with the most votes - so if you see an existing question that closely matches your concern, vote for it!</p>
        </div>
        <div className="question-stats">
          Total: {questions.length} questions
        </div>
      </div>

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
                  Close Campaign
                </button>
              )}
              <button
                className="delete-campaign-btn"
                onClick={handleDeleteCampaign}
                title="Delete campaign"
              >
                Delete Campaign
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuestionPanel;

