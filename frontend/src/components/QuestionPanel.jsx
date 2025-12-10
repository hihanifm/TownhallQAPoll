import { useState, useEffect } from 'react';
import { api } from '../services/api';
import QuestionCard from './QuestionCard';
import CreateQuestionForm from './CreateQuestionForm';
import { formatRelativeTime, formatDateTime } from '../utils/dateFormat';
import './QuestionPanel.css';

function QuestionPanel({ campaignId }) {
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
          <h3 className="panel-subtitle">Questions & Answers</h3>
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
            
            return (
              <QuestionCard
                key={question.id}
                question={question}
                campaignId={campaignId}
                onVoteUpdate={handleVoteUpdate}
                onQuestionDeleted={handleQuestionDeleted}
                number={index + 1}
                previousNumber={previousIndex >= 0 ? previousIndex + 1 : undefined}
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
        <div className="campaign-timestamps-footer">
          <span className="campaign-timestamp" title={formatDateTime(campaign.created_at)}>
            Created {formatRelativeTime(campaign.created_at)}
          </span>
          <span className="campaign-timestamp" title={formatDateTime(campaign.last_updated || campaign.created_at)}>
            • Updated {formatRelativeTime(campaign.last_updated || campaign.created_at)}
          </span>
        </div>
      )}
    </div>
  );
}

export default QuestionPanel;

