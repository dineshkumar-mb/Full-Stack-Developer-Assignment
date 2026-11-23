import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import assessmentService from '../../services/assessmentService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  PlusCircle,
  MinusCircle,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { cn } from '../../utils/cn.js';

export function ResultPage() {
  const navigate = useNavigate();
  const { logoutCandidate } = useAuth();
  const [resultData, setResultData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchResult = async () => {
      try {
        const response = await assessmentService.getResult();
        if (isMounted) {
          setResultData(response.data.result);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message || 'Failed to retrieve assessment results.'
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchResult();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleExit = () => {
    logoutCandidate();
    navigate('/', { replace: true });
  };

  if (isLoading) {
    return <LoadingSpinner fullPage message="Compiling official assessment results..." />;
  }

  if (error) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto">
        <Alert variant="error" title="Result Error" className="mb-4">
          {error}
        </Alert>
        <Button variant="outline" onClick={() => navigate('/')} className="w-full">
          Return to Home
        </Button>
      </div>
    );
  }

  const { candidate, scoreSummary } = resultData || {};
  const {
    totalQuestions = 10,
    correctCount = 0,
    incorrectCount = 0,
    unattemptedCount = 0,
    marksGained = 0,
    marksDeducted = 0,
    netScore = 0,
    scaledScoreOutOf10 = 0,
    percentage = 0,
    passPercentageCutoff = 60,
    isPassed = false,
    timeTakenSeconds = 0,
    submissionType = 'manual',
  } = scoreSummary || {};

  const timeMinutes = Math.floor(timeTakenSeconds / 60);
  const timeSeconds = timeTakenSeconds % 60;

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
      {/* Result Status Banner */}
      <div
        className={cn(
          'p-6 sm:p-8 rounded-2xl border text-center mb-8 shadow-sm',
          isPassed
            ? 'bg-gradient-to-b from-emerald-50 to-white border-emerald-200'
            : 'bg-gradient-to-b from-rose-50 to-white border-rose-200'
        )}
      >
        <div
          className={cn(
            'w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-md',
            isPassed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          )}
        >
          {isPassed ? <CheckCircle2 className="w-9 h-9" /> : <XCircle className="w-9 h-9" />}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isPassed ? 'Assessment Passed!' : 'Assessment Completed'}
        </h1>

        <p className="text-sm font-medium text-slate-600 mt-2 max-w-md mx-auto">
          {isPassed
            ? `Congratulations, ${candidate?.fullName || 'Candidate'}! You have achieved the qualifying pass threshold.`
            : `Thank you for completing the test, ${candidate?.fullName || 'Candidate'}. Your score is below the ${passPercentageCutoff}% passing threshold.`}
        </p>

        {/* Large Score Metric */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
          <div className="text-center px-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Net Score
            </span>
            <p className="text-4xl font-extrabold text-slate-900 mt-0.5">
              {netScore} <span className="text-lg font-normal text-slate-500">/ 20</span>
            </p>
          </div>

          <div className="h-10 w-px bg-slate-200 hidden sm:block" />

          <div className="text-center px-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Percentage
            </span>
            <p
              className={cn(
                'text-4xl font-extrabold mt-0.5',
                isPassed ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {percentage}%
            </p>
          </div>

          <div className="h-10 w-px bg-slate-200 hidden sm:block" />

          <div className="text-center px-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Scaled Score
            </span>
            <p className="text-4xl font-extrabold text-indigo-600 mt-0.5">
              {scaledScoreOutOf10} <span className="text-lg font-normal text-slate-500">/ 10</span>
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Performance Breakdown
          </CardTitle>
          <CardDescription>
            Submission Type:{' '}
            <span className="font-semibold text-slate-800 capitalize">
              {submissionType.replace('_', ' ')}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Correct
              </div>
              <p className="text-2xl font-bold text-slate-900">{correctCount}</p>
              <p className="text-xs text-emerald-700 font-medium mt-1">+{marksGained} Marks</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase mb-1">
                <XCircle className="w-4 h-4 text-rose-600" /> Wrong
              </div>
              <p className="text-2xl font-bold text-slate-900">{incorrectCount}</p>
              <p className="text-xs text-rose-700 font-medium mt-1">-{marksDeducted} Marks</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase mb-1">
                <HelpCircle className="w-4 h-4 text-slate-500" /> Unattempted
              </div>
              <p className="text-2xl font-bold text-slate-900">{unattemptedCount}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">0 Marks</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase mb-1">
                <Clock className="w-4 h-4 text-indigo-600" /> Time Taken
              </div>
              <p className="text-xl font-bold text-slate-900">
                {timeMinutes}m {timeSeconds}s
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Total: {totalQuestions} Questions
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-center pt-2">
          <Button variant="primary" size="lg" onClick={handleExit} className="w-full sm:w-auto">
            <LogOut className="w-4 h-4 mr-2" />
            Finish & Exit Assessment
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default ResultPage;
