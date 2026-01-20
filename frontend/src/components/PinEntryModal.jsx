import { useState } from 'react';
import { api } from '../services/api';
import { storeVerifiedPin } from '../utils/campaignPin';
import './PinEntryModal.css';

function PinEntryModal({ campaignId, onClose, onVerified }) {
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
      await api.verifyCampaignPin(campaignId, trimmedPin);
      storeVerifiedPin(campaignId, trimmedPin);
      if (onVerified) {
        onVerified();
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid PIN. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="pin-modal-backdrop" onClick={handleBackdropClick}>
      <div className="pin-modal-content">
        <div className="pin-modal-header">
          <h2>Request Access</h2>
          <button className="pin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="pin-modal-body">
          <p>Enter the PIN for this campaign to gain privileges (close/delete campaigns, delete questions, answer questions).</p>
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
              className={error ? 'pin-input-error' : ''}
            />
            {error && <div className="pin-error-message">{error}</div>}
            <div className="pin-modal-actions">
              <button
                type="button"
                onClick={onClose}
                disabled={isVerifying}
                className="pin-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || !pin.trim()}
                className="pin-modal-verify"
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PinEntryModal;
