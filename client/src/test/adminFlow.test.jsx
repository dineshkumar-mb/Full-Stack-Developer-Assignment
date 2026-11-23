import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import adminService from '../services/adminService.js';

import AdminLoginPage from '../pages/admin/AdminLoginPage.jsx';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import QuestionManagementPage from '../pages/admin/QuestionManagementPage.jsx';
import CandidateManagementPage from '../pages/admin/CandidateManagementPage.jsx';
import SettingsPage from '../pages/admin/SettingsPage.jsx';
import AdminProtectedRoute from '../routes/AdminProtectedRoute.jsx';

vi.mock('../services/adminService.js');

const renderWithProviders = (ui, { route = '/admin/dashboard' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
};

const AdminAuthStateInspector = () => {
  const { admin, adminToken, isLoadingAdmin } = useAuth();
  return (
    <div>
      <span data-testid="admin-loading">{String(isLoadingAdmin)}</span>
      <span data-testid="admin-token">{adminToken || 'none'}</span>
      <span data-testid="admin-email">{admin?.email || 'none'}</span>
    </div>
  );
};

describe('Admin Management & Analytics UI Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Admin Session & Route Protection', () => {
    it('restores admin profile on refresh when valid token is stored', async () => {
      localStorage.setItem('adminToken', 'stored-admin-token');
      adminService.getMe.mockResolvedValueOnce({
        data: {
          admin: { email: 'admin@assessment.com', role: 'admin' },
        },
      });

      renderWithProviders(<AdminAuthStateInspector />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('admin-email')).toHaveTextContent('admin@assessment.com');
        expect(screen.getByTestId('admin-token')).toHaveTextContent('stored-admin-token');
      });
      expect(adminService.getMe).toHaveBeenCalledTimes(1);
    });

    it('clears stored admin token if token verification fails with 401', async () => {
      localStorage.setItem('adminToken', 'invalid-admin-token');
      const err = new Error('Invalid token');
      err.status = 401;
      adminService.getMe.mockRejectedValueOnce(err);

      renderWithProviders(<AdminAuthStateInspector />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('admin-token')).toHaveTextContent('none');
        expect(screen.getByTestId('admin-email')).toHaveTextContent('none');
      });
      expect(localStorage.getItem('adminToken')).toBeNull();
    });

    it('AdminProtectedRoute blocks unauthenticated users and redirects to /admin/login', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <AuthProvider>
            <Routes>
              <Route path="/admin/login" element={<div>Admin Login Screen</div>} />
              <Route element={<AdminProtectedRoute />}>
                <Route path="/admin/dashboard" element={<div>Protected Dashboard</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Login Screen')).toBeInTheDocument();
        expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument();
      });
    });
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
        expect(screen.getByText('19')).toBeInTheDocument(); // Highest score
      });
    });
  });

  describe('Question Management & Atomic Swap', () => {
    it('displays 10-active invariant status and allows opening atomic swap modal', async () => {
      adminService.getQuestions.mockResolvedValue({
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
            {
              _id: 'q-reserve',
              questionText: 'Reserve question text for replacement.',
              category: 'Quantitative',
              difficulty: 'Easy',
              correctOption: 'A',
              isActive: false,
              activeSlot: null,
              options: [
                { optionId: 'A', text: '10' },
                { optionId: 'B', text: '20' },
                { optionId: 'C', text: '30' },
                { optionId: 'D', text: '40' },
              ],
            },
          ],
          pagination: { page: 1, totalPages: 1, total: 2 },
        },
      });

      adminService.updateQuestionStatus.mockResolvedValueOnce({
        data: { success: true },
      });

      renderWithProviders(<QuestionManagementPage />);

      await waitFor(() => {
        expect(screen.getByText(/10 \/ 10 Active/i)).toBeInTheDocument();
        expect(screen.getByText(/Evaluate log base 10 of 1000/i)).toBeInTheDocument();
        expect(screen.getByText(/Slot #1/i)).toBeInTheDocument();
      });

      // Click swap icon button
      const swapBtn = screen.getByTitle(/Swap with inactive question/i);
      fireEvent.click(swapBtn);

      await waitFor(() => {
        expect(screen.getByText(/Atomic Question Replacement/i)).toBeInTheDocument();
      });
    });
  });

  describe('Candidate Management & File Exports', () => {
    it('renders candidates table and triggers CSV and Excel export downloads', async () => {
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

      adminService.exportCandidatesCsv.mockResolvedValueOnce({
        data: 'FullName,Email,Score\nAlice Smith,alice@example.com,16',
      });

      adminService.exportCandidatesExcel.mockResolvedValueOnce({
        data: '<?xml version="1.0"?><Workbook>...</Workbook>',
      });

      // Mock URL.createObjectURL and revokeObjectURL
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();

      renderWithProviders(<CandidateManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
        expect(screen.getByText('16 / 20')).toBeInTheDocument();
      });

      // Trigger CSV export
      const csvBtn = screen.getByRole('button', { name: /Export CSV/i });
      fireEvent.click(csvBtn);

      await waitFor(() => {
        expect(adminService.exportCandidatesCsv).toHaveBeenCalledTimes(1);
        expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
      });

      // Trigger Excel export
      const excelBtn = screen.getByRole('button', { name: /Export Excel/i });
      fireEvent.click(excelBtn);

      await waitFor(() => {
        expect(adminService.exportCandidatesExcel).toHaveBeenCalledTimes(1);
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
