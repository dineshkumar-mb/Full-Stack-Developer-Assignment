import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CandidateLayout from '../layouts/CandidateLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import CandidateProtectedRoute from './CandidateProtectedRoute.jsx';
import AdminProtectedRoute from './AdminProtectedRoute.jsx';

// Candidate Pages
import RegisterPage from '../pages/candidate/RegisterPage.jsx';
import InstructionsPage from '../pages/candidate/InstructionsPage.jsx';
import AssessmentPage from '../pages/candidate/AssessmentPage.jsx';
import ResultPage from '../pages/candidate/ResultPage.jsx';

// Admin Pages
import AdminLoginPage from '../pages/admin/AdminLoginPage.jsx';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import QuestionManagementPage from '../pages/admin/QuestionManagementPage.jsx';
import CandidateManagementPage from '../pages/admin/CandidateManagementPage.jsx';
import SettingsPage from '../pages/admin/SettingsPage.jsx';

// 404
import NotFoundPage from '../pages/NotFoundPage.jsx';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Candidate Portal */}
      <Route element={<CandidateLayout />}>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Candidate Protected Flow */}
        <Route element={<CandidateProtectedRoute />}>
          <Route path="/instructions" element={<InstructionsPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Route>
      </Route>

      {/* Admin Auth */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Admin Protected Portal */}
      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/questions" element={<QuestionManagementPage />} />
          <Route path="/admin/candidates" element={<CandidateManagementPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
