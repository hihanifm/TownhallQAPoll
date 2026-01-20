import { useState, useEffect } from 'react';
import { getConfig } from '../services/configService';
import './WelcomeCard.css';

function WelcomeCard() {
  const [welcomeText, setWelcomeText] = useState('Welcome to Townhall Q&A Poll\n\nAsk questions, vote on what matters most, and have your voice heard. Questions with the most votes get priority attention.');

  // Load configuration on mount
  useEffect(() => {
    getConfig().then(config => {
      if (config.welcome) {
        setWelcomeText(config.welcome);
      }
    });
  }, []);

  // Parse text with markdown-style bold syntax (**text**)
  const parseTextWithBold = (text) => {
    const parts = [];
    const regex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the bold section
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add bold text with blue color
      parts.push(<strong key={key++} className="welcome-bold">{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }

    // Add remaining text after the last bold section
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Convert newlines to line breaks and parse bold text
  const lines = welcomeText.split('\n');
  const formattedText = lines.map((line, index) => (
    <span key={index}>
      {parseTextWithBold(line)}
      {index < lines.length - 1 && <br />}
    </span>
  ));

  return (
    <div className="welcome-card">
      <div className="welcome-card-content">
        <p className="welcome-description">{formattedText}</p>
      </div>
    </div>
  );
}

export default WelcomeCard;
