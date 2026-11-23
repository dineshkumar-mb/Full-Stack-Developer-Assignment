import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import adminService from '../services/adminService.js';

import AdminLoginPage from '../pages/admin/AdminLoginPage.jsx';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import QuestionManagementPage from '../pages/admin/QuestionManagementPage.jsx';
import CandidateManagementPage from '../pages/admin/CandidateManagementPage.jsx';
import SettingsPage from '../pages/admin/SettingsPage.jsx';

vi.mock('../services/adminService.js');

const renderWithProviders = (ui, { route = '/admin/dashboard' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
};

describe('Admin Management & Analytics UI Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Admin Login', () => {
    it('renders admin credentials form and submits successfully', async () => {
      adminService.login.mockResolvedValueOnce({
        data: {
          token: 'mock-admin-jwt',
          admin: { email: 'admin@assessment.com', role: 'admin' },
        },
      });

      renderWithProviders(<AdminLoginPage />, { route: '/admin/login' });

      expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Admin Email/i), {
        target: { value: 'admin@assessment.com' },
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: 'AdminPassword123!' },
      });

      const submitBtn = screen.getByRole('button', { name: /Sign In/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(adminService.login).toHaveBeenCalledWith({
          email: 'admin@assessment.com',
          password: 'AdminPassword123!',
        });
      });
    });
  });

  describe('Admin Dashboard Page', () => {
    it('renders all key dashboard metrics and completion summary', async () => {
      adminService.getDashboardSummary.mockResolvedValueOnce({
        data: {
          summary: {
            totalCandidates: 25,
            completedAssessments: 18,
            inProgressAssessments: 2,
            notStartedCandidates: 5,
            averageScore: 12.5,
            passRate: 72.22,
            highestScore: 19,
            lowestScore: 2,
          },
        },
      });

      adminService.getDashboardAnalytics.mockResolvedValueOnce({
        data: {
          analytics: {
            passFailDistribution: { passed: 13, failed: 5 },
            scoreDistribution: [{ range: '11-15', count: 8 }],
            completionTrend: [{ date: '2026-11-23', count: 4 }],
            categoryPerformance: [{ category: 'Quantitative', accuracy: 75 }],
          },
        },
      });

      renderWithProviders(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // Total candidates
        expect(screen.getByText('18')).toBeInTheDocument(); // Completed
        expect(screen.getByText('72.22%')).toBeInTheDocument(); // Pass Rate
        expect(screen.getByText('12.5')).toBeInTheDocument(); // Average score
      });
    });
  });

  describe('Question Management Page', () => {
    it('displays 10-active invariant status and questions list', async () => {
      adminService.getQuestions.mockResolvedValueOnce({
        data: {
          questions: [
            {
              _id: 'q1',
              questionText: 'Evaluate log base 10 of 1000.',
              category: 'Quantitative',
              difficulty: 'Easy',
              correctOption: 'C',
              isActive: true,
              activeSlot: 1,
              options: [
                { optionId: 'A', text: '1' },
                { optionId: 'B', text: '2' },
                { optionId: 'C', text: '3' },
                { optionId: 'D', text: '4' },
              ],
            },
          ],
          pagination: { page: 1, totalPages: 1, total: 1 },
        },
      });

      renderWithProviders(<QuestionManagementPage />);

      await waitFor(() => {
        expect(screen.getByText(/10 \/ 10 Active/i)).toBeInTheDocument();
        expect(screen.getByText(/Evaluate log base 10 of 1000/i)).toBeInTheDocument();
        expect(screen.getByText(/Slot #1/i)).toBeInTheDocument();
      });
    });
  });

  describe('Candidate Management Page', () => {
    it('renders candidates table and export action buttons', async () => {
      adminService.getCandidates.mockResolvedValueOnce({
        data: {
          candidates: [
            {
              _id: 'c1',
              fullName: 'Alice Smith',
              email: 'alice@example.com',
              phone: '9876543210',
              qualification: "Bachelor's Degree",
              assessmentStatus: 'completed',
              netScore: 16,
              isPassed: true,
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, totalPages: 1, total: 1 },
        },
      });

      renderWithProviders(<CandidateManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
        expect(screen.getByText('16 / 20')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Export Excel/i })).toBeInTheDocument();
      });
    });
  });

  describe('Settings Page', () => {
    it('loads current test settings and allows submitting configuration changes', async () => {
      adminService.getSettings.mockResolvedValueOnce({
        data: {
          settings: {
            testDurationMinutes: 15,
            passPercentage: 60,
            correctMarkWeight: 2,
            negativeMarkWeight: 1,
            totalTestQuestions: 10,
          },
        },
      });
      adminService.updateSettings.mockResolvedValueOnce({
        data: {
          settings: {
            testDurationMinutes: 20,
            passPercentage: 65,
            correctMarkWeight: 2,
            negativeMarkWeight: 1,
            totalTestQuestions: 10,
          },
        },
      });

      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Test Duration \(Minutes\)/i)).toHaveValue(15);
        expect(screen.getByLabelText(/Pass Percentage Cutoff \(%\)/i)).toHaveValue(60);
      });

      fireEvent.change(screen.getByLabelText(/Test Duration \(Minutes\)/i), {
        target: { value: '20' },
      });

      const saveBtn = screen.getByRole('button', { name: /Save Configuration/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(adminService.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            testDurationMinutes: 20,
          })
        );
      });
    });
  });
});
