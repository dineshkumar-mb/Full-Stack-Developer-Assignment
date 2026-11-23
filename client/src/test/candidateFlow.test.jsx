import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import candidateService from '../services/candidateService.js';
import assessmentService from '../services/assessmentService.js';

import RegisterPage from '../pages/candidate/RegisterPage.jsx';
import InstructionsPage from '../pages/candidate/InstructionsPage.jsx';
import AssessmentPage from '../pages/candidate/AssessmentPage.jsx';
import ResultPage from '../pages/candidate/ResultPage.jsx';

// Mock services
vi.mock('../services/candidateService.js');
vi.mock('../services/assessmentService.js');

const renderWithProviders = (ui, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
};

describe('Candidate Assessment UI Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Registration Page', () => {
    it('renders all required candidate registration fields', () => {
      renderWithProviders(<RegisterPage />);

      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Age \(Years\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Highest Qualification/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Proceed to Instructions/i })).toBeInTheDocument();
    });

    it('displays client validation errors when submitting empty form', async () => {
      renderWithProviders(<RegisterPage />);

      const submitButton = screen.getByRole('button', { name: /Proceed to Instructions/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Full name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('submits valid candidate data and receives token', async () => {
      candidateService.register.mockResolvedValueOnce({
        data: {
          success: true,
          token: 'mock-candidate-jwt',
          candidate: {
            id: 'c123',
            fullName: 'Jane Candidate',
            email: 'jane@example.com',
            hasAttempted: false,
          },
        },
      });

      renderWithProviders(<RegisterPage />);

      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'Jane Candidate' },
      });
      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'jane@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), {
        target: { value: '9876543210' },
      });
      fireEvent.change(screen.getByLabelText(/Age \(Years\)/i), {
        target: { value: '25' },
      });
      fireEvent.change(screen.getByLabelText(/Highest Qualification/i), {
        target: { value: "Bachelor's Degree" },
      });

      const submitButton = screen.getByRole('button', { name: /Proceed to Instructions/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(candidateService.register).toHaveBeenCalledTimes(1);
        expect(candidateService.register).toHaveBeenCalledWith(
          expect.objectContaining({
            fullName: 'Jane Candidate',
            email: 'jane@example.com',
            phoneNumber: '9876543210',
            age: 25,
            highestQualification: "Bachelor's Degree",
          })
        );
      });
    });
  });

  describe('Instructions Page', () => {
    it('renders test rules and requires agreement checkbox before enabling Start Assessment', async () => {
      assessmentService.getInstructions.mockResolvedValueOnce({
        data: {
          instructions: {
            totalQuestions: 10,
            durationMinutes: 15,
            correctMarkWeight: 2,
            negativeMarkWeight: 1,
            passPercentage: 60,
            rules: [
              'Each correct answer awards +2 marks.',
              'Each wrong answer deducts -1 mark.',
            ],
          },
        },
      });

      renderWithProviders(<InstructionsPage />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('15 Mins')).toBeInTheDocument();
        expect(screen.getByText('+2 Marks')).toBeInTheDocument();
        expect(screen.getByText('-1 Mark')).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /Start Assessment/i });
      expect(startButton).toBeDisabled();

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(startButton).not.toBeDisabled();
    });
  });

  describe('Assessment Engine Page', () => {
    const mockAttempt = {
      attemptId: 'att123',
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      remainingSeconds: 900,
      totalQuestions: 2,
      answeredCount: 0,
      unansweredCount: 2,
      markedForReviewCount: 0,
      questions: [
        {
          snapshotId: 's1',
          questionId: 'q1',
          orderNumber: 1,
          questionText: 'What is the speed of light in vacuum?',
          options: [
            { optionId: 'A', text: '3 x 10^8 m/s' },
            { optionId: 'B', text: '3 x 10^6 m/s' },
            { optionId: 'C', text: '1.5 x 10^8 m/s' },
            { optionId: 'D', text: '3 x 10^5 km/h' },
          ],
          category: 'Quantitative',
          difficulty: 'Easy',
          selectedOption: null,
          isMarkedForReview: false,
          isAnswered: false,
        },
        {
          snapshotId: 's2',
          questionId: 'q2',
          orderNumber: 2,
          questionText: 'If all bloops are razzies and all razzies are lazzies, are all bloops lazzies?',
          options: [
            { optionId: 'A', text: 'Yes' },
            { optionId: 'B', text: 'No' },
            { optionId: 'C', text: 'Cannot be determined' },
            { optionId: 'D', text: 'None of the above' },
          ],
          category: 'Logical Reasoning',
          difficulty: 'Medium',
          selectedOption: null,
          isMarkedForReview: false,
          isAnswered: false,
        },
      ],
    };

    it('renders question text, options, question palette and allows selecting an option', async () => {
      assessmentService.getCurrentAttempt.mockResolvedValueOnce({
        data: { attempt: mockAttempt },
      });
      assessmentService.saveAnswer.mockResolvedValue({
        data: { success: true },
      });

      renderWithProviders(<AssessmentPage />);

      await waitFor(() => {
        expect(screen.getByText(/What is the speed of light in vacuum\?/i)).toBeInTheDocument();
        expect(screen.getByText('3 x 10^8 m/s')).toBeInTheDocument();
      });

      // Select option A
      const optionA = screen.getByText('3 x 10^8 m/s');
      fireEvent.click(optionA);

      await waitFor(() => {
        expect(assessmentService.saveAnswer).toHaveBeenCalledWith('s1', {
          selectedOption: 'A',
        });
      });
    });

    it('toggles mark for review', async () => {
      assessmentService.getCurrentAttempt.mockResolvedValueOnce({
        data: { attempt: mockAttempt },
      });
      assessmentService.saveAnswer.mockResolvedValue({
        data: { success: true },
      });

      renderWithProviders(<AssessmentPage />);

      await waitFor(() => {
        expect(screen.getByText(/Mark for Review/i)).toBeInTheDocument();
      });

      const reviewButton = screen.getByRole('button', { name: /Mark for Review/i });
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(assessmentService.saveAnswer).toHaveBeenCalledWith('s1', {
          isMarkedForReview: true,
        });
      });
    });

    it('opens submission modal showing answered and unanswered counts', async () => {
      assessmentService.getCurrentAttempt.mockResolvedValueOnce({
        data: { attempt: mockAttempt },
      });

      renderWithProviders(<AssessmentPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Submit Test/i })).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole('button', { name: /Submit Test/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Confirm Assessment Submission/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Confirm Submission/i })).toBeInTheDocument();
      });
    });
  });

  describe('Result Page', () => {
    it('displays passing score summary with correct/incorrect breakdown', async () => {
      assessmentService.getResult.mockResolvedValueOnce({
        data: {
          result: {
            attemptId: 'att123',
            candidate: { fullName: 'Jane Candidate' },
            scoreSummary: {
              totalQuestions: 10,
              correctCount: 8,
              incorrectCount: 2,
              unattemptedCount: 0,
              marksGained: 16,
              marksDeducted: 2,
              netScore: 14,
              scaledScoreOutOf10: 7.0,
              percentage: 70,
              passPercentageCutoff: 60,
              isPassed: true,
              timeTakenSeconds: 450,
              submissionType: 'manual',
            },
          },
        },
      });

      renderWithProviders(<ResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/Assessment Passed!/i)).toBeInTheDocument();
        expect(screen.getByText('14')).toBeInTheDocument(); // Net score
        expect(screen.getByText('70%')).toBeInTheDocument(); // Percentage
        expect(screen.getByText('8')).toBeInTheDocument(); // Correct count
        expect(screen.getByText('2')).toBeInTheDocument(); // Incorrect count
      });
    });
  });
});
