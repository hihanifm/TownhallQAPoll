import { useState, useRef, useCallback, useEffect } from 'react';
import { handleStepKeyboard } from '../utils/stepKeyboardNav';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import { storeVerifiedPin, storeVerifiedParticipantPin } from '../utils/surveyPin';
import SurveyForm from './SurveyForm';
import './CreateSurveyWizard.css';

const STEPS = ['details', 'questions', 'rehearse'];

const VISIBILITY_LABELS = {
  pin_only: 'PIN only (creator)',
  after_submit: 'After respondent submits',
  public: 'Public (live)',
};

const EMPTY_QUESTION = () => ({
  prompt: '',
  type: 'single',
  options: ['Option 1', 'Option 2'],
  allow_other: false,
});

const INITIAL_FORM = {
  title: '',
  description: '',
  pin: '',
  require_participant_pin: false,
  participant_pin: '',
  results_visibility: 'pin_only',
  questions: [EMPTY_QUESTION()],
};

const SAMPLE_SURVEY_FORM = {
  title: 'Sample Survey — Try All Question Types',
  description: 'A quick demo of single choice, multiple choice, rating, and short text. Edit anything before publishing.',
  pin: '',
  require_participant_pin: false,
  participant_pin: '',
  results_visibility: 'after_submit',
  questions: [
    {
      prompt: 'Which mythical creature best matches your Monday mood?',
      type: 'single',
      options: ['Dragon', 'Sloth', 'Phoenix', 'Unicorn'],
      allow_other: true,
    },
    {
      prompt: 'Which office upgrades would you vote for? (pick all that apply)',
      type: 'multi',
      options: ['Standing desks', 'Better coffee', 'Quiet rooms', 'More plants'],
      allow_other: false,
    },
    {
      prompt: 'How would you rate our office Wi‑Fi?',
      type: 'rating',
      options: ['Option 1', 'Option 2'],
      allow_other: false,
    },
    {
      prompt: 'What device serial number are you looking for?',
      type: 'text',
      options: ['Option 1', 'Option 2'],
      allow_other: false,
    },
  ],
};

function validateDetails(formData) {
  if (!formData.title.trim()) return 'Survey title is required';
  if (!formData.pin.trim()) return 'A PIN is required for results and admin access';
  if (formData.require_participant_pin) {
    if (!formData.participant_pin.trim()) return 'Participant PIN is required when participation is gated';
    if (formData.participant_pin.trim() === formData.pin.trim()) {
      return 'Participant PIN must differ from admin PIN';
    }
  }
  return null;
}

function validateQuestions(questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.prompt.trim()) return `Question ${i + 1} needs a prompt`;
    if ((q.type === 'single' || q.type === 'multi') && q.options.filter((o) => o.trim()).length < 2) {
      return `Question ${i + 1} needs at least two options`;
    }
  }
  return null;
}

function buildPreviewSurvey(formData) {
  return {
    title: formData.title.trim(),
    description: formData.description.trim() || null,
    questions: formData.questions.map((q, i) => ({
      id: `preview-${i}`,
      prompt: q.prompt.trim(),
      type: q.type,
      options:
        q.type === 'single' || q.type === 'multi'
          ? { options: q.options.map((o) => o.trim()).filter(Boolean), allow_other: !!q.allow_other }
          : null,
    })),
  };
}

function CreateSurveyWizard({ onCancel, onCreated }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const questionsPanelRef = useRef(null);

  const goToStep = (index) => {
    if (index <= maxStepReached) {
      setError(null);
      setStep(index);
    }
  };

  const handleNextFromDetails = () => {
    const err = validateDetails(formData);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(1);
    setMaxStepReached((m) => Math.max(m, 1));
  };

  const handleNextFromQuestions = () => {
    const err = validateQuestions(formData.questions);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(2);
    setMaxStepReached((m) => Math.max(m, 2));
  };

  const handleLoadSample = () => {
    setFormData({
      ...SAMPLE_SURVEY_FORM,
      pin: formData.pin,
      require_participant_pin: formData.require_participant_pin,
      participant_pin: formData.participant_pin,
    });
    setActiveQuestionIndex(0);
    setError(null);
  };

  const questionCount = formData.questions.length;

  const goQuestionPrev = useCallback(() => {
    setActiveQuestionIndex((i) => Math.max(0, i - 1));
  }, []);

  const goQuestionNext = useCallback(() => {
    setActiveQuestionIndex((i) => Math.min(questionCount - 1, i + 1));
  }, [questionCount]);

  const handleQuestionsKeyboard = useCallback(
    (e) => {
      if (step !== 1 || isSubmitting || !questionsPanelRef.current) return;

      const isLastQuestion = activeQuestionIndex >= questionCount - 1;
      handleStepKeyboard(e, {
        container: questionsPanelRef.current,
        onPrev: goQuestionPrev,
        onNext: goQuestionNext,
        onEnter: isLastQuestion ? handleNextFromQuestions : goQuestionNext,
        isLast: isLastQuestion,
      });
    },
    [
      step,
      isSubmitting,
      activeQuestionIndex,
      questionCount,
      goQuestionPrev,
      goQuestionNext,
      handleNextFromQuestions,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleQuestionsKeyboard);
    return () => window.removeEventListener('keydown', handleQuestionsKeyboard);
  }, [handleQuestionsKeyboard]);

  useEffect(() => {
    if (step === 1 && questionsPanelRef.current) {
      questionsPanelRef.current.focus();
    }
  }, [step]);

  const updateQuestion = (index, field, value) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      if (field === 'type' && (value === 'rating' || value === 'text')) {
        questions[index].options = ['Option 1', 'Option 2'];
        questions[index].allow_other = false;
      }
      return { ...prev, questions };
    });
  };

  const updateOption = (qIndex, oIndex, value) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      const opts = [...questions[qIndex].options];
      opts[oIndex] = value;
      questions[qIndex] = { ...questions[qIndex], options: opts };
      return { ...prev, questions };
    });
  };

  const addOption = (qIndex) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      const n = questions[qIndex].options.length + 1;
      questions[qIndex] = {
        ...questions[qIndex],
        options: [...questions[qIndex].options, `Option ${n}`],
      };
      return { ...prev, questions };
    });
  };

  const removeOption = (qIndex, oIndex) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      const opts = questions[qIndex].options.filter((_, i) => i !== oIndex);
      if (opts.length < 2) return prev;
      questions[qIndex] = { ...questions[qIndex], options: opts };
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, EMPTY_QUESTION()],
    }));
    setActiveQuestionIndex(formData.questions.length);
  };

  const removeQuestion = (index) => {
    if (formData.questions.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
    setActiveQuestionIndex((i) => {
      if (i > index) return i - 1;
      if (i === index) return Math.max(0, index - 1);
      return i;
    });
  };

  const handlePublish = async () => {
    const dErr = validateDetails(formData);
    if (dErr) {
      setError(dErr);
      setStep(0);
      return;
    }
    const qErr = validateQuestions(formData.questions);
    if (qErr) {
      setError(qErr);
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const userId = getUserId();
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        creator_id: userId,
        pin: formData.pin.trim(),
        participant_pin: formData.require_participant_pin ? formData.participant_pin.trim() : null,
        results_visibility: formData.results_visibility,
        questions: formData.questions.map((q) => ({
          prompt: q.prompt.trim(),
          type: q.type,
          options:
            q.type === 'single' || q.type === 'multi'
              ? q.options.map((o) => o.trim()).filter(Boolean)
              : undefined,
          allow_other: q.allow_other || false,
        })),
      };
      const created = await api.createSurvey(payload);
      storeVerifiedPin(created.id, formData.pin.trim());
      if (formData.require_participant_pin) {
        storeVerifiedParticipantPin(created.id, formData.participant_pin.trim());
      }
      if (onCreated) onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const q = formData.questions[activeQuestionIndex];

  return (
    <div className="create-survey-wizard">
      <div className="create-survey-wizard-header">
        <h2>Create survey</h2>
        <button type="button" className="wizard-cancel-btn" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>

      <div className="wizard-steps" role="tablist" aria-label="Setup steps">
        {['Details', 'Questions', 'Rehearse'].map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={step === i}
            className={`wizard-step ${step === i ? 'active' : ''} ${i <= maxStepReached ? 'reachable' : ''}`}
            onClick={() => goToStep(i)}
            disabled={i > maxStepReached}
          >
            <span className="wizard-step-num">{i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="wizard-error">{error}</div>}

      {step === 0 && (
        <div className="wizard-panel">
          <p className="wizard-panel-desc">Basic info and who can see results.</p>
          <label className="wizard-field">
            <span>Survey title *</span>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Team pulse check"
              disabled={isSubmitting}
            />
          </label>
          <label className="wizard-field">
            <span>Description (optional)</span>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this survey for?"
              disabled={isSubmitting}
            />
          </label>
          <label className="wizard-field">
            <span>Admin PIN *</span>
            <input
              type="password"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              placeholder="Share with co-admins; needed for results when PIN-only"
              disabled={isSubmitting}
            />
          </label>
          <div className="wizard-advanced">
            <button
              type="button"
              className="wizard-advanced-toggle"
              aria-expanded={showAdvanced}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              Advanced options {showAdvanced ? '▾' : '▸'}
            </button>
            {showAdvanced && (
              <div className="wizard-advanced-body">
                <label className="wizard-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.require_participant_pin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        require_participant_pin: e.target.checked,
                        participant_pin: e.target.checked ? formData.participant_pin : '',
                      })
                    }
                    disabled={isSubmitting}
                  />
                  <span>Require PIN to participate</span>
                </label>
                {formData.require_participant_pin && (
                  <label className="wizard-field">
                    <span>Participant PIN *</span>
                    <input
                      type="password"
                      value={formData.participant_pin}
                      onChange={(e) => setFormData({ ...formData, participant_pin: e.target.value })}
                      placeholder="Share with respondents; separate from admin PIN"
                      disabled={isSubmitting}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
          <label className="wizard-field">
            <span>Results visibility</span>
            <select
              value={formData.results_visibility}
              onChange={(e) => setFormData({ ...formData, results_visibility: e.target.value })}
              disabled={isSubmitting}
            >
              <option value="pin_only">PIN only (creator)</option>
              <option value="after_submit">After respondent submits</option>
              <option value="public">Public (live)</option>
            </select>
          </label>
          <div className="wizard-footer">
            <button
              type="button"
              className="wizard-secondary-btn"
              onClick={handleLoadSample}
              disabled={isSubmitting}
            >
              Load sample survey
            </button>
            <button type="button" className="wizard-primary-btn" onClick={handleNextFromDetails}>
              Continue to questions
            </button>
          </div>
        </div>
      )}

      {step === 1 && q && (
        <div ref={questionsPanelRef} className="wizard-panel" tabIndex={-1}>
          <div className="wizard-question-nav">
            <span className="wizard-question-counter">
              Question {activeQuestionIndex + 1} of {questionCount}
            </span>
            <div className="wizard-question-nav-btns">
              <button
                type="button"
                disabled={activeQuestionIndex === 0}
                onClick={() => setActiveQuestionIndex((i) => i - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={activeQuestionIndex >= questionCount - 1}
                onClick={() => setActiveQuestionIndex((i) => i + 1)}
              >
                Next
              </button>
            </div>
          </div>

          <div className="wizard-question-card">
            <label className="wizard-field">
              <span>Question prompt *</span>
              <input
                type="text"
                value={q.prompt}
                onChange={(e) => updateQuestion(activeQuestionIndex, 'prompt', e.target.value)}
                placeholder="What do you want to ask?"
                disabled={isSubmitting}
              />
            </label>
            <label className="wizard-field">
              <span>Answer type</span>
              <select
                value={q.type}
                onChange={(e) => updateQuestion(activeQuestionIndex, 'type', e.target.value)}
                disabled={isSubmitting}
              >
                <option value="single">Single choice</option>
                <option value="multi">Multiple choice</option>
                <option value="rating">Rating 1–5</option>
                <option value="text">Short text</option>
              </select>
            </label>
            {(q.type === 'single' || q.type === 'multi') && (
              <div className="wizard-options">
                <span className="wizard-field-label">Options</span>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="wizard-option-row">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(activeQuestionIndex, oi, e.target.value)}
                      disabled={isSubmitting}
                    />
                    {q.options.length > 2 && (
                      <button
                        type="button"
                        className="wizard-icon-btn"
                        onClick={() => removeOption(activeQuestionIndex, oi)}
                        disabled={isSubmitting}
                        aria-label="Remove option"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="wizard-secondary-btn" onClick={() => addOption(activeQuestionIndex)}>
                  + Add option
                </button>
                <label className="wizard-checkbox">
                  <input
                    type="checkbox"
                    checked={q.allow_other}
                    onChange={(e) => updateQuestion(activeQuestionIndex, 'allow_other', e.target.checked)}
                    disabled={isSubmitting}
                  />
                  Allow &quot;Other&quot; with free text
                </label>
              </div>
            )}
            {questionCount > 1 && (
              <button
                type="button"
                className="wizard-danger-text"
                onClick={() => removeQuestion(activeQuestionIndex)}
                disabled={isSubmitting}
              >
                Remove this question
              </button>
            )}
          </div>

          <div className="wizard-question-chips">
            {formData.questions.map((_, qi) => (
              <button
                key={qi}
                type="button"
                className={`wizard-chip ${qi === activeQuestionIndex ? 'active' : ''}`}
                onClick={() => setActiveQuestionIndex(qi)}
                title={formData.questions[qi].prompt || `Question ${qi + 1}`}
              >
                {qi + 1}
              </button>
            ))}
            <button type="button" className="wizard-chip add" onClick={addQuestion}>
              +
            </button>
          </div>

          <div className="wizard-footer">
            <button type="button" className="wizard-secondary-btn" onClick={() => { setError(null); setStep(0); }}>
              Back
            </button>
            <button type="button" className="wizard-primary-btn" onClick={handleNextFromQuestions}>
              Preview & publish
            </button>
          </div>
          <p className="wizard-keyboard-hint" aria-hidden="true">
            ←→ move between questions · Enter to continue
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-panel wizard-rehearse">
          <div className="wizard-summary">
            <h3>{formData.title.trim() || 'Untitled survey'}</h3>
            {formData.description.trim() && <p>{formData.description.trim()}</p>}
            <ul>
              <li>{questionCount} question{questionCount !== 1 ? 's' : ''}</li>
              <li>Results: {VISIBILITY_LABELS[formData.results_visibility]}</li>
              {formData.require_participant_pin && <li>Participant PIN required to respond</li>}
            </ul>
          </div>
          <div className="wizard-preview-wrap">
            <SurveyForm survey={buildPreviewSurvey(formData)} preview />
          </div>
          <div className="wizard-footer">
            <button
              type="button"
              className="wizard-secondary-btn"
              onClick={() => { setError(null); setStep(1); }}
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              type="button"
              className="wizard-primary-btn"
              onClick={handlePublish}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publishing...' : 'Publish survey'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateSurveyWizard;
