import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import {
  getVerifiedPin,
  getVerifiedParticipantPin,
  hasVerifiedPin,
  hasVerifiedParticipantPin,
} from '../utils/surveyPin';
import SurveyForm from './SurveyForm';
import SurveyResults from './SurveyResults';
import SurveyPinEntryModal from './SurveyPinEntryModal';
import CreateSurveyWizard from './CreateSurveyWizard';
import { exportSurveySummaryCsv } from '../utils/surveyExport';
import SurveyThanksCelebration from './SurveyThanksCelebration';
import { showAppNotice } from '../utils/appNotice';
import ConfirmDialog from './ConfirmDialog';
import './QuestionPanel.css';
import './SurveyResults.css';

const CONFIDENTIAL_LABEL = '— Confidential survey';

function SurveyPanel({ surveyId, isCreating, onCancelCreate, onSurveyCreated, onSurveyClosed, onSurveyDeleted }) {
  const [survey, setSurvey] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [myAnswers, setMyAnswers] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [resultsError, setResultsError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showParticipantPinModal, setShowParticipantPinModal] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [participantPinVerified, setParticipantPinVerified] = useState(false);
  const [resultsExpanded, setResultsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadSurvey = useCallback(async () => {
    if (!surveyId) return;
    setIsLoading(true);
    try {
      const userId = getUserId();
      const data = await api.getSurvey(surveyId, {
        participantPin: getVerifiedParticipantPin(surveyId) || undefined,
        surveyPin: getVerifiedPin(surveyId) || undefined,
        creatorId: userId,
      });
      setSurvey(data);
      const status = await api.getSurveySubmissionStatus(surveyId, userId, {
        participantPin: getVerifiedParticipantPin(surveyId) || undefined,
        surveyPin: getVerifiedPin(surveyId) || undefined,
        creatorId: userId,
      });
      setSubmitted(status.submitted);
      setMyAnswers(status.submitted && status.answers ? status.answers : null);
      setPinVerified(hasVerifiedPin(surveyId));
      setParticipantPinVerified(hasVerifiedParticipantPin(surveyId));
    } catch (err) {
      console.error(err);
      setSurvey(null);
    } finally {
      setIsLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    setShowCelebration(false);
  }, [surveyId]);

  const loadResults = useCallback(async () => {
    if (!surveyId || !survey) return;
    setResultsError(null);
    const userId = getUserId();
    const pin = getVerifiedPin(surveyId);
    const isCreator = survey.is_mine;
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
    setMyAnswers(null);
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

  const hasAdminAccess = survey
    ? survey.is_mine || pinVerified
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

  const isCreator = survey?.is_mine;
  const needsParticipantPin = Boolean(
    survey &&
    survey.has_participant_pin &&
    !isCreator &&
    !participantPinVerified &&
    !submitted
  );

  useEffect(() => {
    if (needsParticipantPin) {
      setShowParticipantPinModal(true);
    }
  }, [surveyId, needsParticipantPin]);

  const endCelebration = useCallback(() => setShowCelebration(false), []);

  const handleSubmit = async (answers) => {
    setIsSubmitting(true);
    try {
      const userId = getUserId();
      const isCreator = survey?.is_mine;
      await api.submitSurvey(surveyId, userId, answers, {
        participantPin: getVerifiedParticipantPin(surveyId) || undefined,
        creatorId: isCreator ? userId : undefined,
      });
      setSubmitted(true);
      setShowCelebration(true);
      await loadSurvey();
      await loadResults();
    } catch (err) {
      showAppNotice(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runCloseSurvey = async () => {
    try {
      const userId = getUserId();
      const pin = getVerifiedPin(surveyId);
      await api.closeSurvey(surveyId, userId, pin);
      await loadSurvey();
      if (onSurveyClosed) onSurveyClosed(surveyId);
    } catch (err) {
      showAppNotice(err.message);
    }
  };

  const handleClose = () => {
    setConfirmDialog({
      title: 'Close survey',
      message: 'Close this survey? No new responses will be accepted.',
      confirmLabel: 'Close',
      onConfirm: () => {
        setConfirmDialog(null);
        runCloseSurvey();
      },
    });
  };

  const handleExportSummary = async () => {
    setIsExporting(true);
    try {
      let data = resultsData;
      if (!data) {
        const userId = getUserId();
        const pin = getVerifiedPin(surveyId);
        data = await api.getSurveyResults(surveyId, {
          userId,
          surveyPin: pin,
          creatorId: userId,
        });
        setResultsData(data);
      }
      exportSurveySummaryCsv(survey?.title || 'survey', data);
    } catch (err) {
      showAppNotice(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportResponses = async () => {
    setIsExporting(true);
    try {
      const userId = getUserId();
      const pin = getVerifiedPin(surveyId);
      await api.downloadSurveyResponsesExport(surveyId, {
        creatorId: userId,
        surveyPin: pin,
      });
    } catch (err) {
      showAppNotice(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const runDeleteSurvey = async () => {
    try {
      const userId = getUserId();
      const pin = getVerifiedPin(surveyId);
      await api.deleteSurvey(surveyId, userId, pin);
      if (onSurveyDeleted) onSurveyDeleted(surveyId);
    } catch (err) {
      showAppNotice(err.message);
    }
  };

  const handleDelete = () => {
    setConfirmDialog({
      title: 'Delete survey',
      message: 'Delete this survey permanently?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        runDeleteSurvey();
      },
    });
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
  const canParticipate =
    !survey.has_participant_pin ||
    isCreator ||
    participantPinVerified;

  const responseCount =
    resultsData?.response_count ?? survey.response_count ?? 0;

  const showResultsHint =
    !hasAdminAccess &&
    !submitted &&
    !isClosed &&
    survey.results_visibility !== 'pin_only';

  return (
    <div className="question-panel survey-question-panel">
      {showCelebration && (
        <SurveyThanksCelebration onComplete={endCelebration} />
      )}
      <div className="question-panel-header survey-panel-header">
        <h2 className="survey-title">
          {needsParticipantPin ? CONFIDENTIAL_LABEL : survey.title}
          {!needsParticipantPin && survey.has_pin && (
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
        {!needsParticipantPin && isClosed && (
          <span className="campaign-closed-badge">Closed</span>
        )}
      </div>
      {!needsParticipantPin && survey.description && (
        <p className="survey-description">{survey.description}</p>
      )}

      {!needsParticipantPin && (
      <div className="survey-admin-bar">
        <div className="survey-admin-badges">
          {survey.has_pin ? (
            <span className="survey-badge survey-badge-pin" title="Admin and gated results use the survey PIN">
              PIN protected
            </span>
          ) : (
            <span className="survey-badge survey-badge-open">No PIN</span>
          )}
          {survey.has_participant_pin && (
            <span className="survey-badge survey-badge-pin" title="Respondents need the participant PIN">
              Participant PIN required
            </span>
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
      )}

      {!submitted && !isClosed && needsParticipantPin && (
        <div className="survey-results-gated">
          <p>Enter the participant PIN to take this survey.</p>
          <button
            type="button"
            className="survey-enter-pin-btn"
            onClick={() => setShowParticipantPinModal(true)}
          >
            Enter participant PIN
          </button>
        </div>
      )}

      {!submitted && !isClosed && canParticipate && (
        <>
          <SurveyForm survey={survey} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          {showResultsHint && (
            <p className="survey-results-hint">Results will appear after you submit.</p>
          )}
        </>
      )}

      {submitted && (
        <p className="survey-thanks">Thank you — your response has been recorded.</p>
      )}

      {isClosed && !submitted && (
        <p className="survey-closed-msg">This survey is closed.</p>
      )}

      {submitted && myAnswers?.length > 0 && (
        <section className="survey-my-response" aria-labelledby="survey-my-response-heading">
          <h3 id="survey-my-response-heading" className="survey-my-response-heading">Your response</h3>
          <div className="survey-results">
            {myAnswers.map((a) => (
              <div key={a.question_id} className="survey-result-card">
                <h4 className="survey-result-prompt">{a.prompt}</h4>
                <p className="survey-my-response-answer">{a.display}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {canLoadResults && (
        <section className="survey-results-section">
          <div className="survey-results-toolbar">
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
            <div className="survey-results-export-actions">
              <button
                type="button"
                className="survey-export-btn survey-export-btn--summary"
                disabled={isExporting}
                onClick={handleExportSummary}
              >
                <span className="survey-export-btn-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </span>
                Export summary
              </button>
              {hasAdminAccess && (
                <button
                  type="button"
                  className="survey-export-btn survey-export-btn--responses"
                  disabled={isExporting}
                  onClick={handleExportResponses}
                >
                  <span className="survey-export-btn-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </span>
                  Export responses
                </button>
              )}
            </div>
          </div>
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
          mode="admin"
          onClose={() => setShowPinModal(false)}
          onVerified={() => {
            setPinVerified(true);
            loadSurvey();
            loadResults();
          }}
        />
      )}

      {showParticipantPinModal && (
        <SurveyPinEntryModal
          surveyId={surveyId}
          mode="participant"
          onClose={() => setShowParticipantPinModal(false)}
          onVerified={() => {
            setParticipantPinVerified(true);
            loadSurvey();
          }}
        />
      )}
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Confirm'}
        danger={confirmDialog?.danger}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}

export default SurveyPanel;
