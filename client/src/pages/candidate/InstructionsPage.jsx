import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import assessmentService from '../../services/assessmentService.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import {
  Clock,
  HelpCircle,
  Award,
  MinusCircle,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
} from 'lucide-react';

export function InstructionsPage() {
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchInstructions = async () => {
      try {
        const response = await assessmentService.getInstructions();
        if (isMounted) {
          setInstructions(response.data.instructions);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message || 'Failed to load assessment instructions.'
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInstructions();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStart = async () => {
    if (!agreed) return;
    setIsStarting(true);
    setError(null);
    try {
      await assessmentService.startAssessment();
      navigate('/assessment');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to start assessment. Please try again.'
      );
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullPage message="Loading assessment instructions..." />;
  }

  const {
    totalQuestions = 10,
    durationMinutes = 15,
    correctMarkWeight = 2,
    negativeMarkWeight = 1,
    passPercentage = 60,
    rules = [],
  } = instructions || {};

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Assessment Instructions
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Please review the test format, scoring rules, and guidelines carefully before beginning.
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-center">
          <HelpCircle className="w-5 h-5 mx-auto text-indigo-600 mb-1" />
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Questions</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{totalQuestions}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-center">
          <Clock className="w-5 h-5 mx-auto text-indigo-600 mb-1" />
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Duration</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{durationMinutes} Mins</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-center">
          <PlusCircle className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Correct</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">+{correctMarkWeight} Marks</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-center">
          <MinusCircle className="w-5 h-5 mx-auto text-rose-600 mb-1" />
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Wrong</p>
          <p className="text-xl font-bold text-rose-600 mt-0.5">-{negativeMarkWeight} Mark</p>
        </div>
      </div>

      {/* Rules & Guidelines */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Rules & Navigation Guidelines
          </CardTitle>
          <CardDescription>
            Passing Threshold: <span className="font-semibold text-slate-800">{passPercentage}%</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {rules.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Important Timer Policy:</p>
              <p className="mt-0.5">
                The timer is server-authoritative and runs continuously. Do not navigate away from the test tab. If time expires, your current answers will be submitted automatically.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-800">
              I have read, understood, and agree to all assessment instructions.
            </span>
          </label>

          <Button
            variant="primary"
            size="lg"
            disabled={!agreed || isStarting}
            isLoading={isStarting}
            onClick={handleStart}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Assessment
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default InstructionsPage;
