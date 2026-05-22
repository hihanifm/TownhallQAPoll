const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery, formatDatetime } = require('../db/database');
const sseService = require('../services/sseService');

const VALID_QUESTION_TYPES = ['single', 'multi', 'rating', 'text'];
const VALID_VISIBILITY = ['pin_only', 'after_submit', 'public'];

const SURVEY_PUBLIC_SELECT = `id, title, description, created_at, status, creator_id, results_visibility,
  CASE WHEN pin IS NOT NULL AND pin != '' THEN 1 ELSE 0 END as has_pin,
  CASE WHEN participant_pin IS NOT NULL AND participant_pin != '' THEN 1 ELSE 0 END as has_participant_pin`;

function hasParticipantPin(survey) {
  if (!survey) return false;
  if (survey.has_participant_pin === 1 || survey.has_participant_pin === true) return true;
  return survey.participant_pin != null && String(survey.participant_pin).trim() !== '';
}

function formatSurveyRow(row) {
  if (!row) return null;
  const { pin, participant_pin, ...safe } = row;
  return {
    ...safe,
    created_at: formatDatetime(row.created_at),
    has_pin: row.has_pin === 1 || row.has_pin === true,
    has_participant_pin: hasParticipantPin(row),
    question_count: row.question_count != null ? Number(row.question_count) : undefined,
    response_count: row.response_count != null ? Number(row.response_count) : undefined,
  };
}

async function canAccessSurveyContent(survey, { participant_pin, survey_pin, creator_id }) {
  if (!hasParticipantPin(survey)) return true;
  if (survey.creator_id && creator_id && survey.creator_id === creator_id) return true;
  if (participant_pin && survey.participant_pin === participant_pin) return true;
  const auth = await isAuthorized(survey.id, creator_id || null, survey_pin || null);
  return auth.authorized;
}

function canSubmitSurvey(survey, { participant_pin, creator_id }) {
  if (!hasParticipantPin(survey)) return true;
  if (survey.creator_id && creator_id && survey.creator_id === creator_id) return true;
  return !!(participant_pin && survey.participant_pin === participant_pin);
}

function normalizeParticipantPin(value) {
  if (value == null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function isSurveyCreator(survey, creator_id) {
  return !!(survey.creator_id && creator_id && survey.creator_id === creator_id);
}

function redactConfidentialSurvey(row, { creator_id } = {}) {
  if (!hasParticipantPin(row)) return row;
  if (isSurveyCreator(row, creator_id)) return row;
  return {
    ...row,
    title: null,
    description: null,
    question_count: 0,
    response_count: 0,
    list_redacted: true,
  };
}

function parseQuestionOptions(options) {
  if (options == null) return null;
  if (typeof options === 'string') {
    try {
      return JSON.parse(options);
    } catch {
      return null;
    }
  }
  return options;
}

function formatQuestionRow(q) {
  return {
    id: q.id,
    survey_id: q.survey_id,
    prompt: q.prompt,
    type: q.type,
    options: parseQuestionOptions(q.options_json),
    sort_order: q.sort_order,
  };
}

async function getSurveyQuestions(surveyId) {
  const rows = await allQuery(
    'SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order ASC, id ASC',
    [surveyId]
  );
  return rows.map(formatQuestionRow);
}

async function isAuthorized(surveyId, creatorId, surveyPin) {
  const survey = await getQuery('SELECT * FROM surveys WHERE id = ?', [surveyId]);
  if (!survey) {
    return { authorized: false, error: 'Survey not found' };
  }
  if (survey.creator_id && creatorId && survey.creator_id === creatorId) {
    return { authorized: true, survey };
  }
  if (surveyPin && survey.pin && survey.pin === surveyPin) {
    return { authorized: true, survey };
  }
  return { authorized: false, error: 'Not authorized', survey };
}

async function canViewResults(survey, { user_id, survey_pin, creator_id }) {
  const visibility = survey.results_visibility || 'pin_only';
  if (visibility === 'public') {
    return true;
  }
  const auth = await isAuthorized(survey.id, creator_id || null, survey_pin || null);
  if (auth.authorized) {
    return true;
  }
  if (visibility === 'after_submit' && user_id) {
    const submission = await getQuery(
      'SELECT id FROM survey_submissions WHERE survey_id = ? AND user_id = ?',
      [survey.id, user_id]
    );
    return !!submission;
  }
  if (visibility === 'pin_only') {
    return false;
  }
  return false;
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'At least one question is required';
  }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.prompt || !String(q.prompt).trim()) {
      return `Question ${i + 1}: prompt is required`;
    }
    if (!VALID_QUESTION_TYPES.includes(q.type)) {
      return `Question ${i + 1}: invalid type`;
    }
    if ((q.type === 'single' || q.type === 'multi') && (!q.options || !Array.isArray(q.options) || q.options.length < 2)) {
      return `Question ${i + 1}: at least two options required for ${q.type}`;
    }
  }
  return null;
}

function serializeOptions(q) {
  if (q.type === 'single' || q.type === 'multi') {
    const payload = { options: q.options.map((o) => String(o).trim()).filter(Boolean) };
    if (q.allow_other) payload.allow_other = true;
    return JSON.stringify(payload);
  }
  return null;
}

async function insertQuestions(surveyId, questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await runQuery(
      'INSERT INTO survey_questions (survey_id, prompt, type, options_json, sort_order) VALUES (?, ?, ?, ?, ?)',
      [surveyId, q.prompt.trim(), q.type, serializeOptions(q), i]
    );
  }
}

async function buildResults(surveyId) {
  const questions = await getSurveyQuestions(surveyId);
  const results = [];

  for (const question of questions) {
    const answers = await allQuery(
      `SELECT sa.value_json FROM survey_answers sa
       INNER JOIN survey_submissions ss ON sa.submission_id = ss.id
       WHERE sa.question_id = ? AND ss.survey_id = ?`,
      [question.id, surveyId]
    );

    const parsed = answers.map((a) => {
      try {
        return JSON.parse(a.value_json);
      } catch {
        return a.value_json;
      }
    });

    if (question.type === 'single') {
      const options = question.options?.options || question.options || [];
      const counts = {};
      options.forEach((opt) => { counts[opt] = 0; });
      counts['Other'] = 0;
      let total = 0;
      parsed.forEach((val) => {
        if (val && typeof val === 'object' && val.other != null) {
          counts['Other'] = (counts['Other'] || 0) + 1;
          total++;
        } else if (typeof val === 'string' && counts[val] !== undefined) {
          counts[val]++;
          total++;
        } else if (typeof val === 'string') {
          counts['Other'] = (counts['Other'] || 0) + 1;
          total++;
        }
      });
      results.push({ question_id: question.id, prompt: question.prompt, type: question.type, counts, total });
    } else if (question.type === 'multi') {
      const options = question.options?.options || question.options || [];
      const counts = {};
      options.forEach((opt) => { counts[opt] = 0; });
      counts['Other'] = 0;
      let totalResponses = 0;
      parsed.forEach((val) => {
        totalResponses++;
        const selected = Array.isArray(val?.selected) ? val.selected : (Array.isArray(val) ? val : []);
        selected.forEach((s) => {
          if (counts[s] !== undefined) counts[s]++;
          else counts['Other'] = (counts['Other'] || 0) + 1;
        });
        if (val?.other) {
          counts['Other'] = (counts['Other'] || 0) + 1;
        }
      });
      results.push({ question_id: question.id, prompt: question.prompt, type: question.type, counts, total_responses: totalResponses });
    } else if (question.type === 'rating') {
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      let count = 0;
      parsed.forEach((val) => {
        const n = Number(val);
        if (n >= 1 && n <= 5) {
          distribution[n]++;
          sum += n;
          count++;
        }
      });
      results.push({
        question_id: question.id,
        prompt: question.prompt,
        type: question.type,
        distribution,
        average: count > 0 ? Math.round((sum / count) * 100) / 100 : null,
        total: count,
      });
    } else if (question.type === 'text') {
      const texts = parsed
        .map((val) => (typeof val === 'string' ? val : String(val ?? '')).trim())
        .filter((t) => t.length > 0);
      results.push({ question_id: question.id, prompt: question.prompt, type: question.type, answers: texts, total: texts.length });
    }
  }

  return results;
}

function csvCell(value) {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatAnswerForExport(rawValue, type) {
  let val = rawValue;
  if (typeof rawValue === 'string') {
    try {
      val = JSON.parse(rawValue);
    } catch {
      val = rawValue;
    }
  }
  if (type === 'text') {
    return typeof val === 'string' ? val : String(val ?? '');
  }
  if (type === 'rating') {
    return val != null ? String(val) : '';
  }
  if (type === 'single') {
    if (val && typeof val === 'object' && val.other != null) {
      return `Other: ${val.other}`;
    }
    return typeof val === 'string' ? val : '';
  }
  if (type === 'multi') {
    const selected = Array.isArray(val?.selected) ? val.selected : (Array.isArray(val) ? val : []);
    const parts = [...selected];
    if (val?.other) {
      parts.push(`Other: ${val.other}`);
    }
    return parts.join('; ');
  }
  return '';
}

async function buildResponsesCsv(surveyId) {
  const questions = await getSurveyQuestions(surveyId);
  const submissions = await allQuery(
    'SELECT id, submitted_at FROM survey_submissions WHERE survey_id = ? ORDER BY submitted_at ASC, id ASC',
    [surveyId]
  );

  const headers = ['submitted_at', ...questions.map((q) => q.prompt)];
  const lines = [headers.map(csvCell).join(',')];

  for (const sub of submissions) {
    const answerRows = await allQuery(
      'SELECT question_id, value_json FROM survey_answers WHERE submission_id = ?',
      [sub.id]
    );
    const byQuestion = Object.fromEntries(answerRows.map((a) => [a.question_id, a.value_json]));
    const row = [formatDatetime(sub.submitted_at)];
    for (const q of questions) {
      row.push(formatAnswerForExport(byQuestion[q.id], q.type));
    }
    lines.push(row.map(csvCell).join(','));
  }

  return lines.join('\n');
}

// GET /api/surveys
router.get('/', async (req, res, next) => {
  try {
    const { creator_id } = req.query;
    const surveys = await allQuery(
      `SELECT s.id, s.title, s.description, s.created_at, s.status, s.creator_id, s.results_visibility,
       COUNT(DISTINCT sq.id) as question_count,
       COUNT(DISTINCT ss.id) as response_count,
       CASE WHEN s.pin IS NOT NULL AND s.pin != '' THEN 1 ELSE 0 END as has_pin,
       CASE WHEN s.participant_pin IS NOT NULL AND s.participant_pin != '' THEN 1 ELSE 0 END as has_participant_pin
       FROM surveys s
       LEFT JOIN survey_questions sq ON s.id = sq.survey_id
       LEFT JOIN survey_submissions ss ON s.id = ss.survey_id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );
    res.json(
      surveys
        .map(formatSurveyRow)
        .map((row) => redactConfidentialSurvey(row, { creator_id: creator_id || null }))
    );
  } catch (error) {
    next(error);
  }
});

// POST /api/surveys
router.post('/', async (req, res, next) => {
  try {
    const { title, description, creator_id, pin, participant_pin, results_visibility, questions } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!creator_id) {
      return res.status(400).json({ error: 'creator_id is required' });
    }
    if (!pin || !String(pin).trim()) {
      return res.status(400).json({ error: 'A PIN is required to create a survey' });
    }
    const adminPin = pin.trim();
    const participantPin = normalizeParticipantPin(participant_pin);
    if (participantPin && participantPin === adminPin) {
      return res.status(400).json({ error: 'Participant PIN must differ from admin PIN' });
    }
    const visibility = results_visibility || 'pin_only';
    if (!VALID_VISIBILITY.includes(visibility)) {
      return res.status(400).json({ error: 'Invalid results_visibility' });
    }
    const qErr = validateQuestions(questions);
    if (qErr) {
      return res.status(400).json({ error: qErr });
    }

    const result = await runQuery(
      'INSERT INTO surveys (title, description, status, creator_id, pin, participant_pin, results_visibility) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title.trim(), description || null, 'active', creator_id, adminPin, participantPin, visibility]
    );
    const surveyId = result.lastID;
    await insertQuestions(surveyId, questions);

    const survey = await getQuery(
      `SELECT ${SURVEY_PUBLIC_SELECT} FROM surveys WHERE id = ?`,
      [surveyId]
    );
    const formatted = formatSurveyRow(survey);
    const surveyQuestions = await getSurveyQuestions(surveyId);

    sseService.broadcast('all', {
      type: 'survey_created',
      survey: { ...formatted, questions: surveyQuestions },
    });

    res.status(201).json({ ...formatted, questions: surveyQuestions });
  } catch (error) {
    next(error);
  }
});

// GET /api/surveys/:id/submission-status — before /:id
router.get('/:id/submission-status', async (req, res, next) => {
  try {
    const { user_id, participant_pin, survey_pin, creator_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const surveyId = req.params.id;
    const survey = await getQuery('SELECT * FROM surveys WHERE id = ?', [surveyId]);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    const canAccess = await canAccessSurveyContent(survey, {
      participant_pin: participant_pin || null,
      survey_pin: survey_pin || null,
      creator_id: creator_id || null,
    });
    if (hasParticipantPin(survey) && !canAccess) {
      return res.json({ submitted: false });
    }
    const submission = await getQuery(
      'SELECT id, submitted_at FROM survey_submissions WHERE survey_id = ? AND user_id = ?',
      [surveyId, user_id]
    );
    if (!submission) {
      return res.json({ submitted: false });
    }
    const questions = await getSurveyQuestions(surveyId);
    const answerRows = await allQuery(
      'SELECT question_id, value_json FROM survey_answers WHERE submission_id = ?',
      [submission.id]
    );
    const byQuestion = Object.fromEntries(answerRows.map((a) => [a.question_id, a.value_json]));
    const answers = questions.map((q) => ({
      question_id: q.id,
      prompt: q.prompt,
      type: q.type,
      display: formatAnswerForExport(byQuestion[q.id], q.type),
    }));
    res.json({
      submitted: true,
      submitted_at: formatDatetime(submission.submitted_at),
      answers,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/surveys/:id/export — admin only; anonymized rows (no user_id)
router.get('/:id/export', async (req, res, next) => {
  try {
    const survey = await getQuery('SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const { survey_pin, creator_id } = req.query;
    const auth = await isAuthorized(survey.id, creator_id || null, survey_pin || null);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Not authorized to export responses' });
    }

    const csv = await buildResponsesCsv(survey.id);
    const safeTitle = String(survey.title || 'survey')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'survey';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-responses.csv"`);
    res.send(`\uFEFF${csv}`);
  } catch (error) {
    next(error);
  }
});

// GET /api/surveys/:id/results — before generic :id if needed; registered as separate route
router.get('/:id/results', async (req, res, next) => {
  try {
    const survey = await getQuery('SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const { user_id, survey_pin, creator_id } = req.query;
    const allowed = await canViewResults(survey, {
      user_id: user_id || null,
      survey_pin: survey_pin || null,
      creator_id: creator_id || null,
    });
    if (!allowed) {
      return res.status(403).json({ error: 'Results are not available' });
    }

    const responseCount = await getQuery(
      'SELECT COUNT(*) as count FROM survey_submissions WHERE survey_id = ?',
      [survey.id]
    );
    const results = await buildResults(survey.id);
    res.json({
      survey_id: survey.id,
      response_count: responseCount.count,
      results,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/surveys/:id/verify-pin
router.post('/:id/verify-pin', async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }
    const survey = await getQuery('SELECT id, pin FROM surveys WHERE id = ?', [req.params.id]);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    if (survey.pin !== pin) {
      return res.status(403).json({ error: 'Invalid PIN' });
    }
    res.json({ success: true, message: 'PIN verified successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/surveys/:id/verify-participant-pin
router.post('/:id/verify-participant-pin', async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }
    const survey = await getQuery('SELECT id, participant_pin FROM surveys WHERE id = ?', [req.params.id]);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    if (!hasParticipantPin(survey)) {
      return res.status(400).json({ error: 'This survey does not require a participant PIN' });
    }
    if (survey.participant_pin !== pin) {
      return res.status(403).json({ error: 'Invalid participant PIN' });
    }
    res.json({ success: true, message: 'Participant PIN verified successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/surveys/:id/submit
router.post('/:id/submit', async (req, res, next) => {
  try {
    const { user_id, fingerprint_hash, answers, participant_pin, creator_id } = req.body;
    const surveyId = req.params.id;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'answers array is required' });
    }

    const survey = await getQuery('SELECT * FROM surveys WHERE id = ?', [surveyId]);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    if (survey.status === 'closed') {
      return res.status(403).json({ error: 'Survey is closed' });
    }

    if (!canSubmitSurvey(survey, { participant_pin: participant_pin || null, creator_id: creator_id || null })) {
      return res.status(403).json({ error: 'Valid participant PIN is required to submit this survey' });
    }

    const existing = await getQuery(
      'SELECT id FROM survey_submissions WHERE survey_id = ? AND user_id = ?',
      [surveyId, user_id]
    );
    if (existing) {
      return res.status(409).json({ error: 'You have already submitted this survey' });
    }

    const questions = await allQuery(
      'SELECT * FROM survey_questions WHERE survey_id = ?',
      [surveyId]
    );
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const answerMap = new Map(answers.map((a) => [Number(a.question_id), a.value]));

    for (const q of questions) {
      if (!answerMap.has(q.id)) {
        return res.status(400).json({ error: `Missing answer for question: ${q.prompt}` });
      }
      const value = answerMap.get(q.id);
      const err = validateAnswerValue(q, value);
      if (err) {
        return res.status(400).json({ error: err });
      }
    }

    const subResult = await runQuery(
      'INSERT INTO survey_submissions (survey_id, user_id, fingerprint_hash) VALUES (?, ?, ?)',
      [surveyId, user_id, fingerprint_hash || null]
    );
    const submissionId = subResult.lastID;

    for (const q of questions) {
      const value = answerMap.get(q.id);
      await runQuery(
        'INSERT INTO survey_answers (submission_id, question_id, value_json) VALUES (?, ?, ?)',
        [submissionId, q.id, JSON.stringify(normalizeAnswerValue(q, value))]
      );
    }

    const responseCount = await getQuery(
      'SELECT COUNT(*) as count FROM survey_submissions WHERE survey_id = ?',
      [surveyId]
    );

    sseService.broadcast(surveyId.toString(), {
      type: 'survey_response_submitted',
      survey_id: parseInt(surveyId, 10),
      response_count: responseCount.count,
    });

    res.status(201).json({ success: true, submitted: true, response_count: responseCount.count });
  } catch (error) {
    next(error);
  }
});

function validateAnswerValue(question, value) {
  if (value === undefined || value === null) {
    return `Answer required for: ${question.prompt}`;
  }
  const opts = parseQuestionOptions(question.options_json);
  if (question.type === 'single') {
    if (typeof value === 'object' && value.other != null) {
      if (!opts?.allow_other) return 'Other text not allowed for this question';
      if (!String(value.other).trim()) return 'Other text is required';
      return null;
    }
    const options = opts?.options || opts || [];
    if (!options.includes(value)) {
      return `Invalid option for: ${question.prompt}`;
    }
    return null;
  }
  if (question.type === 'multi') {
    const selected = value?.selected ?? value;
    if (!Array.isArray(selected) || selected.length === 0) {
      return `Select at least one option for: ${question.prompt}`;
    }
    const options = opts?.options || opts || [];
    for (const s of selected) {
      if (!options.includes(s)) {
        return `Invalid option for: ${question.prompt}`;
      }
    }
    if (value?.other != null && opts?.allow_other && !String(value.other).trim()) {
      return 'Other text is required when Other is selected';
    }
    return null;
  }
  if (question.type === 'rating') {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return `Rating must be 1-5 for: ${question.prompt}`;
    }
    return null;
  }
  if (question.type === 'text') {
    if (!String(value).trim()) {
      return `Text answer required for: ${question.prompt}`;
    }
    return null;
  }
  return null;
}

function normalizeAnswerValue(question, value) {
  if (question.type === 'single' && typeof value === 'object' && value.other != null) {
    return { other: String(value.other).trim() };
  }
  if (question.type === 'multi') {
    const selected = value?.selected ?? value;
    const out = { selected: Array.isArray(selected) ? selected : [] };
    if (value?.other != null) out.other = String(value.other).trim();
    return out;
  }
  if (question.type === 'text') {
    return String(value).trim();
  }
  return value;
}

// GET /api/surveys/:id
router.get('/:id', async (req, res, next) => {
  try {
    const survey = await getQuery('SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    const { participant_pin, survey_pin, creator_id } = req.query;
    const canAccess = await canAccessSurveyContent(survey, {
      participant_pin: participant_pin || null,
      survey_pin: survey_pin || null,
      creator_id: creator_id || null,
    });
    const questions = canAccess ? await getSurveyQuestions(req.params.id) : [];
    const responseCount = await getQuery(
      'SELECT COUNT(*) as count FROM survey_submissions WHERE survey_id = ?',
      [req.params.id]
    );
    let payload = {
      ...formatSurveyRow(survey),
      questions,
      response_count: responseCount.count,
    };
    if (hasParticipantPin(survey) && !canAccess) {
      payload.participant_pin_required = true;
      payload = redactConfidentialSurvey(payload, { creator_id: creator_id || null });
      payload.questions = [];
      payload.response_count = 0;
    }
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/surveys/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { creator_id, survey_pin, title, description, status, results_visibility, participant_pin, questions } = req.body;
    const auth = await isAuthorized(req.params.id, creator_id || null, survey_pin || null);
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.error || 'Not authorized' });
    }

    if (participant_pin !== undefined) {
      const nextParticipantPin = normalizeParticipantPin(participant_pin);
      if (nextParticipantPin && nextParticipantPin === auth.survey.pin) {
        return res.status(400).json({ error: 'Participant PIN must differ from admin PIN' });
      }
      await runQuery('UPDATE surveys SET participant_pin = ? WHERE id = ?', [nextParticipantPin, req.params.id]);
    }

    if (title !== undefined) {
      await runQuery('UPDATE surveys SET title = ? WHERE id = ?', [title.trim(), req.params.id]);
    }
    if (description !== undefined) {
      await runQuery('UPDATE surveys SET description = ? WHERE id = ?', [description, req.params.id]);
    }
    if (status !== undefined) {
      await runQuery('UPDATE surveys SET status = ? WHERE id = ?', [status, req.params.id]);
    }
    if (results_visibility !== undefined) {
      if (!VALID_VISIBILITY.includes(results_visibility)) {
        return res.status(400).json({ error: 'Invalid results_visibility' });
      }
      await runQuery('UPDATE surveys SET results_visibility = ? WHERE id = ?', [results_visibility, req.params.id]);
    }
    if (questions !== undefined) {
      const qErr = validateQuestions(questions);
      if (qErr) {
        return res.status(400).json({ error: qErr });
      }
      const submissionCount = await getQuery(
        'SELECT COUNT(*) as count FROM survey_submissions WHERE survey_id = ?',
        [req.params.id]
      );
      if (submissionCount.count > 0) {
        return res.status(403).json({ error: 'Cannot change questions after responses exist' });
      }
      await runQuery('DELETE FROM survey_questions WHERE survey_id = ?', [req.params.id]);
      await insertQuestions(req.params.id, questions);
    }

    const survey = await getQuery(
      `SELECT ${SURVEY_PUBLIC_SELECT} FROM surveys WHERE id = ?`,
      [req.params.id]
    );
    const formatted = formatSurveyRow(survey);
    const surveyQuestions = await getSurveyQuestions(req.params.id);

    sseService.broadcast('all', {
      type: 'survey_updated',
      survey: { ...formatted, questions: surveyQuestions },
    });

    res.json({ ...formatted, questions: surveyQuestions });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/surveys/:id/close
router.patch('/:id/close', async (req, res, next) => {
  try {
    const { creator_id, survey_pin } = req.body;
    const auth = await isAuthorized(req.params.id, creator_id || null, survey_pin || null);
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.error || 'Not authorized' });
    }
    await runQuery('UPDATE surveys SET status = ? WHERE id = ?', ['closed', req.params.id]);
    const survey = await getQuery(
      `SELECT ${SURVEY_PUBLIC_SELECT} FROM surveys WHERE id = ?`,
      [req.params.id]
    );
    const formatted = formatSurveyRow(survey);
    const surveyQuestions = await getSurveyQuestions(req.params.id);
    sseService.broadcast('all', {
      type: 'survey_updated',
      survey: { ...formatted, questions: surveyQuestions },
    });
    res.json({ ...formatted, questions: surveyQuestions });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/surveys/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { creator_id, survey_pin } = req.body;
    const auth = await isAuthorized(req.params.id, creator_id || null, survey_pin || null);
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.error || 'Not authorized' });
    }
    await runQuery('DELETE FROM survey_answers WHERE submission_id IN (SELECT id FROM survey_submissions WHERE survey_id = ?)', [req.params.id]);
    await runQuery('DELETE FROM survey_submissions WHERE survey_id = ?', [req.params.id]);
    await runQuery('DELETE FROM survey_questions WHERE survey_id = ?', [req.params.id]);
    await runQuery('DELETE FROM surveys WHERE id = ?', [req.params.id]);

    sseService.broadcast('all', {
      type: 'survey_deleted',
      survey_id: parseInt(req.params.id, 10),
    });

    res.json({ success: true, message: 'Survey deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
