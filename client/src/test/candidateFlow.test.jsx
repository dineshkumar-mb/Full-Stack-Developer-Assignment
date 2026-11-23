import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import candidateService from '../services/candidateService.js';
import assessmentService from '../services/assessmentService.js';

import RegisterPage from '../pages/candidate/RegisterPage.jsx';
import InstructionsPage from '../pages/candidate/InstructionsPage.jsx';
import AssessmentPage from '../pages/candidate/AssessmentPage.jsx';
import ResultPage from '../pages/candidate/ResultPage.jsx';
import CandidateProtectedRoute from '../routes/CandidateProtectedRoute.jsx';

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

// Test consumer to inspect auth context state
const AuthStateInspector = () => {
  const { candidate, candidateToken, isLoadingCandidate } = useAuth();
  return (
    <div>
      <span data-testid="is-loading">{String(isLoadingCandidate)}</span>
      <span data-testid="token">{candidateToken || 'none'}</span>
      <span data-testid="name">{candidate?.fullName || 'anonymous'}</span>
    </div>
  );
};

describe('Candidate Assessment UI Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Session Restoration & Expiry on Refresh', () => {
    it('restores candidate profile on refresh when valid token is stored', async () => {
      localStorage.setItem('candidateToken', 'stored-valid-token');
      candidateService.getProfile.mockResolvedValueOnce({
        data: {
          success: true,
          candidate: { id: 'c1', fullName: 'Returning Candidate', email: 'return@test.com' },
        },
      });

      renderWithProviders(<AuthStateInspector />);

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('name')).toHaveTextContent('Returning Candidate');
        expect(screen.getByTestId('token')).toHaveTextContent('stored-valid-token');
      });
      expect(candidateService.getProfile).toHaveBeenCalledTimes(1);
    });

    it('clears stored token and resets to unauthenticated if token is invalid or expired (401)', async () => {
      localStorage.setItem('candidateToken', 'expired-token');
      const err = new Error('Unauthorized');
      err.status = 401;
      candidateService.getProfile.mockRejectedValueOnce(err);

      renderWithProviders(<AuthStateInspector />);

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('token')).toHaveTextContent('none');
        expect(screen.getByTestId('name')).toHaveTextContent('anonymous');
      });
      expect(localStorage.getItem('candidateToken')).toBeNull();
    });

    it('CandidateProtectedRoute redirects unauthenticated visitors to /register', async () => {
      render(
        <MemoryRouter initialEntries={['/assessment']}>
          <AuthProvider>
            <Routes>
              <Route path="/register" element={<div>Registration Screen</div>} />
              <Route element={<CandidateProtectedRoute />}>
                <Route path="/assessment" element={<div>Protected Exam Area</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Registration Screen')).toBeInTheDocument();
        expect(screen.queryByText('Protected Exam Area')).not.toBeInTheDocument();
      });
    });
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

  describe('Assessment Engine Reliability & Concurrency', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const makeMockAttempt = (remainingSeconds = 900) => ({
      attemptId: 'att123',
      status: 'in_progress',
      startedAt: new Date(Date.now() - 60000).toISOString(),
      expiresAt: new Date(Date.now() + remainingSeconds * 1000).toISOString(),
      serverNow: new Date().toISOString(),
      remainingSeconds,
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
          questionText: 'Is logic transitive?',
          options: [
            { optionId: 'A', text: 'Yes' },
            { optionId: 'B', text: 'No' },
            { optionId: 'C', text: 'Sometimes' },
            { optionId: 'D', text: 'Never' },
          ],
          category: 'Logical Reasoning',
          difficulty: 'Medium',
          selectedOption: null,
          isMarkedForReview: false,
          isAnswered: false,
        },
      ],
    });

    it('renders question text, options, question palette and allows selecting an option', async () => {
      assessmentService.getCurrentAttempt.mockResolvedValueOnce({
        data: { attempt: makeMockAttempt() },
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

    it('guards against rapid answer changes race condition', async () => {
      assessmentService.getCurrentAttempt.mockResolvedValueOnce({
        data: { attempt: makeMockAttempt() },
      });

      // Mock saveAnswer with controlled promise resolution
      let resolveFirst;
      const firstCallPromise = new Promise((res) => {
        resolveFirst = res;
      });
      assessmentService.saveAnswer
        .mockReturnValueOnce(firstCallPromise) // Slow request for Option A
        .mockResolvedValueOnce({ data: { success: true } }); // Fast request for Option B

      renderWithProviders(<AssessmentPage />);

      await waitFor(() => {
        expect(screen.getByText('3 x 10^8 m/s')).toBeInTheDocument();
      });

      // Rapidly click Option A then Option B
      fireEvent.click(screen.getByText('3 x 10^8 m/s'));
      fireEvent.click(screen.getByText('3 x 10^6 m/s'));

      // Resolve the earlier slow request for Option A
      resolveFirst({ data: { success: true } });

      await waitFor(() => {
        // Both requests were dispatched
        expect(assessmentService.saveAnswer).toHaveBeenCalledTimes(2);
        // Option B is the latest selected state in the UI
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });
    });

    it('displays connection error and never produces a false "Saved" status on network failure', async () => {
      assessmentService.getCurrentAttempt.mockResolvedValueOnce({
        data: { attempt: makeMockAttempt() },
      });
      const networkError = new Error('Network Error');
      networkError.response = { data: { message: 'Failed to reach server' } };
      assessmentService.saveAnswer.mockRejectedValueOnce(networkError);

      renderWithProviders(<AssessmentPage />);

      await waitFor(() => {
        expect(screen.getByText('3 x 10^8 m/s')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('3 x 10^8 m/s'));

      await waitFor(() => {
        expect(screen.getByText('Save failed!')).toBeInTheDocument();
        expect(screen.getByText(/Failed to reach server/i)).toBeInTheDocument();
        expect(screen.queryByText('Saved')).not.toBeInTheDocument();
      });
    });

    it('prevents conflicting duplicate submissions on rapid double clicks', async () => {
      assessmentService.getCurrentAttempt.mockResolvedValueOnce({
        data: { attempt: makeMockAttempt() },
      });
      assessmentService.submitAssessment.mockResolvedValue({
        data: { success: true },
      });

      renderWithProviders(<AssessmentPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Submit Test/i })).toBeInTheDocument();
      });

      // Open submit modal
      fireEvent.click(screen.getByRole('button', { name: /Submit Test/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Confirm Submission/i })).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: /Confirm Submission/i });
      // Rapid double click
      fireEvent.click(confirmBtn);
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(assessmentService.submitAssessment).toHaveBeenCalledTimes(1);
      });
    });

    it('smoothly routes to result if attempt was already finalized on the server (400 / 409)', async () => {
      assessmentService.getCurrentAttempt.mockResolvedValueOnce({
        data: { attempt: makeMockAttempt() },
      });
      const conflictErr = new Error('Assessment already submitted');
      conflictErr.status = 400;
      conflictErr.response = { status: 400, data: { message: 'Attempt is already finalized' } };
      assessmentService.submitAssessment.mockRejectedValueOnce(conflictErr);

      renderWithProviders(
        <Routes>
          <Route path="/" element={<AssessmentPage />} />
          <Route path="/result" element={<div>Result Page Transition</div>} />
        </Routes>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Submit Test/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Submit Test/i }));
      fireEvent.click(screen.getByRole('button', { name: /Confirm Submission/i }));

      await waitFor(() => {
        expect(screen.getByText('Result Page Transition')).toBeInTheDocument();
      });
    });

    it('toggles mark for review', async () => {
      assessmentService.getCurrentAttempt.mockResolvedValueOnce({
        data: { attempt: makeMockAttempt() },
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
