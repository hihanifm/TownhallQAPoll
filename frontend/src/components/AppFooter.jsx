import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_VERSION } from '../config/version';
import { hasVerifiedPin } from '../utils/campaignPin';
import { api } from '../services/api';
import PinEntryModal from './PinEntryModal';
import './AppFooter.css';

function AppFooter({ selectedCampaignId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [apiStatus, setApiStatus] = useState('checking');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  
  const isFeedbackPage = location.pathname === '/feedback';

  // Get version from config
  const version = APP_VERSION;
  
  // Detect mode
  const mode = import.meta.env.MODE || 'development';
  const isDev = mode === 'development';

  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          credentials: 'same-origin'
        });
        if (response.ok) {
          setApiStatus('connected');
        } else {
          setApiStatus('error');
        }
      } catch (error) {
        setApiStatus('disconnected');
      }
    };

    checkApiStatus();
    // Check API status every 30 seconds
    const interval = setInterval(checkApiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch system status (PM2, backup, uptime)
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const status = await api.getSystemStatus();
        setSystemStatus(status);
      } catch (error) {
        console.error('Error fetching system status:', error);
        // Don't set status on error, keep previous state
      }
    };

    fetchSystemStatus();
    // Fetch system status every 5 minutes
    const interval = setInterval(fetchSystemStatus, 300000);
    return () => clearInterval(interval);
  }, []);

  // Check PIN verification status and load campaign when campaign changes
  useEffect(() => {
    if (selectedCampaignId) {
      setPinVerified(hasVerifiedPin(selectedCampaignId));
      // Load campaign to check if it has PIN
      api.getCampaign(selectedCampaignId)
        .then(setCampaign)
        .catch(err => {
          console.error('Error loading campaign:', err);
          setCampaign(null);
        });
    } else {
      setPinVerified(false);
      setCampaign(null);
    }
  }, [selectedCampaignId]);

  const handlePinVerified = () => {
    setPinVerified(true);
  };

  const getApiStatusColor = () => {
    switch (apiStatus) {
      case 'connected':
        return '#10b981'; // green
      case 'disconnected':
        return '#ef4444'; // red
      case 'error':
        return '#f59e0b'; // yellow
      default:
        return '#6b7280'; // gray
    }
  };

  const getApiStatusText = () => {
    switch (apiStatus) {
      case 'connected':
        return 'Healthy';
      case 'disconnected':
        return 'Server Disconnected';
      case 'error':
        return 'Server Error';
      default:
        return 'Checking Server...';
    }
  };

  // Format uptime in human-readable format
  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Format last backup time
  const formatLastBackup = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  // Get PM2 status color
  const getPm2StatusColor = () => {
    if (!systemStatus) return '#6b7280'; // gray
    return systemStatus.pm2.enabled ? '#10b981' : '#6b7280'; // green or gray
  };

  // Get backup status color
  const getBackupStatusColor = () => {
    if (!systemStatus) return '#6b7280'; // gray
    if (systemStatus.backup.running) return '#f59e0b'; // yellow
    return '#10b981'; // green
  };

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-content-main">
          <div className="footer-section">
            <span className="footer-label">Version:</span>
            <span className="footer-value">{version}</span>
          </div>
          
          <div className="footer-section">
            <span className="footer-label">Mode:</span>
            <span className={`footer-value footer-mode ${isDev ? 'dev' : 'prod'}`}>
              {isDev ? 'Development' : 'Production'}
            </span>
          </div>
          
          <div className="footer-section">
            <span className="footer-label">Server:</span>
            <span 
              className="footer-value footer-api-status"
              style={{ color: getApiStatusColor() }}
            >
              <span className="status-dot" style={{ backgroundColor: getApiStatusColor() }}></span>
              {getApiStatusText()}
            </span>
          </div>
          
          {systemStatus && (
            <>
              {isDev && (
                <>
                  <div className="footer-section">
                    <span className="footer-label">PM2:</span>
                    <span 
                      className="footer-value footer-status"
                      style={{ color: getPm2StatusColor() }}
                    >
                      <span className="status-dot" style={{ backgroundColor: getPm2StatusColor() }}></span>
                      {systemStatus.pm2.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="footer-section">
                    <span className="footer-label">Backup:</span>
                    <span 
                      className="footer-value footer-status"
                      style={{ color: getBackupStatusColor() }}
                      title={systemStatus.backup.lastBackup ? `Last backup: ${formatLastBackup(systemStatus.backup.lastBackup)}` : 'No backup yet'}
                    >
                      <span className="status-dot" style={{ backgroundColor: getBackupStatusColor() }}></span>
                      {systemStatus.backup.running ? 'Running' : 'Idle'}
                      {systemStatus.backup.lastBackup && !systemStatus.backup.running && (
                        <span className="footer-status-detail"> ({formatLastBackup(systemStatus.backup.lastBackup)})</span>
                      )}
                    </span>
                  </div>
                </>
              )}
              
              <div className="footer-section">
                <span className="footer-label">Uptime:</span>
                <span className="footer-value">{formatUptime(systemStatus.uptime)}</span>
              </div>
            </>
          )}
          
          {selectedCampaignId && campaign?.has_pin && (
            <div className="footer-section">
              {pinVerified ? (
                <div className="footer-admin-indicator">
                  <span className="admin-badge">✓ Admin Access</span>
                </div>
              ) : (
                <button
                  className="footer-admin-button"
                  onClick={() => setShowPinModal(true)}
                  title="Request admin privileges for this campaign"
                >
                  Request PIN
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="footer-section footer-feedback-section">
          <button
            className="footer-feedback-button"
            onClick={() => navigate('/feedback')}
            title="View and submit feedback"
            style={{ fontWeight: isFeedbackPage ? '700' : 'normal' }}
          >
            {isFeedbackPage ? '✓ Feedback' : 'Feedback'}
          </button>
        </div>
      </div>
      
      {showPinModal && selectedCampaignId && (
        <PinEntryModal
          campaignId={selectedCampaignId}
          onClose={() => setShowPinModal(false)}
          onVerified={handlePinVerified}
        />
      )}
    </footer>
  );
}

export default AppFooter;
