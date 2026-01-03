/**
 * Tests for QuestionCard component
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import QuestionCard from '../../components/QuestionCard';
import { api } from '../../services/api';
import { getUserId } from '@townhall/shared/utils/userId';

// Mock API and utilities
vi.mock('../../services/api');
vi.mock('@townhall/shared/utils/userId');

describe('QuestionCard', () => {
  const mockQuestion = {
    id: 1,
    question_text: 'Test Question',
    vote_count: 5,
    created_at: new Date().toISOString(),
    voters: ['user1', 'user2']
  };

  const mockOnVoteUpdate = vi.fn();
  const mockOnQuestionDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getUserId.mockReturnValue('test-user-123');
    api.checkVote.mockResolvedValue({ hasVoted: false });
    api.upvoteQuestion.mockResolvedValue({ success: true, vote_count: 6, hasVoted: true });
  });

  test('should render question text', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        campaignId={1}
        onVoteUpdate={mockOnVoteUpdate}
        onQuestionDeleted={mockOnQuestionDeleted}
        number={1}
        isCampaignCreator={false}
      />
    );

    expect(screen.getByText('Test Question')).toBeInTheDocument();
  });

  test('should display vote count', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        campaignId={1}
        onVoteUpdate={mockOnVoteUpdate}
        onQuestionDeleted={mockOnQuestionDeleted}
        number={1}
        isCampaignCreator={false}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('should show delete button only for campaign creator', () => {
    const { rerender } = render(
      <QuestionCard
        question={mockQuestion}
        campaignId={1}
        onVoteUpdate={mockOnVoteUpdate}
        onQuestionDeleted={mockOnQuestionDeleted}
        number={1}
        isCampaignCreator={false}
      />
    );

    expect(screen.queryByTitle('Delete question')).not.toBeInTheDocument();

    rerender(
      <QuestionCard
        question={mockQuestion}
        campaignId={1}
        onVoteUpdate={mockOnVoteUpdate}
        onQuestionDeleted={mockOnQuestionDeleted}
        number={1}
        isCampaignCreator={true}
      />
    );

    expect(screen.getByTitle('Delete question')).toBeInTheDocument();
  });

  test('should display upvote button', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        campaignId={1}
        onVoteUpdate={mockOnVoteUpdate}
        onQuestionDeleted={mockOnQuestionDeleted}
        number={1}
        isCampaignCreator={false}
      />
    );

    expect(screen.getByText('Upvote')).toBeInTheDocument();
  });
});
