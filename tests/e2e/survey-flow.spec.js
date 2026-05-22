import { test, expect } from '@playwright/test';
import {
  generateUserId,
  createSurvey,
  getSurvey,
  submitSurvey,
  getSurveyResults,
  checkBackendHealth,
} from '../helpers/api.js';
import { BACKEND_BASE_URL } from '../helpers/ports.js';

test.describe('Survey E2E', () => {
  test.beforeEach(async ({ request }) => {
    const ok = await checkBackendHealth(request);
    if (!ok) {
      console.warn(`Backend may not be running on ${BACKEND_BASE_URL}`);
    }
  });

  test('creates survey, submits once, blocks duplicate, PIN results work', async ({ request }) => {
    const creatorId = generateUserId();
    const respondentId = generateUserId();
    const pin = 'survey-pin-123';

    const survey = await createSurvey(request, {
      title: `Survey ${Date.now()}`,
      creatorId,
      pin,
      results_visibility: 'pin_only',
      questions: [
        { prompt: 'Pick one', type: 'single', options: ['A', 'B'] },
        { prompt: 'Rate us', type: 'rating' },
      ],
    });

    expect(survey.id).toBeDefined();
    expect(survey.questions).toHaveLength(2);

    const full = await getSurvey(request, survey.id);
    const qSingle = full.questions.find((q) => q.type === 'single');
    const qRating = full.questions.find((q) => q.type === 'rating');

    const answers = [
      { question_id: qSingle.id, value: 'A' },
      { question_id: qRating.id, value: 4 },
    ];

    const first = await submitSurvey(request, survey.id, respondentId, answers);
    expect(first.ok).toBe(true);

    const duplicate = await submitSurvey(request, survey.id, respondentId, answers);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.status).toBe(409);

    const blocked = await getSurveyResults(request, survey.id, { userId: respondentId });
    expect(blocked.ok).toBe(false);
    expect(blocked.status).toBe(403);

    const withPin = await getSurveyResults(request, survey.id, { surveyPin: pin });
    expect(withPin.ok).toBe(true);
    expect(withPin.data.response_count).toBe(1);
    const singleResult = withPin.data.results.find((r) => r.type === 'single');
    expect(singleResult.counts.A).toBe(1);
    const ratingResult = withPin.data.results.find((r) => r.type === 'rating');
    expect(ratingResult.distribution[4]).toBe(1);
  });

  test('after_submit visibility hides results until submit', async ({ request }) => {
    const creatorId = generateUserId();
    const userA = generateUserId();
    const userB = generateUserId();

    const survey = await createSurvey(request, {
      title: `After submit ${Date.now()}`,
      creatorId,
      pin: 'pin-after',
      results_visibility: 'after_submit',
      questions: [{ prompt: 'Color?', type: 'single', options: ['Red', 'Blue'] }],
    });

    const full = await getSurvey(request, survey.id);
    const q = full.questions[0];

    const hidden = await getSurveyResults(request, survey.id, { userId: userB });
    expect(hidden.ok).toBe(false);

    await submitSurvey(request, survey.id, userA, [{ question_id: q.id, value: 'Red' }]);

    const visible = await getSurveyResults(request, survey.id, { userId: userA });
    expect(visible.ok).toBe(true);
    expect(visible.data.results[0].counts.Red).toBe(1);
  });

  test('public visibility allows results without PIN', async ({ request }) => {
    const creatorId = generateUserId();
    const respondentId = generateUserId();

    const survey = await createSurvey(request, {
      title: `Public ${Date.now()}`,
      creatorId,
      pin: 'pin-public',
      results_visibility: 'public',
      questions: [{ prompt: 'Yes or no?', type: 'single', options: ['Yes', 'No'] }],
    });

    const full = await getSurvey(request, survey.id);
    await submitSurvey(request, survey.id, respondentId, [
      { question_id: full.questions[0].id, value: 'Yes' },
    ]);

    const results = await getSurveyResults(request, survey.id);
    expect(results.ok).toBe(true);
    expect(results.data.results[0].counts.Yes).toBe(1);
  });
});
