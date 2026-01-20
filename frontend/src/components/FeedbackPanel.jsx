import { useState, useEffect } from 'react';
import { api } from '../services/api';
import FeedbackCard from './FeedbackCard';
import CreateFeedbackForm from './CreateFeedbackForm';
import FeedbackPinModal from './FeedbackPinModal';
import { hasVerifiedPin } from '../utils/feedbackPin';
import './FeedbackPanel.css';

const SORT_STORAGE_KEY = 'feedback_sort_preference';

function FeedbackPanel() {
  const [feedback, setFeedback] = useState([]);
  const [previousFeedback, setPreviousFeedback] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [sortBy, setSortBy] = useState(() => {
    // Initialize from localStorage, default to 'votes'
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    return saved === 'time' ? 'time' : 'votes';
  });

  useEffect(() => {
    loadFeedback();
    // Initialize PIN verification status
    setPinVerified(hasVerifiedPin());
  }, []);

  // Reload feedback when sort changes (skip initial mount to avoid double load)
  useEffect(() => {
    // Skip if this is the initial mount (handled by the first useEffect)
    const isInitialMount = feedback.length === 0 && isLoading;
    if (!isInitialMount) {
      loadFeedback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  // Monitor PIN verification status changes
  useEffect(() => {
    const checkPinStatus = () => {
      const currentStatus = hasVerifiedPin();
      setPinVerified(currentStatus);
    };

    // Check immediately
    checkPinStatus();

    // Check on window focus (when user returns to tab)
    const handleFocus = () => {
      checkPinStatus();
    };
    window.addEventListener('focus', handleFocus);

    // Periodic check as fallback (every 500ms)
    const interval = setInterval(checkPinStatus, 500);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const loadFeedback = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getFeedback(sortBy);
      // Backend already sorts based on sortBy parameter
      // Just ensure status defaults to 'open' for backward compatibility
      const feedbackWithStatus = data.map(f => ({
        ...f,
        status: f.status || 'open'
      }));
      
      // Store previous feedback for animation comparison
      setPreviousFeedback([...feedback]);
      setFeedback(feedbackWithStatus);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    localStorage.setItem(SORT_STORAGE_KEY, newSort);
  };

  const handleFeedbackCreated = (newFeedback) => {
    loadFeedback(); // Reload to get updated list with vote counts
  };

  const handleVoteUpdate = () => {
    loadFeedback(); // Reload to update vote counts and rankings
  };

  const handleFeedbackClosed = (feedbackId) => {
    loadFeedback(); // Reload to update feedback status
  };

  const handlePinVerified = () => {
    setPinVerified(true);
  };

  if (isLoading) {
    return (
      <div className="feedback-panel">
        <div className="loading">Loading feedback...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-panel">
        <div className="error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <h2 className="panel-title">Feedback</h2>
          <p className="panel-subtitle">Share your feedback, bug reports, or feature requests. Upvote feedback you relate to!</p>
        </div>
        <div className="panel-header-right">
          <div className="sort-toggle">
            <span className="sort-label">Sort by:</span>
            <button
              className={`sort-button ${sortBy === 'votes' ? 'active' : ''}`}
              onClick={() => handleSortChange('votes')}
              title="Sort by vote count"
            >
              Votes
            </button>
            <button
              className={`sort-button ${sortBy === 'time' ? 'active' : ''}`}
              onClick={() => handleSortChange('time')}
              title="Sort by time (newest first)"
            >
              Time
            </button>
          </div>
        </div>
      </div>

      {feedback.length > 0 && (
        <div className="feedback-section">
          {feedback.map((item, index) => {
            // Find previous position for animation
            const previousItem = previousFeedback.find(f => f.id === item.id);
            const previousIndex = previousItem ? previousFeedback.findIndex(f => f.id === item.id) : index;
            
            return (
              <FeedbackCard
                key={item.id}
                feedback={item}
                onVoteUpdate={handleVoteUpdate}
                onFeedbackClosed={handleFeedbackClosed}
                number={index + 1}
                previousNumber={previousIndex >= 0 ? previousIndex + 1 : undefined}
                hasAdminAccess={pinVerified}
              />
            );
          })}
        </div>
      )}

      {feedback.length === 0 && (
        <div className="empty-state">
          <p>No feedback yet. Be the first to share your thoughts!</p>
        </div>
      )}

      <CreateFeedbackForm 
        onFeedbackCreated={handleFeedbackCreated}
      />

      {!pinVerified && (
        <div className="feedback-admin-section">
          <button
            className="feedback-admin-button"
            onClick={() => setShowPinModal(true)}
            title="Request admin privileges for feedback management"
          >
            Request Admin Access
          </button>
        </div>
      )}

      {pinVerified && (
        <div className="feedback-admin-section">
          <div className="feedback-admin-indicator">
            <span className="feedback-admin-badge">✓ Admin Access</span>
          </div>
        </div>
      )}
      
      {showPinModal && (
        <FeedbackPinModal
          onClose={() => setShowPinModal(false)}
          onVerified={handlePinVerified}
        />
      )}
    </div>
  );
}

export default FeedbackPanel;
