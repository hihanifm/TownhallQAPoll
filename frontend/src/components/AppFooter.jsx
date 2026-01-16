import { useState, useEffect } from 'react';
import { getBrowserName } from '../utils/browserDetection';
import { APP_VERSION } from '../config/version';
import './AppFooter.css';

function AppFooter() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get version from config
  const version = APP_VERSION;
  
  // Detect mode
  const mode = import.meta.env.MODE || 'development';
  const isDev = mode === 'development';
  
  // Get browser info
  const browserName = getBrowserName();

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

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
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
        return 'API Connected';
      case 'disconnected':
        return 'API Disconnected';
      case 'error':
        return 'API Error';
      default:
        return 'Checking API...';
    }
  };

  return (
    <footer className="app-footer">
      <div className="footer-content">
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
          <span className="footer-label">Browser:</span>
          <span className="footer-value">{browserName}</span>
        </div>
        
        <div className="footer-section">
          <span className="footer-label">API:</span>
          <span 
            className="footer-value footer-api-status"
            style={{ color: getApiStatusColor() }}
          >
            <span className="status-dot" style={{ backgroundColor: getApiStatusColor() }}></span>
            {getApiStatusText()}
          </span>
        </div>
        
        <div className="footer-section">
          <span className="footer-label">Time:</span>
          <span className="footer-value">{formatTime(currentTime)}</span>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;
