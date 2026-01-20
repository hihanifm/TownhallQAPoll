import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import './CreateFeedbackForm.css';

function CreateFeedbackForm({ onFeedbackCreated }) {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedbackText.trim()) {
      setError('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const creatorId = getUserId();
      const newFeedback = await api.createFeedback(feedbackText, creatorId);
      setFeedbackText('');
      onFeedbackCreated(newFeedback);
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
    <div className="create-feedback-form">
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Your Name: Share your feedback, bug report, or feature request..."
          disabled={isSubmitting}
        />
        <button type="submit" disabled={isSubmitting || !feedbackText.trim()}>
          {isSubmitting ? '...' : 'Submit'}
        </button>
      </form>
      <div className="feedback-form-tip">
        <span className="feedback-form-tip-text">Tip: Prefix your name so we can reach out for more details if needed</span>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default CreateFeedbackForm;
