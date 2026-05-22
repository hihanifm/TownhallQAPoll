import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import { hasVerifiedParticipantPin } from '../utils/surveyPin';
import { formatRelativeTime } from '../utils/dateFormat';
import SurveyPinEntryModal from './SurveyPinEntryModal';
import './CampaignList.css';

const CONFIDENTIAL_LABEL = '— Confidential survey';

function maskSurveyForList(survey, userId) {
  if (!survey.has_participant_pin || survey.creator_id === userId) return survey;
  return {
    ...survey,
    title: null,
    description: null,
    question_count: 0,
    response_count: 0,
    list_redacted: true,
  };
}

function isListRedacted(survey) {
  return survey.list_redacted || (survey.has_participant_pin && survey.title == null);
}

function SurveyList({ selectedSurveyId, onSurveySelect, onStartCreate }) {
  const [surveys, setSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pinModalSurveyId, setPinModalSurveyId] = useState(null);

  const userId = getUserId();

  const loadSurveys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSurveys({ creatorId: userId });
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
          setSurveys((prev) => [maskSurveyForList(data.survey, userId), ...prev]);
          break;
        case 'survey_updated':
          setSurveys((prev) =>
            prev.map((s) =>
              s.id === data.survey.id ? maskSurveyForList({ ...s, ...data.survey }, userId) : s
            )
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
  }, [userId]);

  const handleSurveyClick = (s) => {
    const isCreator = s.creator_id === userId;
    const needsPin =
      s.has_participant_pin && !isCreator && !hasVerifiedParticipantPin(s.id);
    if (needsPin) {
      setPinModalSurveyId(s.id);
      return;
    }
    if (onSurveySelect) onSurveySelect(s.id);
  };

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
          surveys.map((s) => {
            const redacted = isListRedacted(s);
            return (
              <div
                key={s.id}
                className={`campaign-item ${String(selectedSurveyId) === String(s.id) ? 'selected' : ''} ${s.status === 'closed' ? 'closed' : ''}`}
                onClick={() => handleSurveyClick(s)}
              >
                <div className="campaign-item-title">
                  {redacted ? CONFIDENTIAL_LABEL : s.title}
                </div>
                {!redacted && (
                  <div className="campaign-item-meta">
                    <span>{s.question_count || 0} questions</span>
                    <span>{s.response_count || 0} responses</span>
                    {s.status === 'closed' && <span className="closed-label">Closed</span>}
                  </div>
                )}
                <div className="campaign-item-time" title={s.created_at}>
                  {formatRelativeTime(s.created_at)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {pinModalSurveyId && (
        <SurveyPinEntryModal
          surveyId={pinModalSurveyId}
          mode="participant"
          onClose={() => setPinModalSurveyId(null)}
          onVerified={() => {
            const id = pinModalSurveyId;
            setPinModalSurveyId(null);
            if (onSurveySelect) onSurveySelect(id);
          }}
        />
      )}
    </div>
  );
}

export default SurveyList;
