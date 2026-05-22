import { useEffect } from 'react';
import './SurveyThanksCelebration.css';

const GRAFFITI_TAGS = [
  { text: 'Thanks!', top: '14%', left: '6%', rotate: -14, color: '#f59e0b', size: 28 },
  { text: '✓', top: '22%', right: '10%', rotate: 8, color: '#10b981', size: 36 },
  { text: 'Nice!', top: '8%', right: '28%', rotate: -6, color: '#ec4899', size: 22 },
  { text: 'Done', bottom: '38%', left: '12%', rotate: 12, color: '#8b5cf6', size: 24 },
  { text: '★', top: '38%', left: '4%', rotate: -20, color: '#eab308', size: 30 },
  { text: 'Cheers', bottom: '32%', right: '8%', rotate: -10, color: '#06b6d4', size: 20 },
  { text: '♥', top: '52%', right: '6%', rotate: 16, color: '#ef4444', size: 26 },
  { text: 'Got it', bottom: '48%', right: '22%', rotate: -8, color: '#2563eb', size: 18 },
];

const DURATION_MS = 3200;

function SurveyThanksCelebration({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="survey-graffiti-overlay" role="status" aria-live="polite">
      <div className="survey-graffiti-splats" aria-hidden="true">
        <span className="survey-graffiti-splat splat-a" />
        <span className="survey-graffiti-splat splat-b" />
        <span className="survey-graffiti-splat splat-c" />
      </div>
      {GRAFFITI_TAGS.map((tag, i) => (
        <span
          key={`${tag.text}-${tag.top}`}
          className="survey-graffiti-tag"
          style={{
            top: tag.top,
            left: tag.left,
            right: tag.right,
            bottom: tag.bottom,
            color: tag.color,
            fontSize: `${tag.size}px`,
            transform: `rotate(${tag.rotate}deg)`,
            animationDelay: `${i * 0.05}s`,
          }}
        >
          {tag.text}
        </span>
      ))}
      <div className="survey-graffiti-message">
        <h3>Thank you!</h3>
        <p>Your response has been recorded.</p>
      </div>
    </div>
  );
}

export default SurveyThanksCelebration;
