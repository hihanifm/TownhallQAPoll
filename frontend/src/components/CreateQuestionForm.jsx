import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import './CreateQuestionForm.css';

function CreateQuestionForm({ campaignId, onQuestionCreated }) {
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Focus input when campaign is selected (campaignId changes)
  useEffect(() => {
    if (campaignId && inputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [campaignId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!questionText.trim()) {
      setError('Please enter a question');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const creatorId = getUserId();
      const newQuestion = await api.createQuestion(campaignId, questionText, creatorId);
      setQuestionText('');
      onQuestionCreated(newQuestion);
      // Focus input after successful submission
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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
          ref={inputRef}
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

