import './WelcomeCard.css';

function WelcomeCard() {
  return (
    <div className="welcome-card">
      <div className="welcome-card-content">
        <div className="welcome-icon">👋</div>
        <h3 className="welcome-title">Welcome to Townhall Q&A Poll</h3>
        <p className="welcome-description">
          Ask questions, vote on what matters most, and have your voice heard. 
          Questions with the most votes get priority attention.
        </p>
        <div className="welcome-features">
          <div className="welcome-feature">
            <span className="feature-icon">❓</span>
            <span className="feature-text">Ask questions about topics that matter to you</span>
          </div>
          <div className="welcome-feature">
            <span className="feature-icon">↑</span>
            <span className="feature-text">Vote for questions you want answered</span>
          </div>
          <div className="welcome-feature">
            <span className="feature-icon">💬</span>
            <span className="feature-text">Engage with comments and discussions</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeCard;
