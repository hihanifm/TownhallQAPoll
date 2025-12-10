import { useState } from 'react';
import { api } from '../services/api';
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
      const newQuestion = await api.createQuestion(campaignId, questionText);
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
      <h3>Ask a Question</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Enter your question here..."
          rows={4}
          disabled={isSubmitting}
        />
        {error && <div className="error-message">{error}</div>}
        <button type="submit" disabled={isSubmitting || !questionText.trim()}>
          {isSubmitting ? 'Submitting...' : 'Submit Question'}
        </button>
      </form>
    </div>
  );
}

export default CreateQuestionForm;

