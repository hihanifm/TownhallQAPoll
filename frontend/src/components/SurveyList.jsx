import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatRelativeTime } from '../utils/dateFormat';
import './CampaignList.css';

function SurveyList({ selectedSurveyId, onSurveySelect, onStartCreate }) {
  const [surveys, setSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSurveys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSurveys();
      setSurveys(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('/api/sse/campaigns');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'survey_created':
          setSurveys((prev) => [data.survey, ...prev]);
          break;
        case 'survey_updated':
          setSurveys((prev) =>
            prev.map((s) => (s.id === data.survey.id ? { ...s, ...data.survey } : s))
          );
          break;
        case 'survey_deleted':
          setSurveys((prev) => prev.filter((s) => s.id !== data.survey_id));
          break;
        default:
          break;
      }
    };
    return () => eventSource.close();
  }, []);

  if (isLoading) {
    return (
      <div className="campaign-list">
        <div className="loading">Loading surveys...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="campaign-list">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="campaign-list">
      <div className="campaign-list-header">
        <h2>Surveys</h2>
        <button
          className="create-campaign-btn"
          onClick={() => onStartCreate && onStartCreate()}
        >
          + New Survey
        </button>
      </div>

      <div className="campaign-items">
        {surveys.length === 0 ? (
          <p className="no-campaigns">No surveys yet. Create one to get started.</p>
        ) : (
          surveys.map((s) => (
            <div
              key={s.id}
              className={`campaign-item ${String(selectedSurveyId) === String(s.id) ? 'selected' : ''} ${s.status === 'closed' ? 'closed' : ''}`}
              onClick={() => onSurveySelect && onSurveySelect(s.id)}
            >
              <div className="campaign-item-title">{s.title}</div>
              <div className="campaign-item-meta">
                <span>{s.question_count || 0} questions</span>
                <span>{s.response_count || 0} responses</span>
                {s.status === 'closed' && <span className="closed-label">Closed</span>}
              </div>
              <div className="campaign-item-time" title={s.created_at}>
                {formatRelativeTime(s.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SurveyList;
