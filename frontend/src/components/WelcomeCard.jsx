import { useState, useEffect } from 'react';
import { getConfig } from '../services/configService';
import './WelcomeCard.css';

function WelcomeCard() {
  const [welcomeConfig, setWelcomeConfig] = useState({
    icon: '👋',
    title: 'Welcome to Townhall Q&A Poll',
    description: 'Ask questions, vote on what matters most, and have your voice heard. Questions with the most votes get priority attention.',
    features: [
      {
        icon: '❓',
        text: 'Ask questions about topics that matter to you'
      },
      {
        icon: '↑',
        text: 'Vote for questions you want answered'
      },
      {
        icon: '💬',
        text: 'Engage with comments and discussions'
      }
    ]
  });

  // Load configuration on mount
  useEffect(() => {
    getConfig().then(config => {
      if (config.welcome) {
        setWelcomeConfig(config.welcome);
      }
    });
  }, []);

  return (
    <div className="welcome-card">
      <div className="welcome-card-content">
        <div className="welcome-icon">{welcomeConfig.icon}</div>
        <h3 className="welcome-title">{welcomeConfig.title}</h3>
        <p className="welcome-description">{welcomeConfig.description}</p>
        <div className="welcome-features">
          {welcomeConfig.features && welcomeConfig.features.map((feature, index) => (
            <div key={index} className="welcome-feature">
              <span className="feature-icon">{feature.icon}</span>
              <span className="feature-text">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WelcomeCard;
