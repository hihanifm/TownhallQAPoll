import { useState } from 'react';
import './SurveyForm.css';

function SurveyForm({ survey, onSubmit, isSubmitting }) {
  const [answers, setAnswers] = useState({});

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = survey.questions.map((q) => ({
      question_id: q.id,
      value: answers[q.id],
    }));
    onSubmit(payload);
  };

  const renderQuestion = (q) => {
    const opts = q.options?.options || (Array.isArray(q.options) ? q.options : []);
    const allowOther = q.options?.allow_other;

    if (q.type === 'single') {
      const current = answers[q.id];
      const isOther = typeof current === 'object' && current?.other != null;
      return (
        <div key={q.id} className="survey-question">
          <label className="survey-question-prompt">{q.prompt}</label>
          <div className="survey-options">
            {opts.map((opt) => (
              <label key={opt} className="survey-option">
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={current === opt}
                  onChange={() => setAnswer(q.id, opt)}
                  disabled={isSubmitting}
                />
                {opt}
              </label>
            ))}
            {allowOther && (
              <label className="survey-option">
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={isOther}
                  onChange={() => setAnswer(q.id, { other: '' })}
                  disabled={isSubmitting}
                />
                Other
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
        <div key={q.id} className="survey-question">
          <label className="survey-question-prompt">{q.prompt}</label>
          <div className="survey-options">
            {opts.map((opt) => (
              <label key={opt} className="survey-option">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  disabled={isSubmitting}
                />
                {opt}
              </label>
            ))}
            {allowOther && (
              <>
                <label className="survey-option">
                  <input
                    type="checkbox"
                    checked={!!current.other}
                    onChange={(e) =>
                      setAnswer(q.id, {
                        selected,
                        other: e.target.checked ? (current.other || '') : undefined,
                      })
                    }
                    disabled={isSubmitting}
                  />
                  Other
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
        <div key={q.id} className="survey-question">
          <label className="survey-question-prompt">{q.prompt}</label>
          <div className="survey-rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="survey-rating-btn">
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
        <div key={q.id} className="survey-question">
          <label className="survey-question-prompt">{q.prompt}</label>
          <textarea
            rows={3}
            value={answers[q.id] || ''}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            disabled={isSubmitting}
            placeholder="Your answer"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <form className="survey-form" onSubmit={handleSubmit}>
      {survey.questions.map(renderQuestion)}
      <button type="submit" className="survey-submit-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Survey'}
      </button>
    </form>
  );
}

export default SurveyForm;
