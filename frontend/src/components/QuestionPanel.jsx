import { useState, useEffect } from 'react';
import { api } from '../services/api';
import QuestionCard from './QuestionCard';
import CreateQuestionForm from './CreateQuestionForm';
import './QuestionPanel.css';

function QuestionPanel({ campaignId }) {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (campaignId) {
      loadQuestions();
    }
  }, [campaignId]);

  const loadQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getQuestions(campaignId);
      // Sort by vote count (descending)
      const sortedQuestions = data.sort((a, b) => b.vote_count - a.vote_count);
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
        <h2>Questions & Answers</h2>
        <div className="question-stats">
          Total: {questions.length} questions
        </div>
      </div>

      {questions.length > 0 && (
        <div className="questions-section">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              campaignId={campaignId}
              onVoteUpdate={handleVoteUpdate}
              number={index + 1}
            />
          ))}
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
    </div>
  );
}

export default QuestionPanel;

