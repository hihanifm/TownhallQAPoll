import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getUserId } from '../utils/userId';
import { storeVerifiedPin } from '../utils/surveyPin';
import { formatRelativeTime } from '../utils/dateFormat';
import './CampaignList.css';

const EMPTY_QUESTION = () => ({
  prompt: '',
  type: 'single',
  options: ['Yes', 'No'],
  allow_other: false,
});

function SurveyList({ selectedSurveyId, onSurveySelect, onSurveyCreated }) {
  const [surveys, setSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    pin: '',
    results_visibility: 'pin_only',
    questions: [EMPTY_QUESTION()],
  });

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

  const updateQuestion = (index, field, value) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
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
      questions[qIndex] = {
        ...questions[qIndex],
        options: [...questions[qIndex].options, `Option ${questions[qIndex].options.length + 1}`],
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
  };

  const removeQuestion = (index) => {
    if (formData.questions.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter a survey title');
      return;
    }
    if (!formData.pin.trim()) {
      alert('A PIN is required');
      return;
    }
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.prompt.trim()) {
        alert(`Question ${i + 1} needs a prompt`);
        return;
      }
      if ((q.type === 'single' || q.type === 'multi') && q.options.filter((o) => o.trim()).length < 2) {
        alert(`Question ${i + 1} needs at least two options`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const userId = getUserId();
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        creator_id: userId,
        pin: formData.pin.trim(),
        results_visibility: formData.results_visibility,
        questions: formData.questions.map((q) => ({
          prompt: q.prompt.trim(),
          type: q.type,
          options: q.type === 'single' || q.type === 'multi' ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
          allow_other: q.allow_other || false,
        })),
      };
      const created = await api.createSurvey(payload);
      storeVerifiedPin(created.id, formData.pin.trim());
      setSurveys([created, ...surveys]);
      setFormData({
        title: '',
        description: '',
        pin: '',
        results_visibility: 'pin_only',
        questions: [EMPTY_QUESTION()],
      });
      setShowCreateForm(false);
      if (onSurveyCreated) onSurveyCreated(created);
      if (onSurveySelect) onSurveySelect(created.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
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
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Survey'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-campaign-form survey-create-form">
          <h3>Create Survey</h3>
          <form onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Survey Title *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={isSubmitting}
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              disabled={isSubmitting}
            />
            <input
              type="password"
              placeholder="PIN * (for results & admin)"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              required
              disabled={isSubmitting}
            />
            <label className="survey-visibility-label">
              Results visibility
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

            <div className="survey-questions-builder">
              <h4>Questions</h4>
              {formData.questions.map((q, qi) => (
                <div key={qi} className="survey-builder-question">
                  <input
                    type="text"
                    placeholder={`Question ${qi + 1} prompt *`}
                    value={q.prompt}
                    onChange={(e) => updateQuestion(qi, 'prompt', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(qi, 'type', e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="single">Single choice</option>
                    <option value="multi">Multiple choice</option>
                    <option value="rating">Rating 1–5</option>
                    <option value="text">Short text</option>
                  </select>
                  {(q.type === 'single' || q.type === 'multi') && (
                    <>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="survey-option-row">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(qi, oi, e.target.value)}
                            disabled={isSubmitting}
                          />
                          {q.options.length > 2 && (
                            <button type="button" onClick={() => removeOption(qi, oi)} disabled={isSubmitting}>
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(qi)} disabled={isSubmitting}>
                        + Option
                      </button>
                      <label className="survey-allow-other">
                        <input
                          type="checkbox"
                          checked={q.allow_other}
                          onChange={(e) => updateQuestion(qi, 'allow_other', e.target.checked)}
                          disabled={isSubmitting}
                        />
                        Allow &quot;Other&quot; with free text
                      </label>
                    </>
                  )}
                  {formData.questions.length > 1 && (
                    <button type="button" className="survey-remove-q" onClick={() => removeQuestion(qi)} disabled={isSubmitting}>
                      Remove question
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addQuestion} disabled={isSubmitting}>
                + Add question
              </button>
            </div>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Survey'}
            </button>
          </form>
        </div>
      )}

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
