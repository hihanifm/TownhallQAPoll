/**
 * Regression tests for vote identity bug:
 * Two users with the same browser fingerprint but different userIds
 * must have independent vote state.
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

const SHARED_FINGERPRINT = 'shared-fingerprint-regression-test';

test.describe.serial('Vote identity — userId is sole owner', () => {
  let campaignId;
  let questionId;
  const USER_A = generateUserId();
  const USER_B = generateUserId();

  test.beforeAll(async ({ request }) => {
    const campaign = await createCampaign(request, 'Vote Identity Test', null, USER_A);
    campaignId = campaign.id;
    const question = await createQuestion(request, campaignId, 'Does each userId vote independently?', USER_A);
    questionId = question.id;
    console.log(`✓ Setup: campaign ${campaignId}, question ${questionId}`);
  });

  test('User A votes — checkVote returns true for A, false for B (same fingerprint)', async ({ request }) => {
    // User A votes with shared fingerprint
    const voteA = await upvoteQuestion(request, questionId, USER_A, SHARED_FINGERPRINT);
    expect(voteA.hasVoted).toBe(true);
    expect(voteA.vote_count).toBe(1);
    console.log(`✓ User A voted — count: ${voteA.vote_count}`);

    // User A's check should show voted
    const checkA = await checkVote(request, questionId, USER_A, SHARED_FINGERPRINT);
    expect(checkA.hasVoted).toBe(true);
    console.log(`✓ checkVote User A: ${checkA.hasVoted} (expected true)`);

    // User B (different userId, same fingerprint) — BUG WAS: returned true, should be false
    const checkB = await checkVote(request, questionId, USER_B, SHARED_FINGERPRINT);
    expect(checkB.hasVoted).toBe(false);
    console.log(`✓ checkVote User B (same fingerprint): ${checkB.hasVoted} (expected false — was the bug)`);
  });

  test('User B can vote independently on the same question', async ({ request }) => {
    const voteB = await upvoteQuestion(request, questionId, USER_B, SHARED_FINGERPRINT);
    expect(voteB.hasVoted).toBe(true);
    expect(voteB.vote_count).toBe(2);
    console.log(`✓ User B voted — count: ${voteB.vote_count}`);

    const checkA = await checkVote(request, questionId, USER_A, SHARED_FINGERPRINT);
    const checkB = await checkVote(request, questionId, USER_B, SHARED_FINGERPRINT);
    expect(checkA.hasVoted).toBe(true);
    expect(checkB.hasVoted).toBe(true);
    console.log(`✓ Both users voted — A: ${checkA.hasVoted}, B: ${checkB.hasVoted}`);
  });

  test('User A can toggle off their own vote without affecting User B', async ({ request }) => {
    const toggle = await upvoteQuestion(request, questionId, USER_A, SHARED_FINGERPRINT);
    expect(toggle.hasVoted).toBe(false);
    expect(toggle.vote_count).toBe(1);
    console.log(`✓ User A toggled off — count: ${toggle.vote_count}`);

    const checkB = await checkVote(request, questionId, USER_B, SHARED_FINGERPRINT);
    expect(checkB.hasVoted).toBe(true);
    console.log(`✓ User B unaffected: ${checkB.hasVoted}`);
  });

  test('Same isolation holds for feedback votes', async ({ request }) => {
    const FB_USER_A = generateUserId();
    const FB_USER_B = generateUserId();

    const feedback = await createFeedback(request, 'Feedback vote identity regression', FB_USER_A);
    const feedbackId = feedback.id;
    console.log(`✓ Created feedback ${feedbackId}`);

    // A votes
    const voteA = await upvoteFeedback(request, feedbackId, FB_USER_A, SHARED_FINGERPRINT);
    expect(voteA.hasVoted).toBe(true);
    expect(voteA.vote_count).toBe(1);

    // B (same fingerprint) not shown as voted
    const checkB = await checkFeedbackVote(request, feedbackId, FB_USER_B, SHARED_FINGERPRINT);
    expect(checkB.hasVoted).toBe(false);
    console.log(`✓ Feedback: User B not shown as voted: ${checkB.hasVoted}`);

    // B can vote independently
    const voteB = await upvoteFeedback(request, feedbackId, FB_USER_B, SHARED_FINGERPRINT);
    expect(voteB.hasVoted).toBe(true);
    expect(voteB.vote_count).toBe(2);
    console.log(`✓ Feedback: User B voted — count: ${voteB.vote_count}`);
  });
});
