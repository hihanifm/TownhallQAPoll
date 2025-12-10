import { useState, useEffect } from 'react';
import CampaignList from './components/CampaignList';
import QuestionPanel from './components/QuestionPanel';
import { getBrowserName } from './utils/browserDetection';
import { browserConfig } from './config/browserConfig';
import './App.css';

const OVERRIDE_STORAGE_KEY = 'browser_restriction_override';

function App() {
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [overrideRestriction, setOverrideRestriction] = useState(false);

  // Check localStorage for override preference on mount
  useEffect(() => {
    const storedOverride = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    if (storedOverride === 'true') {
      setOverrideRestriction(true);
    }
  }, []);

  const handleCampaignSelect = (campaignId) => {
    setSelectedCampaignId(campaignId);
  };

  const handleCampaignCreated = (newCampaign) => {
    setSelectedCampaignId(newCampaign.id);
  };

  const handleOverride = () => {
    localStorage.setItem(OVERRIDE_STORAGE_KEY, 'true');
    setOverrideRestriction(true);
  };

  // Check if browser restriction is enabled and if current browser is allowed
  const isBrowserAllowed = () => {
    if (!browserConfig.enabled) {
      return true; // Restrictions disabled, allow all browsers
    }
    
    // Check if user has overridden the restriction
    if (overrideRestriction || localStorage.getItem(OVERRIDE_STORAGE_KEY) === 'true') {
      return true;
    }
    
    const browserName = getBrowserName();
    if (browserConfig.allowedBrowsers.length === 0) {
      // If no browsers specified, default to Microsoft Edge only
      return browserName === 'Microsoft Edge' || browserName === 'Microsoft Edge (Legacy)';
    }
    
    // Check if current browser is in the allowed list (case-insensitive)
    return browserConfig.allowedBrowsers.some(
      allowed => allowed.toLowerCase() === browserName.toLowerCase()
    );
  };

  // Show browser restriction message if needed
  if (!isBrowserAllowed()) {
    const browserName = getBrowserName();
    const allowedBrowsersText = browserConfig.allowedBrowsers.length > 0
      ? browserConfig.allowedBrowsers.join(' or ')
      : 'Microsoft Edge';
    
    const restrictionMessage = browserConfig.customMessage || 
      `This application is only accessible using ${allowedBrowsersText} browser.`;
    
    return (
      <div className="app">
        <div className="browser-restriction-message">
          <div className="browser-restriction-content">
            <div className="browser-restriction-icon">⚠️</div>
            <h1>Browser Not Supported</h1>
            <p dangerouslySetInnerHTML={{ __html: restrictionMessage.replace(/\n/g, '<br />') }} />
            <p className="browser-detected">
              You are currently using: <strong>{browserName}</strong>
            </p>
            {browserConfig.showDownloadLink && (
              <div className="browser-restriction-instructions">
                <p>To access this application:</p>
                <ol>
                  <li>Download and install <a href="https://www.microsoft.com/edge" target="_blank" rel="noopener noreferrer">Microsoft Edge</a> if you don't have it</li>
                  <li>Open this application in Microsoft Edge</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            )}
            <p className="browser-restriction-reason">
              <strong>Why?</strong> This restriction helps ensure fair voting by preventing access from multiple browsers.
            </p>
            {browserConfig.allowOverride && (
              <div className="browser-override-section">
                <button 
                  className="browser-override-button"
                  onClick={handleOverride}
                >
                  Continue Anyway
                </button>
                <p className="browser-override-note">
                  You can proceed, but please note that using unsupported browsers may affect your experience.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Townhall Q&A Poll</h1>
        <p>Collect and rank questions from employees</p>
      </header>
      <div className="app-content">
        <CampaignList
          selectedCampaignId={selectedCampaignId}
          onCampaignSelect={handleCampaignSelect}
          onCampaignCreated={handleCampaignCreated}
        />
        <QuestionPanel campaignId={selectedCampaignId} />
      </div>
    </div>
  );
}

export default App;

