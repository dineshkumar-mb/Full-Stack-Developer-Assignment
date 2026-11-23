import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Select from '../../components/common/Select.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/common/Alert.jsx';
import Modal from '../../components/common/Modal.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import {
  Users,
  Search,
  FileSpreadsheet,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Award,
} from 'lucide-react';

export function CandidateManagementPage() {
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [passFilter, setPassFilter] = useState('');

  // Assessment Details Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [assessmentDetails, setAssessmentDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Export loading state
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const fetchCandidates = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = { page, limit: 10 };
        if (search) params.search = search;
        if (statusFilter) params.assessmentStatus = statusFilter;
        if (passFilter !== '') params.isPassed = passFilter === 'true';

        const response = await adminService.getCandidates(params);
        setCandidates(response.data.candidates);
        setPagination(
          response.data.pagination || {
            page: 1,
            totalPages: 1,
            total: response.data.candidates.length,
          }
        );
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load candidates list.');
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, passFilter]
  );

  useEffect(() => {
    fetchCandidates(1);
  }, [fetchCandidates]);

  // Open Candidate Assessment Details
  const handleViewAssessment = async (cand) => {
    setSelectedCandidate(cand);
    setIsDetailOpen(true);
    setIsLoadingDetails(true);
    setAssessmentDetails(null);
    try {
      const candId = cand._id || cand.id;
      const res = await adminService.getCandidateAssessment(candId);
      setAssessmentDetails(res.data.assessment);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to load candidate assessment details.'
      );
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Export Handlers
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.assessmentStatus = statusFilter;
      if (passFilter !== '') params.isPassed = passFilter === 'true';

      const response = await adminService.exportCandidatesCsv(params);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `candidates_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('CSV export failed. Please try again.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.assessmentStatus = statusFilter;
      if (passFilter !== '') params.isPassed = passFilter === 'true';

      const response = await adminService.exportCandidatesExcel(params);
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/vnd.ms-excel' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `candidates_export_${new Date().toISOString().slice(0, 10)}.xls`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Excel export failed. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Candidate Performance Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor registrations, test attempts, question-level scores, and export records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            isLoading={isExportingCsv}
          >
            <FileText className="w-4 h-4 mr-1.5 text-slate-600" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            isLoading={isExportingExcel}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Export Excel (.xls)
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Action Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <Select
              placeholder="All Attempt Statuses"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 text-xs sm:text-sm"
              options={[
                { value: '', label: 'All Attempt Statuses' },
                { value: 'not_started', label: 'Not Started' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'timed_out', label: 'Timed Out' },
              ]}
            />

            <Select
              placeholder="All Pass / Fail Outcomes"
              value={passFilter}
              onChange={(e) => setPassFilter(e.target.value)}
              className="py-1.5 text-xs sm:text-sm"
              options={[
                { value: '', label: 'All Outcomes' },
                { value: 'true', label: 'Passed Only' },
                { value: 'false', label: 'Failed Only' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Candidate</th>
                <th className="px-4 py-3.5">Contact & Qualification</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Score</th>
                <th className="px-4 py-3.5">Outcome</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <LoadingSpinner message="Loading candidates..." />
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    No candidates found matching the selected filters.
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => {
                  const candId = cand._id || cand.id;
                  const attemptStatus = cand.assessmentStatus || (cand.hasAttempted ? 'completed' : 'not_started');
                  const score = cand.scoreSummary?.netScore ?? cand.netScore;
                  const isPassed = cand.scoreSummary?.isPassed ?? cand.isPassed;

                  return (
                    <tr key={candId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{cand.fullName}</p>
                        <p className="text-xs text-slate-500">{cand.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <p>{cand.phone || cand.phoneNumber || 'N/A'}</p>
                        <p className="text-slate-400">{cand.qualification || cand.highestQualification}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge
                          variant={
                            attemptStatus === 'completed'
                              ? 'success'
                              : attemptStatus === 'in_progress'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {attemptStatus.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900">
                        {score !== undefined && score !== null ? `${score} / 20` : '—'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isPassed === true ? (
                          <Badge variant="success" size="sm">
                            Passed
                          </Badge>
                        ) : isPassed === false ? (
                          <Badge variant="error" size="sm">
                            Failed
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                        {new Date(cand.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAssessment(cand)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={10}
          onPageChange={(page) => fetchCandidates(page)}
        />
      </Card>

      {/* Modal: Full Candidate Assessment Details */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Candidate Assessment: ${selectedCandidate?.fullName || ''}`}
        description={`Email: ${selectedCandidate?.email || ''}`}
        maxWidth="max-w-4xl"
      >
        {isLoadingDetails ? (
          <div className="py-12">
            <LoadingSpinner message="Fetching candidate assessment transcript..." />
          </div>
        ) : !assessmentDetails ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            This candidate has not started an assessment yet.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Status</span>
                <p className="text-base font-bold text-slate-900 capitalize mt-0.5">
                  {assessmentDetails.status?.replace('_', ' ')}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Net Score</span>
                <p className="text-base font-bold text-indigo-600 mt-0.5">
                  {assessmentDetails.scoreSummary?.netScore ?? '—'} / 20
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Percentage</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {assessmentDetails.scoreSummary?.percentage ?? '—'}%
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Result</span>
                <p className="mt-0.5">
                  {assessmentDetails.scoreSummary?.isPassed ? (
                    <Badge variant="success" size="sm">Passed</Badge>
                  ) : (
                    <Badge variant="error" size="sm">Failed</Badge>
                  )}
                </p>
              </div>
            </div>

            {/* Question Breakdown Table */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Question-by-Question Evaluation Transcript
              </h4>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {(assessmentDetails.questionSnapshots || []).map((snapshot, idx) => {
                  const isCorrect = snapshot.isCorrect;
                  const isUnattempted = !snapshot.candidateAnswer;

                  return (
                    <div
                      key={snapshot._id || idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          Question {idx + 1} &bull; {snapshot.category} ({snapshot.difficulty})
                        </span>
                        {isUnattempted ? (
                          <Badge variant="default" size="sm">Unattempted (0)</Badge>
                        ) : isCorrect ? (
                          <Badge variant="success" size="sm">Correct (+2)</Badge>
                        ) : (
                          <Badge variant="error" size="sm">Incorrect (-1)</Badge>
                        )}
                      </div>

                      <p className="text-slate-700 text-sm font-medium">{snapshot.questionText}</p>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 bg-slate-50 rounded border border-slate-200">
                          <span className="text-slate-500">Candidate Answer: </span>
                          <span className="font-bold text-slate-900">
                            {snapshot.candidateAnswer || 'None'}
                          </span>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                          <span className="text-emerald-700">Official Correct Option: </span>
                          <span className="font-bold text-emerald-900">
                            {snapshot.correctOption}
                          </span>
                        </div>
                      </div>

                      {snapshot.explanation && (
                        <p className="text-slate-500 italic pt-1">
                          Explanation: {snapshot.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CandidateManagementPage;
