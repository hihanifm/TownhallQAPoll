import { useState } from 'react';
import { api } from '../services/api';
import { getUserId } from '@townhall/shared/utils/userId';
import './CreateQuestionForm.css';

function CreateQuestionForm({ campaignId, onQuestionCreated }) {
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!questionText.trim()) {
      setError('Please enter a question');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const userId = getUserId();
      const newQuestion = await api.createQuestion(campaignId, questionText, userId);
      setQuestionText('');
      onQuestionCreated(newQuestion);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-question-form">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Ask a question..."
          disabled={isSubmitting}
        />
        <button type="submit" disabled={isSubmitting || !questionText.trim()}>
          {isSubmitting ? '...' : 'Submit'}
        </button>
      </form>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default CreateQuestionForm;

