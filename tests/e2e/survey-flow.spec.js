import { test, expect } from '@playwright/test';
import {
  generateUserId,
  createSurvey,
  listSurveys,
  getSurvey,
  submitSurvey,
  getSurveyResults,
  getSurveySubmissionStatus,
  exportSurveyResponses,
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

  test('submission-status reports submitted state but never returns answers (anonymity)', async ({ request }) => {
    const creatorId = generateUserId();
    const userA = generateUserId();
    const userB = generateUserId();

    const survey = await createSurvey(request, {
      title: `Own answers ${Date.now()}`,
      creatorId,
      pin: 'pin-own',
      results_visibility: 'pin_only',
      questions: [{ prompt: 'Color?', type: 'single', options: ['Red', 'Blue'] }],
    });

    const full = await getSurvey(request, survey.id);
    const q = full.questions[0];

    const before = await getSurveySubmissionStatus(request, survey.id, userB);
    expect(before.ok).toBe(true);
    expect(before.data.submitted).toBe(false);
    expect(before.data.answers).toBeUndefined();

    await submitSurvey(request, survey.id, userA, [{ question_id: q.id, value: 'Red' }]);

    const after = await getSurveySubmissionStatus(request, survey.id, userA);
    expect(after.ok).toBe(true);
    expect(after.data.submitted).toBe(true);
    expect(after.data.submitted_at).toBeDefined();
    // Anonymity-by-design: server must NOT echo the user's own answers back,
    // since user_id is not a secret. Client renders from a local cache.
    expect(after.data.answers).toBeUndefined();

    // Peer with another user_id sees no leakage either.
    const peerView = await getSurveySubmissionStatus(request, survey.id, userB);
    expect(peerView.data.submitted).toBe(false);
    expect(peerView.data.answers).toBeUndefined();
  });

  test('participant PIN gates questions and submit; admin PIN does not unlock submit', async ({ request }) => {
    const creatorId = generateUserId();
    const respondentId = generateUserId();
    const adminPin = 'admin-pin-gate';
    const participantPin = 'participant-pin-gate';

    const surveyTitle = `Participant gate ${Date.now()}`;
    const survey = await createSurvey(request, {
      title: surveyTitle,
      creatorId,
      pin: adminPin,
      participant_pin: participantPin,
      results_visibility: 'public',
      questions: [{ prompt: 'Pick', type: 'single', options: ['One', 'Two'] }],
    });

    expect(survey.has_participant_pin).toBe(true);

    const listForStranger = await listSurveys(request);
    const redactedInList = listForStranger.find((s) => s.id === survey.id);
    expect(redactedInList.list_redacted).toBe(true);
    expect(redactedInList.title).toBeNull();
    expect(redactedInList.question_count).toBe(0);
    expect(redactedInList.response_count).toBe(0);

    const listForCreator = await listSurveys(request, { creatorId });
    const creatorView = listForCreator.find((s) => s.id === survey.id);
    expect(creatorView.title).toBe(surveyTitle);
    expect(creatorView.list_redacted).toBeUndefined();

    const gated = await getSurvey(request, survey.id);
    expect(gated.participant_pin_required).toBe(true);
    expect(gated.title).toBeNull();
    expect(gated.questions).toHaveLength(0);

    const withParticipant = await getSurvey(request, survey.id, { participantPin });
    expect(withParticipant.title).toBe(surveyTitle);
    expect(withParticipant.questions).toHaveLength(1);

    const q = withParticipant.questions[0];
    const answers = [{ question_id: q.id, value: 'One' }];

    const noPin = await submitSurvey(request, survey.id, respondentId, answers);
    expect(noPin.ok).toBe(false);
    expect(noPin.status).toBe(403);

    const wrongPin = await submitSurvey(request, survey.id, respondentId, answers, {
      participantPin: 'wrong',
    });
    expect(wrongPin.ok).toBe(false);
    expect(wrongPin.status).toBe(403);

    const adminOnly = await submitSurvey(request, survey.id, respondentId, answers, {
      participantPin: adminPin,
    });
    expect(adminOnly.ok).toBe(false);
    expect(adminOnly.status).toBe(403);

    const ok = await submitSurvey(request, survey.id, respondentId, answers, {
      participantPin,
    });
    expect(ok.ok).toBe(true);
  });

  test('export responses CSV requires admin and includes submission row', async ({ request }) => {
    const creatorId = generateUserId();
    const respondentId = generateUserId();
    const pin = 'export-pin-99';

    const survey = await createSurvey(request, {
      title: `Export ${Date.now()}`,
      creatorId,
      pin,
      results_visibility: 'pin_only',
      questions: [{ prompt: 'Favorite', type: 'single', options: ['X', 'Y'] }],
    });

    const full = await getSurvey(request, survey.id);
    await submitSurvey(request, survey.id, respondentId, [
      { question_id: full.questions[0].id, value: 'X' },
    ]);

    const blocked = await exportSurveyResponses(request, survey.id, { surveyPin: 'wrong' });
    expect(blocked.ok).toBe(false);
    expect(blocked.status).toBe(403);

    const exported = await exportSurveyResponses(request, survey.id, { surveyPin: pin });
    expect(exported.ok).toBe(true);
    expect(exported.csv).toContain('submitted_at');
    expect(exported.csv).toContain('Favorite');
    expect(exported.csv).toContain('X');
    expect(exported.csv).not.toContain(respondentId);
  });
});
