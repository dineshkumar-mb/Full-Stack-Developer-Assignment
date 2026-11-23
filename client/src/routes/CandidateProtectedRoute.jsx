import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export function CandidateProtectedRoute() {
  const { candidateToken, isLoadingCandidate } = useAuth();
  const location = useLocation();

  if (isLoadingCandidate) {
    return <LoadingSpinner fullPage message="Verifying session..." />;
  }

  if (!candidateToken) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default CandidateProtectedRoute;
