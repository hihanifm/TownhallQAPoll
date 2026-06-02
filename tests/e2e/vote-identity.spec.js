/**
 * Vote-identity regression tests.
 *
 * `user_id` (a localStorage UUID) is the sole vote-deduplication key.
 * fingerprint_hash was removed entirely (anonymity-by-design); these tests
 * now assert that two distinct user_ids vote independently — the same
 * invariant the original "same fingerprint, different userId" tests
 * defended.
 */

import { test, expect } from '@playwright/test';
import {
  createCampaign,
  createQuestion,
  upvoteQuestion,
  checkVote,
  createFeedback,
  upvoteFeedback,
  checkFeedbackVote,
  generateUserId,
} from '../helpers/api.js';

test.describe.serial('Vote identity — userId is sole owner', () => {
  let campaignId;
  let questionId;
  const USER_A = generateUserId();
  const USER_B = generateUserId();

  test.beforeAll(async ({ request }) => {
    const campaign = await createCampaign(request, 'Vote Identity Test', null, USER_A, null, 'votepin1');
    campaignId = campaign.id;
    const question = await createQuestion(request, campaignId, 'Does each userId vote independently?', USER_A);
    questionId = question.id;
  });

  test('User A votes — checkVote returns true for A, false for B', async ({ request }) => {
    const voteA = await upvoteQuestion(request, questionId, USER_A);
    expect(voteA.hasVoted).toBe(true);
    expect(voteA.vote_count).toBe(1);

    const checkA = await checkVote(request, questionId, USER_A);
    expect(checkA.hasVoted).toBe(true);

    const checkB = await checkVote(request, questionId, USER_B);
    expect(checkB.hasVoted).toBe(false);
  });

  test('User B can vote independently on the same question', async ({ request }) => {
    const voteB = await upvoteQuestion(request, questionId, USER_B);
    expect(voteB.hasVoted).toBe(true);
    expect(voteB.vote_count).toBe(2);

    const checkA = await checkVote(request, questionId, USER_A);
    const checkB = await checkVote(request, questionId, USER_B);
    expect(checkA.hasVoted).toBe(true);
    expect(checkB.hasVoted).toBe(true);
  });

  test('User A can toggle off their own vote without affecting User B', async ({ request }) => {
    const toggle = await upvoteQuestion(request, questionId, USER_A);
    expect(toggle.hasVoted).toBe(false);
    expect(toggle.vote_count).toBe(1);

    const checkB = await checkVote(request, questionId, USER_B);
    expect(checkB.hasVoted).toBe(true);
  });

  test('Same isolation holds for feedback votes', async ({ request }) => {
    const FB_USER_A = generateUserId();
    const FB_USER_B = generateUserId();

    const feedback = await createFeedback(request, 'Feedback vote identity regression', FB_USER_A);
    const feedbackId = feedback.id;

    const voteA = await upvoteFeedback(request, feedbackId, FB_USER_A);
    expect(voteA.hasVoted).toBe(true);
    expect(voteA.vote_count).toBe(1);

    const checkB = await checkFeedbackVote(request, feedbackId, FB_USER_B);
    expect(checkB.hasVoted).toBe(false);

    const voteB = await upvoteFeedback(request, feedbackId, FB_USER_B);
    expect(voteB.hasVoted).toBe(true);
    expect(voteB.vote_count).toBe(2);
  });
});
