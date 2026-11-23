import React, { createContext, useContext, useState, useEffect } from 'react';
import candidateService from '../services/candidateService.js';
import adminService from '../services/adminService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [candidateToken, setCandidateToken] = useState(() => localStorage.getItem('candidateToken'));
  const [candidate, setCandidate] = useState(null);
  const [isLoadingCandidate, setIsLoadingCandidate] = useState(() => Boolean(localStorage.getItem('candidateToken')));

  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken'));
  const [admin, setAdmin] = useState(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(() => Boolean(localStorage.getItem('adminToken')));

  // Initialize and verify stored sessions on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedCandToken = localStorage.getItem('candidateToken');
      const storedAdmToken = localStorage.getItem('adminToken');

      const promises = [];

      if (storedCandToken) {
        promises.push(
          candidateService
            .getProfile()
            .then((res) => {
              if (!isMounted) return;
              const profile = res.data?.candidate || res.candidate;
              if (profile) setCandidate(profile);
            })
            .catch(() => {
              if (!isMounted) return;
              localStorage.removeItem('candidateToken');
              setCandidateToken(null);
              setCandidate(null);
            })
            .finally(() => {
              if (isMounted) setIsLoadingCandidate(false);
            })
        );
      } else {
        setIsLoadingCandidate(false);
      }

      if (storedAdmToken) {
        promises.push(
          adminService
            .getMe()
            .then((res) => {
              if (!isMounted) return;
              const adminProfile = res.data?.admin || res.admin;
              if (adminProfile) setAdmin(adminProfile);
            })
            .catch(() => {
              if (!isMounted) return;
              localStorage.removeItem('adminToken');
              setAdminToken(null);
              setAdmin(null);
            })
            .finally(() => {
              if (isMounted) setIsLoadingAdmin(false);
            })
        );
      } else {
        setIsLoadingAdmin(false);
      }

      await Promise.allSettled(promises);
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginCandidate = (token, candidateData) => {
    localStorage.setItem('candidateToken', token);
    setCandidateToken(token);
    setCandidate(candidateData);
    setIsLoadingCandidate(false);
  };

  const logoutCandidate = () => {
    localStorage.removeItem('candidateToken');
    setCandidateToken(null);
    setCandidate(null);
    setIsLoadingCandidate(false);
  };

  const loginAdmin = (token, adminData) => {
    localStorage.setItem('adminToken', token);
    setAdminToken(token);
    setAdmin(adminData);
    setIsLoadingAdmin(false);
  };

  const logoutAdmin = () => {
    try {
      adminService.logout().catch(() => {});
    } finally {
      localStorage.removeItem('adminToken');
      setAdminToken(null);
      setAdmin(null);
      setIsLoadingAdmin(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        candidate,
        candidateToken,
        isCandidateAuthenticated: Boolean(candidateToken),
        isLoadingCandidate,
        loginCandidate,
        logoutCandidate,
        admin,
        adminToken,
        isAdminAuthenticated: Boolean(adminToken),
        isLoadingAdmin,
        loginAdmin,
        logoutAdmin,
        loading: isLoadingCandidate || isLoadingAdmin,
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
