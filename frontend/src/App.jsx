import { useState } from 'react';
import CampaignList from './components/CampaignList';
import QuestionPanel from './components/QuestionPanel';
import './App.css';

function App() {
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  const handleCampaignSelect = (campaignId) => {
    setSelectedCampaignId(campaignId);
  };

  const handleCampaignCreated = (newCampaign) => {
    setSelectedCampaignId(newCampaign.id);
  };

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

