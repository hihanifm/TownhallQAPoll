import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import CampaignList from './components/CampaignList';
import QuestionPanel from './components/QuestionPanel';
import SurveyList from './components/SurveyList';
import SurveyPanel from './components/SurveyPanel';
import FeedbackPanel from './components/FeedbackPanel';
import AppFooter from './components/AppFooter';
import { getBrowserName } from './utils/browserDetection';
import { browserConfig } from './config/browserConfig';
import { getConfig } from './services/configService';
import './App.css';

function AppContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isFeedbackPage = location.pathname === '/feedback';
  const isSurveyPage = location.pathname === '/surveys' || location.pathname.startsWith('/survey/');
  const isCampaignRoute = location.pathname.startsWith('/campaign/');
  const selectedCampaignId = isCampaignRoute ? id : null;
  const selectedSurveyId = location.pathname.startsWith('/survey/') && id ? id : null;
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

  const handleSurveySelect = (surveyId) => {
    if (surveyId) {
      navigate(`/survey/${surveyId}`);
    } else {
      navigate('/surveys');
    }
  };

  const handleSurveyCreated = (newSurvey) => {
    navigate(`/survey/${newSurvey.id}`);
  };

  const handleHeaderClick = () => {
    if (isSurveyPage) {
      navigate('/surveys');
    } else if (!isFeedbackPage) {
      navigate('/');
    } else {
      navigate('/');
    }
  };

  const goToCampaigns = (e) => {
    e.stopPropagation();
    navigate('/');
  };

  const goToSurveys = (e) => {
    e.stopPropagation();
    navigate('/surveys');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-brand" onClick={handleHeaderClick} role="button" tabIndex={0}>
          <h1>{appConfig.title}</h1>
          <p>{appConfig.subtitle}</p>
        </div>
        {!isFeedbackPage && (
          <nav className="app-nav" aria-label="Main sections">
            <button
              type="button"
              className={`app-nav-btn ${!isSurveyPage ? 'active' : ''}`}
              onClick={goToCampaigns}
            >
              Q&A Campaigns
            </button>
            <button
              type="button"
              className={`app-nav-btn ${isSurveyPage ? 'active' : ''}`}
              onClick={goToSurveys}
            >
              Surveys
            </button>
          </nav>
        )}
      </header>
      <div className="app-content">
        {!isFeedbackPage && !isSurveyPage && (
          <>
            <CampaignList
              selectedCampaignId={selectedCampaignId}
              onCampaignSelect={handleCampaignSelect}
              onCampaignCreated={handleCampaignCreated}
            />
            <QuestionPanel 
              campaignId={selectedCampaignId}
              onCampaignClosed={(campaignId) => {
                if (selectedCampaignId === String(campaignId)) {
                  navigate('/');
                }
              }}
              onCampaignDeleted={(campaignId) => {
                if (selectedCampaignId === String(campaignId)) {
                  navigate('/');
                }
              }}
            />
          </>
        )}
        {isSurveyPage && (
          <>
            <SurveyList
              selectedSurveyId={selectedSurveyId}
              onSurveySelect={handleSurveySelect}
              onSurveyCreated={handleSurveyCreated}
            />
            <SurveyPanel
              surveyId={selectedSurveyId}
              onSurveyClosed={() => navigate('/surveys')}
              onSurveyDeleted={() => navigate('/surveys')}
            />
          </>
        )}
        {isFeedbackPage && (
          <FeedbackPanel />
        )}
      </div>
      <AppFooter
        selectedCampaignId={selectedCampaignId}
        selectedSurveyId={selectedSurveyId}
      />
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
      <Route path="/survey/:id" element={<AppContent />} />
      <Route path="/surveys" element={<AppContent />} />
      <Route path="/feedback" element={<AppContent />} />
      <Route path="/" element={<AppContent />} />
    </Routes>
  );
}

export default App;

