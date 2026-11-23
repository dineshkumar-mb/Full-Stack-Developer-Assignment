import React, { createContext, useContext, useState, useEffect } from 'react';
import candidateService from '../services/candidateService.js';
import adminService from '../services/adminService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [candidateToken, setCandidateToken] = useState(() => localStorage.getItem('candidateToken'));
  const [candidate, setCandidate] = useState(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken'));
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify stored sessions on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedCandToken = localStorage.getItem('candidateToken');
      const storedAdmToken = localStorage.getItem('adminToken');

      const promises = [];

      if (storedCandToken) {
        promises.push(
          candidateService
            .getProfile()
            .then((res) => {
              if (res.candidate) setCandidate(res.candidate);
            })
            .catch(() => {
              localStorage.removeItem('candidateToken');
              setCandidateToken(null);
              setCandidate(null);
            })
        );
      }

      if (storedAdmToken) {
        promises.push(
          adminService
            .getMe()
            .then((res) => {
              if (res.admin) setAdmin(res.admin);
            })
            .catch(() => {
              localStorage.removeItem('adminToken');
              setAdminToken(null);
              setAdmin(null);
            })
        );
      }

      await Promise.allSettled(promises);
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const loginCandidate = (token, candidateData) => {
    localStorage.setItem('candidateToken', token);
    setCandidateToken(token);
    setCandidate(candidateData);
  };

  const logoutCandidate = () => {
    localStorage.removeItem('candidateToken');
    setCandidateToken(null);
    setCandidate(null);
  };

  const loginAdmin = (token, adminData) => {
    localStorage.setItem('adminToken', token);
    setAdminToken(token);
    setAdmin(adminData);
  };

  const logoutAdmin = () => {
    try {
      adminService.logout().catch(() => {});
    } finally {
      localStorage.removeItem('adminToken');
      setAdminToken(null);
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        candidate,
        candidateToken,
        isCandidateAuthenticated: Boolean(candidateToken),
        loginCandidate,
        logoutCandidate,
        admin,
        adminToken,
        isAdminAuthenticated: Boolean(adminToken),
        loginAdmin,
        logoutAdmin,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
