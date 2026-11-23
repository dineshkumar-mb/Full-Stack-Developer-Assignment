import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <header className="border-b bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                AA
              </div>
              <span className="font-semibold text-lg text-slate-900 tracking-tight">
                Aptitude Assessment Platform
              </span>
            </div>
            <nav className="flex items-center space-x-4 text-sm font-medium">
              <Link to="/" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Candidate Portal
              </Link>
              <Link to="/admin/login" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Admin Portal
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Routes>
            <Route
              path="/"
              element={
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-xl mx-auto text-center space-y-4">
                  <h1 className="text-2xl font-bold text-slate-900">
                    Aptitude Assessment Platform
                  </h1>
                  <p className="text-slate-600 text-sm">
                    Phase 1 Environment Initialized. Candidate and Admin modules are scaffolded and ready for implementation in subsequent phases.
                  </p>
                </div>
              }
            />
            <Route
              path="/admin/login"
              element={
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-md mx-auto text-center space-y-4">
                  <h1 className="text-xl font-bold text-slate-900">
                    Admin Portal
                  </h1>
                  <p className="text-slate-600 text-sm">
                    Authentication module will be connected in Phase 3.
                  </p>
                </div>
              }
            />
          </Routes>
        </main>

        <footer className="border-t bg-white py-4 text-center text-xs text-slate-500">
          &copy; 2026 Aptitude Assessment System &middot; Phase 1 Architecture & Setup
        </footer>
      </div>
    </Router>
  );
}

export default App;
