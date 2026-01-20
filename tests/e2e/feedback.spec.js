import { test, expect } from '@playwright/test';
import { 
  generateUserId, 
  createFeedback, 
  getFeedback,
  upvoteFeedback,
  checkBackendHealth
} from '../helpers/api.js';

test.describe('Feedback E2E Test', () => {
  let request;
  let testUserId1;
  let testUserId2;
  let feedback1Id;
  let feedback2Id;
  let feedback3Id;

  test.beforeEach(async ({ request: requestContext }) => {
    request = requestContext;
    testUserId1 = generateUserId();
    testUserId2 = generateUserId();
    
    // Optional: Check if backend is running
    const isBackendRunning = await checkBackendHealth(request);
    if (!isBackendRunning) {
      console.warn('⚠️  Backend may not be running on http://localhost:33001');
      console.warn('   Make sure to start the backend before running tests');
    }
  });

  test('should create feedback, upvote feedback, and verify sorting by vote count', async () => {
    // Step 1: Create first feedback
    const feedback1Text = 'The app needs dark mode support';
    const feedback1 = await createFeedback(request, feedback1Text, testUserId1);
    
    expect(feedback1).toBeDefined();
    expect(feedback1.id).toBeDefined();
    expect(feedback1.feedback_text).toBe(feedback1Text);
    expect(feedback1.vote_count).toBe(0);
    expect(feedback1.creator_id).toBe(testUserId1);
    
    feedback1Id = feedback1.id;
    console.log(`✓ Created feedback 1 with ID: ${feedback1Id}`);

    // Step 2: Create second feedback
    const feedback2Text = 'Please add keyboard shortcuts';
    const feedback2 = await createFeedback(request, feedback2Text, testUserId1);
    
    expect(feedback2).toBeDefined();
    expect(feedback2.id).toBeDefined();
    expect(feedback2.feedback_text).toBe(feedback2Text);
    expect(feedback2.vote_count).toBe(0);
    expect(feedback2.creator_id).toBe(testUserId1);
    
    feedback2Id = feedback2.id;
    console.log(`✓ Created feedback 2 with ID: ${feedback2Id}`);

    // Step 3: Create third feedback
    const feedback3Text = 'Add export functionality for campaigns';
    const feedback3 = await createFeedback(request, feedback3Text, testUserId1);
    
    expect(feedback3).toBeDefined();
    expect(feedback3.id).toBeDefined();
    expect(feedback3.feedback_text).toBe(feedback3Text);
    expect(feedback3.vote_count).toBe(0);
    expect(feedback3.creator_id).toBe(testUserId1);
    
    feedback3Id = feedback3.id;
    console.log(`✓ Created feedback 3 with ID: ${feedback3Id}`);

    // Step 4: Verify all feedback can be retrieved
    const allFeedback = await getFeedback(request);
    
    expect(allFeedback).toBeDefined();
    expect(Array.isArray(allFeedback)).toBe(true);
    expect(allFeedback.length).toBeGreaterThanOrEqual(3);
    
    const retrievedFeedback1 = allFeedback.find(f => f.id === feedback1Id);
    const retrievedFeedback2 = allFeedback.find(f => f.id === feedback2Id);
    const retrievedFeedback3 = allFeedback.find(f => f.id === feedback3Id);
    
    expect(retrievedFeedback1).toBeDefined();
    expect(retrievedFeedback2).toBeDefined();
    expect(retrievedFeedback3).toBeDefined();
    
    console.log(`✓ Retrieved all feedback - total count: ${allFeedback.length}`);

    // Step 5: User 1 upvotes feedback 1
    const upvote1Result = await upvoteFeedback(request, feedback1Id, testUserId1);
    
    expect(upvote1Result).toBeDefined();
    expect(upvote1Result.success).toBe(true);
    expect(upvote1Result.vote_count).toBe(1);
    expect(upvote1Result.hasVoted).toBe(true);
    
    console.log(`✓ User 1 upvoted feedback 1 - vote count: ${upvote1Result.vote_count}`);

    // Step 6: User 2 upvotes feedback 1
    const upvote1Result2 = await upvoteFeedback(request, feedback1Id, testUserId2);
    
    expect(upvote1Result2).toBeDefined();
    expect(upvote1Result2.success).toBe(true);
    expect(upvote1Result2.vote_count).toBe(2);
    expect(upvote1Result2.hasVoted).toBe(true);
    
    console.log(`✓ User 2 upvoted feedback 1 - vote count: ${upvote1Result2.vote_count}`);

    // Step 7: User 1 upvotes feedback 2
    const upvote2Result = await upvoteFeedback(request, feedback2Id, testUserId1);
    
    expect(upvote2Result).toBeDefined();
    expect(upvote2Result.success).toBe(true);
    expect(upvote2Result.vote_count).toBe(1);
    expect(upvote2Result.hasVoted).toBe(true);
    
    console.log(`✓ User 1 upvoted feedback 2 - vote count: ${upvote2Result.vote_count}`);

    // Step 8: Verify feedback is sorted by vote count (descending), then by creation date (ascending)
    const sortedFeedback = await getFeedback(request);
    
    // Find the feedback items in the sorted list
    const sortedFeedback1 = sortedFeedback.find(f => f.id === feedback1Id);
    const sortedFeedback2 = sortedFeedback.find(f => f.id === feedback2Id);
    const sortedFeedback3 = sortedFeedback.find(f => f.id === feedback3Id);
    
    // Feedback 1 should have 2 votes (highest)
    expect(sortedFeedback1.vote_count).toBe(2);
    // Feedback 2 should have 1 vote
    expect(sortedFeedback2.vote_count).toBe(1);
    // Feedback 3 should have 0 votes (lowest)
    expect(sortedFeedback3.vote_count).toBe(0);
    
    // Verify order: feedback 1 (2 votes) should come before feedback 2 (1 vote)
    // feedback 2 (1 vote) should come before feedback 3 (0 votes)
    const feedback1Index = sortedFeedback.findIndex(f => f.id === feedback1Id);
    const feedback2Index = sortedFeedback.findIndex(f => f.id === feedback2Id);
    const feedback3Index = sortedFeedback.findIndex(f => f.id === feedback3Id);
    
    expect(feedback1Index).toBeLessThan(feedback2Index);
    expect(feedback2Index).toBeLessThan(feedback3Index);
    
    console.log(`✓ Verified feedback is sorted by vote count`);
    console.log(`  Feedback 1 (2 votes) at index ${feedback1Index}`);
    console.log(`  Feedback 2 (1 vote) at index ${feedback2Index}`);
    console.log(`  Feedback 3 (0 votes) at index ${feedback3Index}`);

    // Step 9: Toggle vote off (User 1 removes vote from feedback 1)
    const toggleOffResult = await upvoteFeedback(request, feedback1Id, testUserId1);
    
    expect(toggleOffResult).toBeDefined();
    expect(toggleOffResult.success).toBe(true);
    expect(toggleOffResult.vote_count).toBe(1); // Should decrease from 2 to 1
    expect(toggleOffResult.hasVoted).toBe(false);
    
    console.log(`✓ User 1 toggled off vote for feedback 1 - vote count: ${toggleOffResult.vote_count}`);

    // Step 10: Verify vote count decreased after toggle
    const finalFeedback = await getFeedback(request);
    const finalFeedback1 = finalFeedback.find(f => f.id === feedback1Id);
    const finalFeedback2 = finalFeedback.find(f => f.id === feedback2Id);
    
    expect(finalFeedback1.vote_count).toBe(1); // Should now be 1 (only User 2's vote remains)
    expect(finalFeedback2.vote_count).toBe(1); // Should still be 1
    
    // Feedback 2 should now be first (1 vote, older than feedback 1's remaining vote)
    // Or if feedback 1 and 2 both have 1 vote, they should be sorted by creation date
    const finalFeedback1Index = finalFeedback.findIndex(f => f.id === feedback1Id);
    const finalFeedback2Index = finalFeedback.findIndex(f => f.id === feedback2Id);
    
    // Both have 1 vote, so they should be sorted by creation date (ascending - oldest first)
    // Feedback 1 was created before Feedback 2, so Feedback 1 should come first
    if (finalFeedback1.vote_count === finalFeedback2.vote_count) {
      expect(finalFeedback1Index).toBeLessThan(finalFeedback2Index);
      console.log(`✓ Verified feedback with same vote count is sorted by creation date (ascending)`);
    }
    
    console.log('✓ Feedback test completed successfully!');
  });

  test('should test multiple users voting on same feedback', async () => {
    // Create feedback
    const feedbackText = 'Add mobile app version';
    const feedback = await createFeedback(request, feedbackText, testUserId1);
    
    expect(feedback).toBeDefined();
    feedback1Id = feedback.id;
    console.log(`✓ Created feedback with ID: ${feedback1Id}`);

    // User 1 upvotes
    const vote1 = await upvoteFeedback(request, feedback1Id, testUserId1);
    expect(vote1.vote_count).toBe(1);
    expect(vote1.hasVoted).toBe(true);
    console.log(`✓ User 1 upvoted - vote count: 1`);

    // User 2 upvotes
    const vote2 = await upvoteFeedback(request, feedback1Id, testUserId2);
    expect(vote2.vote_count).toBe(2);
    expect(vote2.hasVoted).toBe(true);
    console.log(`✓ User 2 upvoted - vote count: 2`);

    // User 3 upvotes
    const testUserId3 = generateUserId();
    const vote3 = await upvoteFeedback(request, feedback1Id, testUserId3);
    expect(vote3.vote_count).toBe(3);
    expect(vote3.hasVoted).toBe(true);
    console.log(`✓ User 3 upvoted - vote count: 3`);

    // Verify final vote count
    const allFeedback = await getFeedback(request);
    const finalFeedback = allFeedback.find(f => f.id === feedback1Id);
    expect(finalFeedback.vote_count).toBe(3);
    expect(finalFeedback.voters).toContain(testUserId1);
    expect(finalFeedback.voters).toContain(testUserId2);
    expect(finalFeedback.voters).toContain(testUserId3);
    
    console.log(`✓ Verified final vote count is 3 with all three users`);
    console.log('✓ Multiple users voting test completed successfully!');
  });

  test('should verify feedback appears on feedback page', async ({ page }) => {
    // Step 1: Create feedback via API
    const feedbackText = 'Please improve the UI design';
    const feedback = await createFeedback(request, feedbackText, testUserId1);
    
    expect(feedback).toBeDefined();
    feedback1Id = feedback.id;
    console.log(`✓ Created feedback via API with ID: ${feedback1Id}`);

    // Step 2: Navigate to feedback page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:33000';
    await page.goto(`${frontendUrl}/feedback`);
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for feedback to appear
    await page.waitForSelector('.feedback-card, .empty-state', { timeout: 10000 });
    console.log(`✓ Navigated to feedback page`);

    // Step 3: Verify feedback appears on page (check first occurrence to handle duplicates from previous test runs)
    const feedbackTextExists = await page.locator(`text=${feedbackText}`).first().isVisible();
    expect(feedbackTextExists).toBe(true);
    console.log(`✓ Verified feedback appears on page`);

    // Step 4: Verify feedback form is present
    const feedbackForm = page.locator('.create-feedback-form');
    await expect(feedbackForm).toBeVisible();
    console.log(`✓ Verified feedback form is present`);

    console.log('✓ Feedback page test completed successfully!');
  });
});
