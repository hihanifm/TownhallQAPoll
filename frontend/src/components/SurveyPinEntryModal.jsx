import { useState } from 'react';
import { api } from '../services/api';
import { storeVerifiedPin } from '../utils/surveyPin';
import './PinEntryModal.css';

function SurveyPinEntryModal({ surveyId, onClose, onVerified }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter a PIN');
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const trimmedPin = pin.trim();
      await api.verifySurveyPin(surveyId, trimmedPin);
      storeVerifiedPin(surveyId, trimmedPin);
      if (onVerified) onVerified();
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid PIN. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="pin-modal-backdrop" onClick={handleBackdropClick}>
      <div className="pin-modal-content">
        <div className="pin-modal-header">
          <h2>Survey Access</h2>
          <button className="pin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="pin-modal-body">
          <p>Enter the survey PIN to view results or manage this survey.</p>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
              }}
              disabled={isVerifying}
              autoFocus
            />
            {error && <div className="pin-modal-error">{error}</div>}
            <button type="submit" disabled={isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SurveyPinEntryModal;
