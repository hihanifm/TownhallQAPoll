import { useEffect, useState } from 'react';
import { subscribeAppNotice } from '../utils/appNotice';
import './AppNotice.css';

const DISMISS_MS = 5000;

function AppNotice() {
  const [message, setMessage] = useState(null);

  useEffect(() => subscribeAppNotice((msg) => setMessage(msg)), []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div className="app-notice" role="alert">
      <span className="app-notice-text">{message}</span>
      <button type="button" className="app-notice-dismiss" onClick={() => setMessage(null)} aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}

export default AppNotice;
