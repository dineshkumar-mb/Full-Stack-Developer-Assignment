import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Award, User, LogOut } from 'lucide-react';
import Button from '../components/common/Button.jsx';

export function CandidateLayout() {
  const { candidate, logoutCandidate } = useAuth();
  const location = useLocation();

  // In active assessment, hide navigation buttons so candidate is not distracted
  const isAssessmentPage = location.pathname === '/assessment';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <Link to="/" className="text-lg font-bold text-slate-900 tracking-tight hover:text-indigo-600 transition-colors">
                Aptitude Assessment
              </Link>
              <p className="text-xs text-slate-500 hidden sm:block">
                Standardized Evaluation Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {candidate && !isAssessmentPage && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200">
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 max-w-[150px] sm:max-w-[200px] truncate">
                    {candidate.fullName}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logoutCandidate}
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            )}
            {!candidate && !isAssessmentPage && (
              <Link
                to="/admin/login"
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Admin Portal &rarr;
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Minimal Footer */}
      {!isAssessmentPage && (
        <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400">
            Aptitude Assessment Platform &bull; Full Stack Assessment Engine &bull; Built with React & Node.js
          </div>
        </footer>
      )}
    </div>
  );
}

export default CandidateLayout;
