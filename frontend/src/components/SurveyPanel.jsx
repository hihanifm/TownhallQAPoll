import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import { getVerifiedPin, hasVerifiedPin } from '../utils/surveyPin';
import SurveyForm from './SurveyForm';
import SurveyResults from './SurveyResults';
import SurveyPinEntryModal from './SurveyPinEntryModal';
import './QuestionPanel.css';

function SurveyPanel({ surveyId, onSurveyClosed, onSurveyDeleted }) {
  const [survey, setSurvey] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [resultsError, setResultsError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

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
    try {
      const data = await api.getSurveyResults(surveyId, {
        userId: submitted ? userId : undefined,
        surveyPin: pin || undefined,
        creatorId: userId,
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

  useEffect(() => {
    if (survey && (submitted || survey.results_visibility === 'public' || pinVerified)) {
      loadResults();
    }
  }, [survey, submitted, pinVerified, loadResults]);

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

  const canShowResults =
    survey &&
    (survey.results_visibility === 'public' ||
      submitted ||
      pinVerified);

  const visibilityLabel = {
    pin_only: 'Results: PIN only',
    after_submit: 'Results: after you submit',
    public: 'Results: public',
  };

  if (!surveyId) {
    return (
      <div className="question-panel">
        <div className="question-panel-empty">
          <p>Select a survey or create a new one</p>
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
  const isCreator = survey.creator_id === getUserId();

  return (
    <div className="question-panel">
      <div className="question-panel-header">
        <h2>{survey.title}</h2>
        {survey.status === 'closed' && <span className="campaign-closed-badge">Closed</span>}
      </div>
      {survey.description && <p className="survey-description">{survey.description}</p>}
      <p className="survey-meta">
        {visibilityLabel[survey.results_visibility] || survey.results_visibility}
        {' · '}
        {survey.response_count ?? 0} response(s)
      </p>

      {(isCreator || pinVerified) && survey.status === 'active' && (
        <div className="survey-admin-actions">
          <button type="button" onClick={handleClose}>Close Survey</button>
          <button type="button" className="danger-btn" onClick={handleDelete}>Delete</button>
        </div>
      )}

      {!submitted && !isClosed && (
        <SurveyForm survey={survey} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      )}

      {submitted && !isClosed && (
        <p className="survey-thanks">Thank you — your response has been recorded.</p>
      )}

      {isClosed && !submitted && (
        <p className="survey-closed-msg">This survey is closed.</p>
      )}

      {canShowResults ? (
        <div className="survey-results-section">
          <h3>Results</h3>
          <SurveyResults resultsData={resultsData} responseCount={survey.response_count} />
        </div>
      ) : (
        <div className="survey-results-gated">
          {resultsError && <p>{resultsError}</p>}
          {!submitted && survey.results_visibility === 'after_submit' && (
            <p>Submit the survey to see results.</p>
          )}
          {survey.results_visibility === 'pin_only' && !pinVerified && (
            <>
              <p>Results require the survey PIN.</p>
              <button type="button" onClick={() => setShowPinModal(true)}>Enter PIN</button>
            </>
          )}
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
