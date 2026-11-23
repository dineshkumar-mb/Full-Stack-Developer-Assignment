import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CandidateLayout from '../layouts/CandidateLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import CandidateProtectedRoute from './CandidateProtectedRoute.jsx';
import AdminProtectedRoute from './AdminProtectedRoute.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

// Lazy-loaded Candidate Pages
const RegisterPage = lazy(() => import('../pages/candidate/RegisterPage.jsx'));
const InstructionsPage = lazy(() => import('../pages/candidate/InstructionsPage.jsx'));
const AssessmentPage = lazy(() => import('../pages/candidate/AssessmentPage.jsx'));
const ResultPage = lazy(() => import('../pages/candidate/ResultPage.jsx'));

// Lazy-loaded Admin Pages
const AdminLoginPage = lazy(() => import('../pages/admin/AdminLoginPage.jsx'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage.jsx'));
const QuestionManagementPage = lazy(() => import('../pages/admin/QuestionManagementPage.jsx'));
const CandidateManagementPage = lazy(() => import('../pages/admin/CandidateManagementPage.jsx'));
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage.jsx'));

// Lazy-loaded 404
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));

const PageFallback = () => <LoadingSpinner fullPage message="Loading interface..." />;

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
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
    </Suspense>
  );
}

export default AppRoutes;
