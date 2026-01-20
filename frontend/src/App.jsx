import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import CampaignList from './components/CampaignList';
import QuestionPanel from './components/QuestionPanel';
import AppFooter from './components/AppFooter';
import { getBrowserName } from './utils/browserDetection';
import { browserConfig } from './config/browserConfig';
import { getConfig } from './services/configService';
import './App.css';

function AppContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedCampaignId, setSelectedCampaignId] = useState(id || null);
  const [appConfig, setAppConfig] = useState({
    title: 'Townhall Q&A Poll',
    subtitle: 'Ask. Vote. Be heard.'
  });

  // Load configuration on mount
  useEffect(() => {
    getConfig().then(config => {
      setAppConfig(config);
      // Update document title
      document.title = config.title;
    });
  }, []);

  // Sync selectedCampaignId with URL params
  useEffect(() => {
    if (id) {
      setSelectedCampaignId(id);
    } else {
      setSelectedCampaignId(null);
    }
  }, [id]);

  const handleCampaignSelect = (campaignId) => {
    if (campaignId) {
      navigate(`/campaign/${campaignId}`);
    } else {
      navigate('/');
    }
  };

  const handleCampaignCreated = (newCampaign) => {
    navigate(`/campaign/${newCampaign.id}`);
  };

  return (
    <div className="app">
      <header className="app-header" onClick={() => navigate('/')}>
        <h1>{appConfig.title}</h1>
        <p>{appConfig.subtitle}</p>
      </header>
      <div className="app-content">
        <CampaignList
          selectedCampaignId={selectedCampaignId}
          onCampaignSelect={handleCampaignSelect}
          onCampaignCreated={handleCampaignCreated}
        />
        <QuestionPanel 
          campaignId={selectedCampaignId}
          onCampaignClosed={(campaignId) => {
            if (selectedCampaignId === campaignId) {
              navigate('/');
            }
          }}
          onCampaignDeleted={(campaignId) => {
            if (selectedCampaignId === campaignId) {
              navigate('/');
            }
          }}
        />
      </div>
      <AppFooter selectedCampaignId={selectedCampaignId} />
    </div>
  );
}

function App() {
  // Check if browser restriction is enabled and if current browser is allowed
  const isBrowserAllowed = () => {
    // Check environment mode
    const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
    const enableRestriction = import.meta.env.VITE_ENABLE_BROWSER_RESTRICTION === 'true';
    
    // Always allow all browsers in development mode
    if (!isProduction) {
      return true;
    }
    
    // In production: check if restrictions are enabled via environment variable
    if (!enableRestriction) {
      // Restrictions disabled via env var, allow all browsers
      return true;
    }
    
    // Restrictions enabled in production - check if browser is allowed
    if (!browserConfig.enabled) {
      return true; // Config says disabled, allow all browsers
    }
    
    const browserName = getBrowserName();
    if (browserConfig.allowedBrowsers.length === 0) {
      // If no browsers specified, default to Windows Edge only
      return browserName === 'Windows Edge';
    }
    
    // Check if current browser is in the allowed list (case-insensitive)
    return browserConfig.allowedBrowsers.some(
      allowed => allowed.toLowerCase() === browserName.toLowerCase()
    );
  };

  // Show browser restriction message if needed (only in production when enabled)
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
  const enableRestriction = import.meta.env.VITE_ENABLE_BROWSER_RESTRICTION === 'true';
  
  // Only show restrictions in production when enabled
  if (isProduction && enableRestriction && !isBrowserAllowed()) {
    const browserName = getBrowserName();
    const allowedBrowsersText = browserConfig.allowedBrowsers.length > 0
      ? browserConfig.allowedBrowsers.join(' or ')
      : 'Windows Edge';
    
    const restrictionMessage = browserConfig.customMessage || 
      `This application is only accessible using ${allowedBrowsersText} browser on Windows.`;
    
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
                  <li>Use Windows Edge browser on a Windows computer</li>
                  <li>Download and install <a href="https://www.microsoft.com/edge" target="_blank" rel="noopener noreferrer">Microsoft Edge</a> if you don't have it</li>
                  <li>Open this application in Windows Edge</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            )}
            <p className="browser-restriction-reason">
              <strong>Why?</strong> This restriction helps ensure fair voting by preventing access from multiple browsers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/campaign/:id" element={<AppContent />} />
      <Route path="/" element={<AppContent />} />
    </Routes>
  );
}

export default App;

