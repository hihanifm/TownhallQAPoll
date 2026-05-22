import { useState, useRef, useCallback, useEffect } from 'react';
import {
  handleStepKeyboard,
  handleChoiceArrow,
} from '../utils/stepKeyboardNav';
import './SurveyForm.css';

function isQuestionAnswered(q, value) {
  if (value === undefined || value === null) return false;
  if (q.type === 'single') {
    if (typeof value === 'object' && value.other != null) {
      return String(value.other).trim().length > 0;
    }
    return typeof value === 'string' && value.length > 0;
  }
  if (q.type === 'multi') {
    const selected = value?.selected ?? value;
    if (Array.isArray(selected) && selected.length > 0) return true;
    if (value?.other != null && String(value.other).trim()) return true;
    return false;
  }
  if (q.type === 'rating') {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= 5;
  }
  if (q.type === 'text') {
    return String(value).trim().length > 0;
  }
  return false;
}

function SurveyForm({ survey, onSubmit, isSubmitting, preview = false }) {
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState(null);
  const wrapRef = useRef(null);
  const formRef = useRef(null);

  const questions = survey.questions || [];
  const total = questions.length;
  const currentQuestion = questions[currentStep];
  const isLast = currentStep >= total - 1;
  const progressPct = total > 0 ? ((currentStep + 1) / total) * 100 : 0;

  const setAnswer = (questionId, value) => {
    setStepError(null);
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!preview) {
      for (const q of questions) {
        if (!isQuestionAnswered(q, answers[q.id])) {
          setStepError(`Please answer: ${q.prompt}`);
          setCurrentStep(questions.findIndex((x) => x.id === q.id));
          return;
        }
      }
    }
    const payload = questions.map((q) => ({
      question_id: q.id,
      value: answers[q.id],
    }));
    onSubmit(payload);
  };

  const goNext = useCallback(() => {
    if (!preview && currentQuestion && !isQuestionAnswered(currentQuestion, answers[currentQuestion.id])) {
      setStepError('Please answer this question before continuing.');
      return;
    }
    setStepError(null);
    setCurrentStep((s) => Math.min(s + 1, total - 1));
  }, [preview, currentQuestion, answers, total]);

  const goBack = useCallback(() => {
    setStepError(null);
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleKeyboard = useCallback(
    (e) => {
      if (isSubmitting || !wrapRef.current) return;

      const q = questions[currentStep];
      if (q?.type === 'single') {
        const opts = q.options?.options || (Array.isArray(q.options) ? q.options : []);
        const current = answers[q.id];
        const list = typeof current === 'object' && current?.other != null ? opts : opts;
        if (
          handleChoiceArrow(e, {
            container: wrapRef.current,
            options: list,
            currentValue: typeof current === 'string' ? current : null,
            onSelect: (val) => setAnswer(q.id, val),
          })
        ) {
          return;
        }
      }
      if (q?.type === 'rating') {
        if (
          handleChoiceArrow(e, {
            container: wrapRef.current,
            options: [1, 2, 3, 4, 5],
            currentValue: answers[q.id],
            onSelect: (val) => setAnswer(q.id, val),
          })
        ) {
          return;
        }
      }

      handleStepKeyboard(e, {
        container: wrapRef.current,
        onPrev: goBack,
        onNext: goNext,
        onEnter: goNext,
        isLast,
        onSubmit: preview
          ? undefined
          : () => {
              formRef.current?.requestSubmit();
            },
      });
    },
    [isSubmitting, questions, currentStep, answers, isLast, preview, goNext, goBack]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  useEffect(() => {
    wrapRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  const renderQuestion = (q) => {
    const opts = q.options?.options || (Array.isArray(q.options) ? q.options : []);
    const allowOther = q.options?.allow_other;

    if (q.type === 'single') {
      const current = answers[q.id];
      const isOther = typeof current === 'object' && current?.other != null;
      return (
        <div className="survey-question">
          <h3 className="survey-question-prompt">{q.prompt}</h3>
          <div className="survey-options survey-options-cards">
            {opts.map((opt) => (
              <label
                key={opt}
                className={`survey-option-card ${current === opt ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={current === opt}
                  onChange={() => setAnswer(q.id, opt)}
                  disabled={isSubmitting}
                />
                <span>{opt}</span>
              </label>
            ))}
            {allowOther && (
              <label className={`survey-option-card ${isOther ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={isOther}
                  onChange={() => setAnswer(q.id, { other: '' })}
                  disabled={isSubmitting}
                />
                <span>Other</span>
              </label>
            )}
            {allowOther && isOther && (
              <input
                type="text"
                className="survey-other-input"
                placeholder="Please specify"
                value={current?.other || ''}
                onChange={(e) => setAnswer(q.id, { other: e.target.value })}
                disabled={isSubmitting}
              />
            )}
          </div>
        </div>
      );
    }

    if (q.type === 'multi') {
      const current = answers[q.id] || { selected: [] };
      const selected = current.selected || [];
      const toggle = (opt) => {
        const next = selected.includes(opt)
          ? selected.filter((s) => s !== opt)
          : [...selected, opt];
        setAnswer(q.id, { ...current, selected: next });
      };
      return (
        <div className="survey-question">
          <h3 className="survey-question-prompt">{q.prompt}</h3>
          <p className="survey-question-hint">Select all that apply</p>
          <div className="survey-options survey-options-cards">
            {opts.map((opt) => (
              <label
                key={opt}
                className={`survey-option-card ${selected.includes(opt) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  disabled={isSubmitting}
                />
                <span>{opt}</span>
              </label>
            ))}
            {allowOther && (
              <>
                <label className={`survey-option-card ${current.other != null ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={current.other != null}
                    onChange={(e) =>
                      setAnswer(q.id, {
                        selected,
                        other: e.target.checked ? (current.other || '') : undefined,
                      })
                    }
                    disabled={isSubmitting}
                  />
                  <span>Other</span>
                </label>
                {current.other != null && (
                  <input
                    type="text"
                    className="survey-other-input"
                    placeholder="Please specify"
                    value={current.other || ''}
                    onChange={(e) => setAnswer(q.id, { selected, other: e.target.value })}
                    disabled={isSubmitting}
                  />
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    if (q.type === 'rating') {
      return (
        <div className="survey-question">
          <h3 className="survey-question-prompt">{q.prompt}</h3>
          <p className="survey-question-hint">1 = lowest, 5 = highest</p>
          <div className="survey-rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className={`survey-rating-btn ${answers[q.id] === n ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={answers[q.id] === n}
                  onChange={() => setAnswer(q.id, n)}
                  disabled={isSubmitting}
                />
                {n}
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (q.type === 'text') {
      return (
        <div className="survey-question">
          <h3 className="survey-question-prompt">{q.prompt}</h3>
          <textarea
            rows={4}
            value={answers[q.id] || ''}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            disabled={isSubmitting}
            placeholder="Your answer"
            className="survey-text-input"
          />
        </div>
      );
    }

    return null;
  };

  if (total === 0) {
    return <p className="survey-empty">No questions in this survey.</p>;
  }

  const keyboardHint = (() => {
    const t = currentQuestion?.type;
    if (t === 'text') return '←→ move between questions · ⌘/Ctrl+Enter to continue';
    if (t === 'single' || t === 'rating') return '↑↓ select answer · ←→ move between questions · Enter to continue';
    if (t === 'multi') return '←→ move between questions · Enter to continue';
    return '←→ move between questions · Enter to continue';
  })();

  return (
    <div
      ref={wrapRef}
      tabIndex={-1}
      className={`survey-form-wrap ${preview ? 'survey-form-preview' : ''}`}
    >
      {preview && (
        <p className="survey-preview-banner">
          Rehearsal — try the survey as respondents will see it. Answers are not saved.
        </p>
      )}

      <div className="survey-progress">
        <div className="survey-progress-track">
          <div className="survey-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="survey-progress-label">
          Question {currentStep + 1} of {total}
        </span>
      </div>

      <div className="survey-step-dots">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            className={`survey-step-dot ${i === currentStep ? 'active' : ''} ${isQuestionAnswered(q, answers[q.id]) ? 'done' : ''}`}
            onClick={() => {
              setStepError(null);
              setCurrentStep(i);
            }}
            title={q.prompt}
            aria-label={`Question ${i + 1}`}
          />
        ))}
      </div>

      {stepError && <div className="survey-step-error">{stepError}</div>}

      <form
        ref={formRef}
        className="survey-form survey-form-stepped"
        onSubmit={preview ? (e) => e.preventDefault() : handleSubmit}
      >
        <div className="survey-question-slide">{currentQuestion && renderQuestion(currentQuestion)}</div>

        <div className="survey-step-nav">
          <button
            type="button"
            className="survey-nav-btn secondary"
            onClick={goBack}
            disabled={currentStep === 0 || isSubmitting}
          >
            Back
          </button>
          {!isLast && (
            <button
              type="button"
              className="survey-nav-btn primary"
              onClick={goNext}
              disabled={isSubmitting}
            >
              Next
            </button>
          )}
          {isLast && !preview && (
            <button type="submit" className="survey-nav-btn primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit survey'}
            </button>
          )}
          {isLast && preview && (
            <span className="survey-rehearse-end">End of rehearsal</span>
          )}
        </div>
        <p className="survey-keyboard-hint" aria-hidden="true">
          {keyboardHint}
        </p>
      </form>
    </div>
  );
}

export default SurveyForm;
