import { useState, useEffect } from 'react';
import { getConfig } from '../services/configService';
import './WelcomeCard.css';

function WelcomeCard({ configKey = 'welcome', variant = 'default' }) {
  const [welcomeText, setWelcomeText] = useState('Welcome to Townhall Q&A Poll\n\nAsk questions, vote on what matters most, and have your voice heard. Questions with the most votes get priority attention.');

  useEffect(() => {
    getConfig().then(config => {
      const text = config[configKey];
      if (text) {
        setWelcomeText(text);
      }
    });
  }, [configKey]);

  const parseTextWithBold = (text) => {
    const parts = [];
    const regex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(<strong key={key++} className="welcome-bold">{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const lines = welcomeText.split('\n');
  const formattedText = lines.map((line, index) => (
    <span key={index}>
      {parseTextWithBold(line)}
      {index < lines.length - 1 && <br />}
    </span>
  ));

  const isCompact = variant === 'compact';

  return (
    <div className={`welcome-card${isCompact ? ' welcome-card--compact' : ''}`}>
      <div className="welcome-card-content">
        <p className="welcome-description">{formattedText}</p>
      </div>
    </div>
  );
}

export default WelcomeCard;
