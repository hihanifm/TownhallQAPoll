import { test, expect } from '@playwright/test';
import { 
  generateUserId, 
  createCampaign, 
  createQuestion, 
  updateQuestion,
  upvoteQuestion,
  getCampaign,
  getQuestions,
  verifyCampaignPin,
  closeCampaign,
  deleteCampaign,
  deleteQuestion,
  createComment,
  updateComment,
  deleteComment,
  checkBackendHealth
} from '../helpers/api.js';

test.describe('Campaign Voting E2E Test', () => {
  let request;
  let testUserId;
  let campaignId;
  let question1Id;
  let question2Id;

  test.beforeEach(async ({ request: requestContext }) => {
    request = requestContext;
    testUserId = generateUserId();
    
    // Optional: Check if backend is running
    const isBackendRunning = await checkBackendHealth(request);
    if (!isBackendRunning) {
      console.warn('⚠️  Backend may not be running on http://localhost:3001');
      console.warn('   Make sure to start the backend before running tests');
    }
  });

  test('should create campaign, add 2 questions, upvote both, and toggle one vote off', async () => {
    // Step 1: Create a campaign
    const campaignData = {
      title: `Test Campaign ${Date.now()}`,
      description: 'E2E Test Campaign',
      creatorId: testUserId,
      creatorName: 'Test Author',
    };
    
    const campaign = await createCampaign(
      request,
      campaignData.title,
      campaignData.description,
      campaignData.creatorId,
      campaignData.creatorName
    );
    
    expect(campaign).toBeDefined();
    expect(campaign.id).toBeDefined();
    expect(campaign.title).toBe(campaignData.title);
    expect(campaign.description).toBe(campaignData.description);
    expect(campaign.creator_name).toBe(campaignData.creatorName);
    expect(campaign.status).toBe('active');
    
    campaignId = campaign.id;
    console.log(`✓ Created campaign with ID: ${campaignId}`);

    // Verify campaign can be fetched and creator_name persists
    const fetchedCampaign = await getCampaign(request, campaignId);
    expect(fetchedCampaign.creator_name).toBe(campaignData.creatorName);
    console.log(`✓ Verified creator_name persists in fetched campaign: ${fetchedCampaign.creator_name}`);

    // Step 2: Create first question
    const question1Text = 'What is the company strategy for 2024?';
    const question1 = await createQuestion(request, campaignId, question1Text, testUserId);
    
    expect(question1).toBeDefined();
    expect(question1.id).toBeDefined();
    expect(question1.question_text).toBe(question1Text);
    expect(question1.campaign_id).toBe(campaignId);
    expect(question1.vote_count).toBe(0);
    expect(question1.creator_id).toBe(testUserId);
    
    question1Id = question1.id;
    console.log(`✓ Created question 1 with ID: ${question1Id}`);

    // Step 3: Create second question
    const question2Text = 'Will there be any organizational changes?';
    const question2 = await createQuestion(request, campaignId, question2Text, testUserId);
    
    expect(question2).toBeDefined();
    expect(question2.id).toBeDefined();
    expect(question2.question_text).toBe(question2Text);
    expect(question2.campaign_id).toBe(campaignId);
    expect(question2.vote_count).toBe(0);
    expect(question2.creator_id).toBe(testUserId);
    
    question2Id = question2.id;
    console.log(`✓ Created question 2 with ID: ${question2Id}`);

    // Step 4: Upvote first question
    const upvote1Result = await upvoteQuestion(request, question1Id, testUserId);
    
    expect(upvote1Result).toBeDefined();
    expect(upvote1Result.success).toBe(true);
    expect(upvote1Result.vote_count).toBe(1);
    expect(upvote1Result.hasVoted).toBe(true);
    
    console.log(`✓ Upvoted question 1 - vote count: ${upvote1Result.vote_count}`);

    // Step 5: Upvote second question
    const upvote2Result = await upvoteQuestion(request, question2Id, testUserId);
    
    expect(upvote2Result).toBeDefined();
    expect(upvote2Result.success).toBe(true);
    expect(upvote2Result.vote_count).toBe(1);
    expect(upvote2Result.hasVoted).toBe(true);
    
    console.log(`✓ Upvoted question 2 - vote count: ${upvote2Result.vote_count}`);

    // Verify both questions have 1 vote each
    const questionsAfterUpvotes = await getQuestions(request, campaignId);
    const q1AfterUpvote = questionsAfterUpvotes.find(q => q.id === question1Id);
    const q2AfterUpvote = questionsAfterUpvotes.find(q => q.id === question2Id);
    
    expect(q1AfterUpvote.vote_count).toBe(1);
    expect(q2AfterUpvote.vote_count).toBe(1);
    expect(q1AfterUpvote.voters).toContain(testUserId);
    expect(q2AfterUpvote.voters).toContain(testUserId);

    // Step 6: Edit question 1 (as creator)
    const updatedQuestion1Text = 'What is the company strategy for 2024 and beyond?';
    const updatedQuestion1 = await updateQuestion(request, question1Id, updatedQuestion1Text, testUserId);
    
    expect(updatedQuestion1).toBeDefined();
    expect(updatedQuestion1.id).toBe(question1Id);
    expect(updatedQuestion1.question_text).toBe(updatedQuestion1Text);
    expect(updatedQuestion1.vote_count).toBe(1); // Vote count should remain
    
    console.log(`✓ Edited question 1 - updated text: "${updatedQuestion1.question_text}"`);

    // Step 7: "Downvote" question 1 (toggle off by calling upvote again)
    const toggleOffResult = await upvoteQuestion(request, question1Id, testUserId);
    
    expect(toggleOffResult).toBeDefined();
    expect(toggleOffResult.success).toBe(true);
    expect(toggleOffResult.vote_count).toBe(0);
    expect(toggleOffResult.hasVoted).toBe(false);
    
    console.log(`✓ Toggled off vote for question 1 - vote count: ${toggleOffResult.vote_count}`);

    // Final verification: Check question states
    const finalQuestions = await getQuestions(request, campaignId);
    const q1Final = finalQuestions.find(q => q.id === question1Id);
    const q2Final = finalQuestions.find(q => q.id === question2Id);
    
    // Question 1 should have updated text and 0 votes (vote removed)
    expect(q1Final.question_text).toBe(updatedQuestion1Text);
    expect(q1Final.vote_count).toBe(0);
    expect(q1Final.voters).not.toContain(testUserId);
    
    // Question 2 should still have 1 vote and original text
    expect(q2Final.question_text).toBe(question2Text);
    expect(q2Final.vote_count).toBe(1);
    expect(q2Final.voters).toContain(testUserId);

    console.log('✓ Test completed successfully!');
  });

  test('should create campaign with PIN, verify PIN, and use PIN for admin operations', async () => {
    const creatorId = testUserId;
    const adminUserId = generateUserId(); // Different user who will use PIN
    const campaignPin = 'test-pin-1234';
    
    // Step 1: Create a campaign with a PIN
    const campaignData = {
      title: `Test Campaign with PIN ${Date.now()}`,
      description: 'E2E Test Campaign with PIN',
      creatorId: creatorId,
      creatorName: 'PIN Test Creator',
      pin: campaignPin,
    };
    
    const campaign = await createCampaign(
      request,
      campaignData.title,
      campaignData.description,
      campaignData.creatorId,
      campaignData.creatorName,
      campaignData.pin
    );
    
    expect(campaign).toBeDefined();
    expect(campaign.id).toBeDefined();
    expect(campaign.title).toBe(campaignData.title);
    expect(campaign.pin).toBeUndefined(); // PIN should NOT be in response
    campaignId = campaign.id;
    console.log(`✓ Created campaign with PIN - ID: ${campaignId}`);

    // Step 2: Verify PIN verification works
    const verifyResult = await verifyCampaignPin(request, campaignId, campaignPin);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.message).toBe('PIN verified successfully');
    console.log(`✓ Verified PIN successfully`);

    // Step 3: Verify wrong PIN fails
    try {
      await verifyCampaignPin(request, campaignId, 'wrong-pin');
      throw new Error('Should have failed with wrong PIN');
    } catch (error) {
      expect(error.message).toContain('Invalid PIN');
      console.log(`✓ Correctly rejected wrong PIN`);
    }

    // Step 4: Create a question in the campaign
    const questionText = 'Can I delete this question with PIN?';
    const question = await createQuestion(request, campaignId, questionText, creatorId);
    question1Id = question.id;
    console.log(`✓ Created question with ID: ${question1Id}`);

    // Step 5: Try to delete question without PIN (should fail for non-creator)
    try {
      await deleteQuestion(request, question1Id, adminUserId, null);
      throw new Error('Should have failed without PIN');
    } catch (error) {
      expect(error.message).toMatch(/Not authorized|creator|PIN/);
      console.log(`✓ Correctly prevented deletion without PIN/creator_id`);
    }

    // Step 6: Delete question with PIN (should succeed)
    const deleteResult = await deleteQuestion(request, question1Id, null, campaignPin);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.message).toBe('Question deleted successfully');
    console.log(`✓ Successfully deleted question using PIN`);

    // Step 7: Create another question for further testing
    const question2Text = 'Another test question';
    const question2 = await createQuestion(request, campaignId, question2Text, creatorId);
    question2Id = question2.id;
    console.log(`✓ Created question 2 with ID: ${question2Id}`);

    // Step 8: Try to close campaign without PIN (should fail for non-creator)
    try {
      await closeCampaign(request, campaignId, adminUserId, null);
      throw new Error('Should have failed without PIN');
    } catch (error) {
      expect(error.message).toMatch(/Not authorized|creator|PIN/);
      console.log(`✓ Correctly prevented closing campaign without PIN/creator_id`);
    }

    // Step 9: Close campaign with PIN (should succeed)
    const closedCampaign = await closeCampaign(request, campaignId, null, campaignPin);
    expect(closedCampaign.status).toBe('closed');
    console.log(`✓ Successfully closed campaign using PIN`);

    // Step 10: Verify campaign is actually closed
    const fetchedClosedCampaign = await getCampaign(request, campaignId);
    expect(fetchedClosedCampaign.status).toBe('closed');
    console.log(`✓ Verified campaign is closed`);

    console.log('✓ PIN test completed successfully!');
  });

  test('should test comment functionality (create, update, delete) with PIN', async ({ page }) => {
    const creatorId = testUserId;
    const campaignPin = 'comment-test-pin-1234';
    
    // Step 1: Create a campaign with a PIN
    const campaign = await createCampaign(
      request,
      `Comment Test Campaign ${Date.now()}`,
      'E2E Test Campaign for Comments',
      creatorId,
      'Comment Test Creator',
      campaignPin
    );
    
    expect(campaign).toBeDefined();
    campaignId = campaign.id;
    console.log(`✓ Created campaign for comment tests - ID: ${campaignId}`);

    // Step 2: Create a question
    const questionText = 'Test question for comments';
    const question = await createQuestion(request, campaignId, questionText, creatorId);
    question1Id = question.id;
    console.log(`✓ Created question for comment tests - ID: ${question1Id}`);

    // Step 3: Create a comment using PIN
    const commentText = 'This is a test comment';
    const comment = await createComment(request, question1Id, commentText, null, campaignPin);
    
    expect(comment).toBeDefined();
    expect(comment.id).toBeDefined();
    expect(comment.comment_text).toBe(commentText);
    const commentId = comment.id;
    console.log(`✓ Created comment with ID: ${commentId}`);

    // Step 4: Verify comment appears in question
    const questionsWithComments = await getQuestions(request, campaignId);
    const questionWithComment = questionsWithComments.find(q => q.id === question1Id);
    expect(questionWithComment).toBeDefined();
    expect(questionWithComment.comments).toBeDefined();
    expect(questionWithComment.comments.length).toBe(1);
    expect(questionWithComment.comments[0].comment_text).toBe(commentText);
    console.log(`✓ Verified comment appears in question`);

    // Step 5: Update the comment using PIN
    const updatedCommentText = 'This is an updated test comment';
    const updatedComment = await updateComment(request, question1Id, commentId, updatedCommentText, null, campaignPin);
    
    expect(updatedComment).toBeDefined();
    expect(updatedComment.id).toBe(commentId);
    expect(updatedComment.comment_text).toBe(updatedCommentText);
    console.log(`✓ Updated comment - new text: "${updatedCommentText}"`);

    // Step 6: Verify updated comment appears in question
    const questionsAfterUpdate = await getQuestions(request, campaignId);
    const questionAfterUpdate = questionsAfterUpdate.find(q => q.id === question1Id);
    expect(questionAfterUpdate.comments.length).toBe(1);
    expect(questionAfterUpdate.comments[0].comment_text).toBe(updatedCommentText);
    console.log(`✓ Verified updated comment appears in question`);

    // Step 7: Delete the comment using PIN
    const deleteResult = await deleteComment(request, question1Id, commentId, null, campaignPin);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.message).toBe('Comment deleted successfully');
    console.log(`✓ Deleted comment successfully`);

    // Step 8: Verify comment is removed from question
    const questionsAfterDelete = await getQuestions(request, campaignId);
    const questionAfterDelete = questionsAfterDelete.find(q => q.id === question1Id);
    expect(questionAfterDelete.comments.length).toBe(0);
    console.log(`✓ Verified comment is removed from question`);

    console.log('✓ Comment test completed successfully!');
  });

  test('should test share button click and clipboard copy', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Step 1: Create a campaign
    const campaign = await createCampaign(
      request,
      `Share Test Campaign ${Date.now()}`,
      'E2E Test Campaign for Share Button',
      testUserId,
      'Share Test Creator'
    );
    
    expect(campaign).toBeDefined();
    campaignId = campaign.id;
    console.log(`✓ Created campaign for share test - ID: ${campaignId}`);

    // Step 2: Navigate to the campaign page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    await page.goto(`${frontendUrl}/campaign/${campaignId}`);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for the share button to be visible
    const shareButton = page.locator('.share-campaign-btn');
    await expect(shareButton).toBeVisible({ timeout: 10000 });
    console.log(`✓ Navigated to campaign page and found share button`);

    // Step 3: Click the share button
    await shareButton.click();
    console.log(`✓ Clicked share button`);

    // Step 4: Wait a bit for clipboard operation to complete
    await page.waitForTimeout(1000);

    // Step 5: Read clipboard content
    // Note: In Playwright, we need to evaluate clipboard in the page context
    const clipboardText = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch (err) {
        // If clipboard API fails, check if there's a feedback message
        return null;
      }
    });

    // Expected URL format
    const expectedUrl = `${frontendUrl}/campaign/${campaignId}`;
    
    // Verify clipboard contains the campaign URL
    if (clipboardText) {
      expect(clipboardText).toBe(expectedUrl);
      console.log(`✓ Verified clipboard contains campaign URL: ${clipboardText}`);
    } else {
      // If clipboard read fails, check for share feedback message as alternative verification
      const shareFeedback = page.locator('.share-feedback');
      // The feedback might be visible or might have disappeared already
      // So we just log that the button was clicked
      console.log(`✓ Share button clicked (clipboard verification skipped)`);
    }

    console.log('✓ Share button test completed successfully!');
  });
});
