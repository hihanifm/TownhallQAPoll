import { test, expect } from '@playwright/test';
import { 
  generateUserId, 
  createCampaign, 
  createQuestion, 
  upvoteQuestion,
  getCampaign,
  getQuestions,
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
    const question1 = await createQuestion(request, campaignId, question1Text);
    
    expect(question1).toBeDefined();
    expect(question1.id).toBeDefined();
    expect(question1.question_text).toBe(question1Text);
    expect(question1.campaign_id).toBe(campaignId);
    expect(question1.vote_count).toBe(0);
    
    question1Id = question1.id;
    console.log(`✓ Created question 1 with ID: ${question1Id}`);

    // Step 3: Create second question
    const question2Text = 'Will there be any organizational changes?';
    const question2 = await createQuestion(request, campaignId, question2Text);
    
    expect(question2).toBeDefined();
    expect(question2.id).toBeDefined();
    expect(question2.question_text).toBe(question2Text);
    expect(question2.campaign_id).toBe(campaignId);
    expect(question2.vote_count).toBe(0);
    
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

    // Step 6: "Downvote" question 1 (toggle off by calling upvote again)
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
    
    // Question 1 should have 0 votes (vote removed)
    expect(q1Final.vote_count).toBe(0);
    expect(q1Final.voters).not.toContain(testUserId);
    
    // Question 2 should still have 1 vote
    expect(q2Final.vote_count).toBe(1);
    expect(q2Final.voters).toContain(testUserId);

    console.log('✓ Test completed successfully!');
  });
});
