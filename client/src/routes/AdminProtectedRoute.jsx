import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export function AdminProtectedRoute() {
  const { adminToken, isLoadingAdmin } = useAuth();
  const location = useLocation();

  if (isLoadingAdmin) {
    return <LoadingSpinner fullPage message="Verifying administrative credentials..." />;
  }

  if (!adminToken) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default AdminProtectedRoute;
