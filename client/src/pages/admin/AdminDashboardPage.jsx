import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import {
  Users,
  CheckCircle2,
  Clock,
  Award,
  TrendingUp,
  Percent,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

export function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  const fetchDashboardData = async (params = {}) => {
    try {
      setError(null);
      const [sumRes, anaRes] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getDashboardAnalytics(params),
      ]);
      setSummary(sumRes.data.summary);
      setAnalytics(anaRes.data.analytics);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load dashboard metrics and analytics.'
      );
    } finally {
      setIsLoading(false);
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    setIsFiltering(true);
    const params = {};
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;
    fetchDashboardData(params);
  };

  const handleResetFilter = () => {
    setFromDate('');
    setToDate('');
    setIsFiltering(true);
    fetchDashboardData();
  };

  if (isLoading) {
    return <LoadingSpinner fullPage message="Aggregating assessment analytics..." />;
  }

  // Summary Metrics
  const {
    totalCandidates = 0,
    completedAssessments = 0,
    inProgressAssessments = 0,
    notStartedCandidates = 0,
    averageScore = 0,
    passRate = 0,
    highestScore = 0,
    lowestScore = 0,
  } = summary || {};

  // Analytics datasets
  const passFailData = [
    { name: 'Passed', value: analytics?.passFailDistribution?.passed || 0, color: '#10b981' },
    { name: 'Failed', value: analytics?.passFailDistribution?.failed || 0, color: '#f43f5e' },
  ];

  const scoreDistData = analytics?.scoreDistribution || [];
  const completionTrendData = analytics?.completionTrend || [];
  const categoryPerfData = analytics?.categoryPerformance || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Executive Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time candidate metrics, pass rates, and evaluation performance
          </p>
        </div>

        {/* Date Filter Bar */}
        <form
          onSubmit={handleApplyFilter}
          className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs"
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Range:</span>
          </div>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
            aria-label="From date"
          />

          <span className="text-xs text-slate-400">to</span>

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
            aria-label="To date"
          />

          <Button type="submit" variant="primary" size="sm" isLoading={isFiltering}>
            Apply
          </Button>

          {(fromDate || toDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilter}
              title="Reset date filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </form>
      </div>

      {error && (
        <Alert variant="error" title="Dashboard Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Metric Cards Grid (8 metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Candidates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Candidates
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {totalCandidates}
          </p>
          <p className="text-xs text-slate-500 mt-1">All registered candidates</p>
        </div>

        {/* Completed Assessments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {completedAssessments}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Evaluated & scored</p>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Progress
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {inProgressAssessments}
          </p>
          <p className="text-xs text-amber-600 font-medium mt-1">Active assessments</p>
        </div>

        {/* Not Started */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Not Started
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {notStartedCandidates}
          </p>
          <p className="text-xs text-slate-500 mt-1">Pending test start</p>
        </div>

        {/* Pass Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pass Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">
            {passRate}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Met qualifying cutoff</p>
        </div>

        {/* Average Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {averageScore} <span className="text-sm font-normal text-slate-500">/ 20</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Across all completions</p>
        </div>

        {/* Highest Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Highest Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 mt-2">
            {highestScore} <span className="text-sm font-normal text-slate-500">/ 20</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Top candidate performance</p>
        </div>

        {/* Lowest Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lowest Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {lowestScore} <span className="text-sm font-normal text-slate-500">/ 20</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Includes negative marking</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass vs Fail Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pass vs. Fail Distribution</CardTitle>
            <CardDescription>Overall candidate completion outcome</CardDescription>
          </CardHeader>
          <CardContent>
            {completedAssessments === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-slate-400">
                No completed assessments to display.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={passFailData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {passFailData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Distribution</CardTitle>
            <CardDescription>Number of candidates grouped by net score ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="range" textAnchor="end" height={40} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Candidates" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Completion Timeline Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assessment Submissions Over Time</CardTitle>
            <CardDescription>Daily assessment completion activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Completed Tests"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category-Wise Accuracy</CardTitle>
            <CardDescription>Candidate accuracy percentage across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPerfData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
                  <Bar dataKey="accuracy" name="Accuracy %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
