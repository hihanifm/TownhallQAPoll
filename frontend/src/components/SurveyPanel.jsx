import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import { getVerifiedPin, hasVerifiedPin } from '../utils/surveyPin';
import SurveyForm from './SurveyForm';
import SurveyResults from './SurveyResults';
import SurveyPinEntryModal from './SurveyPinEntryModal';
import CreateSurveyWizard from './CreateSurveyWizard';
import './QuestionPanel.css';

function SurveyPanel({ surveyId, isCreating, onCancelCreate, onSurveyCreated, onSurveyClosed, onSurveyDeleted }) {
  const [survey, setSurvey] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [resultsError, setResultsError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [resultsExpanded, setResultsExpanded] = useState(false);

  const loadSurvey = useCallback(async () => {
    if (!surveyId) return;
    setIsLoading(true);
    try {
      const data = await api.getSurvey(surveyId);
      setSurvey(data);
      const userId = getUserId();
      const status = await api.getSurveySubmissionStatus(surveyId, userId);
      setSubmitted(status.submitted);
      setPinVerified(hasVerifiedPin(surveyId));
    } catch (err) {
      console.error(err);
      setSurvey(null);
    } finally {
      setIsLoading(false);
    }
  }, [surveyId]);

  const loadResults = useCallback(async () => {
    if (!surveyId || !survey) return;
    setResultsError(null);
    const userId = getUserId();
    const pin = getVerifiedPin(surveyId);
    const isCreator = survey.creator_id === userId;
    const admin = isCreator || hasVerifiedPin(surveyId);
    try {
      const data = await api.getSurveyResults(surveyId, {
        userId: admin ? undefined : (submitted ? userId : undefined),
        surveyPin: pin || undefined,
        creatorId: admin ? userId : undefined,
      });
      setResultsData(data);
    } catch (err) {
      setResultsData(null);
      setResultsError(err.message);
    }
  }, [surveyId, survey, submitted]);

  useEffect(() => {
    loadSurvey();
  }, [loadSurvey]);

  useEffect(() => {
    setResultsExpanded(false);
    setResultsData(null);
    setResultsError(null);
  }, [surveyId]);

  useEffect(() => {
    if (!surveyId || !survey) return;
    const eventSource = new EventSource(`/api/sse/campaigns/${surveyId}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'survey_response_submitted') {
        loadSurvey();
        loadResults();
      }
    };
    return () => eventSource.close();
  }, [surveyId, survey, loadSurvey, loadResults]);

  const userId = getUserId();
  const hasAdminAccess = survey
    ? survey.creator_id === userId || pinVerified
    : false;
  const canLoadResults = Boolean(
    survey &&
    (hasAdminAccess || (submitted && survey.results_visibility !== 'pin_only'))
  );

  useEffect(() => {
    if (canLoadResults) {
      loadResults();
    }
  }, [canLoadResults, loadResults]);

  const handleSubmit = async (answers) => {
    setIsSubmitting(true);
    try {
      const userId = getUserId();
      await api.submitSurvey(surveyId, userId, answers);
      setSubmitted(true);
      await loadSurvey();
      await loadResults();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Close this survey? No new responses will be accepted.')) return;
    try {
      const userId = getUserId();
      const pin = getVerifiedPin(surveyId);
      await api.closeSurvey(surveyId, userId, pin);
      await loadSurvey();
      if (onSurveyClosed) onSurveyClosed(surveyId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this survey permanently?')) return;
    try {
      const userId = getUserId();
      const pin = getVerifiedPin(surveyId);
      await api.deleteSurvey(surveyId, userId, pin);
      if (onSurveyDeleted) onSurveyDeleted(surveyId);
    } catch (err) {
      alert(err.message);
    }
  };

  const visibilityLabels = {
    pin_only: 'Results visible with PIN only',
    after_submit: 'Results visible after you submit',
    public: 'Results visible to everyone (live)',
  };

  if (isCreating) {
    return (
      <div className="question-panel">
        <CreateSurveyWizard
          onCancel={onCancelCreate}
          onCreated={onSurveyCreated}
        />
      </div>
    );
  }

  if (!surveyId) {
    return (
      <div className="question-panel">
        <div className="question-panel-empty">
          <p>Select a survey from the list, or click <strong>+ New Survey</strong> to set one up.</p>
        </div>
      </div>
    );
  }

  if (isLoading && !survey) {
    return (
      <div className="question-panel">
        <div className="loading">Loading survey...</div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="question-panel">
        <div className="error">Survey not found</div>
      </div>
    );
  }

  const isClosed = survey.status === 'closed';
  const isCreator = survey.creator_id === userId;

  const responseCount =
    resultsData?.response_count ?? survey.response_count ?? 0;

  const showResultsHint =
    !hasAdminAccess &&
    !submitted &&
    !isClosed &&
    survey.results_visibility !== 'pin_only';

  return (
    <div className="question-panel">
      <div className="question-panel-header survey-panel-header">
        <h2 className="survey-title">
          {survey.title}
          {survey.has_pin && (
            <svg
              className="pin-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 0 0-6 0v3.76" />
            </svg>
          )}
        </h2>
        {isClosed && <span className="campaign-closed-badge">Closed</span>}
      </div>
      {survey.description && <p className="survey-description">{survey.description}</p>}

      <div className="survey-admin-bar">
        <div className="survey-admin-badges">
          {survey.has_pin ? (
            <span className="survey-badge survey-badge-pin" title="Admin and gated results use the survey PIN">
              PIN protected
            </span>
          ) : (
            <span className="survey-badge survey-badge-open">No PIN</span>
          )}
          <span className="survey-badge survey-badge-visibility">
            {visibilityLabels[survey.results_visibility] || survey.results_visibility}
          </span>
          <span className={`survey-badge survey-badge-status ${isClosed ? 'closed' : 'active'}`}>
            {isClosed ? 'Closed' : 'Accepting responses'}
          </span>
          <span className="survey-badge">
            {survey.response_count ?? 0} response{(survey.response_count ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="survey-admin-access-row">
          {hasAdminAccess ? (
            <span className="survey-access survey-access-granted">
              Admin access — {isCreator && pinVerified
                ? 'Creator & PIN verified'
                : isCreator
                  ? 'You created this survey'
                  : 'PIN verified in this browser'}
            </span>
          ) : (
            <span className="survey-access survey-access-none">
              Respondent view — enter PIN for admin (close, delete, PIN-only results)
            </span>
          )}
          {survey.has_pin && !hasAdminAccess && (
            <button
              type="button"
              className="survey-enter-pin-btn"
              onClick={() => setShowPinModal(true)}
            >
              Enter PIN
            </button>
          )}
        </div>

        {hasAdminAccess && (
          <div className="survey-admin-actions">
            {!isClosed && (
              <button type="button" className="survey-admin-btn" onClick={handleClose}>
                Close survey
              </button>
            )}
            <button type="button" className="survey-admin-btn danger-btn" onClick={handleDelete}>
              Delete survey
            </button>
          </div>
        )}
      </div>

      {!submitted && !isClosed && (
        <>
          <SurveyForm survey={survey} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          {showResultsHint && (
            <p className="survey-results-hint">Results will appear after you submit.</p>
          )}
        </>
      )}

      {submitted && !isClosed && (
        <p className="survey-thanks">Thank you — your response has been recorded.</p>
      )}

      {isClosed && !submitted && (
        <p className="survey-closed-msg">This survey is closed.</p>
      )}

      {canLoadResults && (
        <section className="survey-results-section">
          <button
            type="button"
            className="survey-results-toggle"
            aria-expanded={resultsExpanded}
            onClick={() => setResultsExpanded((v) => !v)}
          >
            <span className="survey-results-toggle-label">
              {hasAdminAccess ? 'Results' : 'View results'}
              {' · '}
              {responseCount} response{responseCount !== 1 ? 's' : ''}
              {hasAdminAccess && <span className="survey-results-admin-tag">Admin</span>}
            </span>
            <span className="survey-results-toggle-chevron" aria-hidden="true">
              {resultsExpanded ? '▼' : '▶'}
            </span>
          </button>
          {resultsExpanded && (
            <div className="survey-results-body">
              {resultsError ? (
                <p className="survey-results-error">{resultsError}</p>
              ) : (
                <SurveyResults resultsData={resultsData} responseCount={responseCount} />
              )}
            </div>
          )}
        </section>
      )}

      {submitted &&
        survey.results_visibility === 'pin_only' &&
        !hasAdminAccess && (
          <div className="survey-results-gated">
            <p>Aggregated results require the survey PIN.</p>
            <button type="button" className="survey-enter-pin-btn" onClick={() => setShowPinModal(true)}>
              Enter PIN
            </button>
          </div>
        )}

      {showPinModal && (
        <SurveyPinEntryModal
          surveyId={surveyId}
          onClose={() => setShowPinModal(false)}
          onVerified={() => {
            setPinVerified(true);
            loadResults();
          }}
        />
      )}
    </div>
  );
}

export default SurveyPanel;
