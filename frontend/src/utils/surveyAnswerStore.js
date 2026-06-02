/**
 * Local cache of the current user's own survey submission.
 *
 * Anonymity-by-design: the server does NOT return a user's prior answers
 * to anyone who simply possesses a user_id (a localStorage UUID is not a
 * secret). To still show the user their own submission after refresh,
 * we cache it client-side keyed by surveyId.
 *
 * Stored shape (array of):
 *   { question_id, prompt, type, display }
 *
 * `display` is the same human-readable string the export uses
 * (e.g. "A; B; Other: foo" for multi, "Other: bar" for single).
 */

const storageKey = (surveyId) => `townhall_survey_${surveyId}_answers`;

function formatAnswerDisplay(question, value) {
  if (value == null) return '';
  if (question.type === 'text') return String(value);
  if (question.type === 'rating') return String(value);
  if (question.type === 'single') {
    if (typeof value === 'object' && value.other != null) {
      return `Other: ${value.other}`;
    }
    return typeof value === 'string' ? value : '';
  }
  if (question.type === 'multi') {
    const selected = Array.isArray(value?.selected)
      ? value.selected
      : Array.isArray(value)
        ? value
        : [];
    const parts = [...selected];
    if (value?.other) parts.push(`Other: ${value.other}`);
    return parts.join('; ');
  }
  return '';
}

export function storeSubmittedAnswers(surveyId, questions, answersArray) {
  if (!surveyId || !Array.isArray(questions) || !Array.isArray(answersArray)) return;
  const byQid = new Map(answersArray.map((a) => [Number(a.question_id), a.value]));
  const cached = questions.map((q) => ({
    question_id: q.id,
    prompt: q.prompt,
    type: q.type,
    display: formatAnswerDisplay(q, byQid.get(q.id)),
  }));
  try {
    localStorage.setItem(storageKey(surveyId), JSON.stringify(cached));
  } catch (e) {
    // localStorage may fail (quota, private mode); UX degrades gracefully.
  }
}

export function getSubmittedAnswers(surveyId) {
  if (!surveyId) return null;
  try {
    const raw = localStorage.getItem(storageKey(surveyId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSubmittedAnswers(surveyId) {
  if (!surveyId) return;
  try {
    localStorage.removeItem(storageKey(surveyId));
  } catch {}
}
