import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import assessmentService from '../../services/assessmentService.js';
import TimerDisplay from '../../components/common/TimerDisplay.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/common/Alert.jsx';
import Modal from '../../components/common/Modal.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Send,
  RotateCcw,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn.js';

export function AssessmentPage() {
  const navigate = useNavigate();

  // State
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [saveErrorMessage, setSaveErrorMessage] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSubmittedNotice, setAutoSubmittedNotice] = useState(false);

  const expiresAtRef = useRef(null);
  const clockSkewRef = useRef(0); // client-to-server clock drift in ms
  const requestSequenceRef = useRef({}); // per-snapshot monotonic sequence tracker
  const saveQueueRef = useRef({}); // per-snapshot serialized promise queue
  const isSubmittingRef = useRef(false);

  // Submit assessment handler (memoized for timer auto-submit)
  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSaveErrorMessage(null);

    try {
      await assessmentService.submitAssessment();
      setIsSubmitModalOpen(false);
      navigate('/result', { replace: true });
    } catch (err) {
      const errCode = err.raw?.code || err.response?.data?.code || err.code;
      const errMsg = err.response?.data?.message || err.message || '';
      const isFinalized =
        errCode === 'ATTEMPT_ALREADY_FINALIZED' ||
        errMsg.toLowerCase().includes('already finalized') ||
        errMsg.toLowerCase().includes('already submitted');

      if (isFinalized) {
        try {
          // Retrieve final result from backend before displaying
          await assessmentService.getResult();
          setIsSubmitModalOpen(false);
          navigate('/result', { replace: true });
          return;
        } catch {
          setSaveErrorMessage(
            'Assessment has been finalized, but results could not be retrieved. Please refresh.'
          );
        }
      } else if (err.response?.status === 400 || err.status === 400) {
        setSaveErrorMessage(errMsg || 'Validation error during submission.');
      } else if (err.response?.status === 409 || err.status === 409) {
        setSaveErrorMessage(errMsg || 'Submission conflict. Please try again.');
      } else {
        setSaveErrorMessage(
          errMsg || 'Network error submitting test. Please try again.'
        );
      }
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [navigate]);

  // Initialize or resume attempt
  useEffect(() => {
    let isMounted = true;

    const loadAttempt = async () => {
      try {
        const response = await assessmentService.getCurrentAttempt();
        if (!isMounted) return;

        const data = response.data?.attempt || response.attempt;

        // If already completed or expired, redirect to result
        if (data.status === 'completed' || data.status === 'expired') {
          navigate('/result', { replace: true });
          return;
        }

        setAttempt(data);
        setQuestions(data.questions || []);

        // Server-authoritative clock synchronization:
        // Calculate the difference between client wall-clock and server timestamp
        const serverNowMs = data.serverNow ? new Date(data.serverNow).getTime() : Date.now();
        const clientNowMs = Date.now();
        clockSkewRef.current = clientNowMs - serverNowMs;

        const expiresAtMs = new Date(data.expiresAt).getTime();
        expiresAtRef.current = expiresAtMs;

        const adjustedNowMs = Date.now() - clockSkewRef.current;
        const initialRemaining = Math.max(0, Math.floor((expiresAtMs - adjustedNowMs) / 1000));
        setRemainingSeconds(initialRemaining);
      } catch (err) {
        if (!isMounted) return;
        const msg = err.response?.data?.message || err.message || 'Failed to load assessment attempt.';
        setSaveErrorMessage(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAttempt();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Server-authoritative timer countdown with clock drift compensation
  useEffect(() => {
    if (!expiresAtRef.current) return;

    const interval = setInterval(() => {
      const adjustedNow = Date.now() - clockSkewRef.current;
      const diffSec = Math.max(0, Math.floor((expiresAtRef.current - adjustedNow) / 1000));
      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        clearInterval(interval);
        setAutoSubmittedNotice(true);
        handleSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [handleSubmit]);

  // Window unload guard
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isSubmittingRef.current) {
        e.preventDefault();
        e.returnValue = 'Assessment is in progress. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Save answer or review flag with serialized queue and sequence-based race condition protection
  const saveQuestionUpdate = (snapshotId, updates) => {
    if (Boolean(attempt) && remainingSeconds <= 0) return;

    // Increment request sequence for this snapshot to prevent out-of-order race conditions
    const currentSeq = (requestSequenceRef.current[snapshotId] || 0) + 1;
    requestSequenceRef.current[snapshotId] = currentSeq;

    setSavingStatus('saving');
    setSaveErrorMessage(null);

    // Optimistically update local state immediately
    setQuestions((prev) =>
      prev.map((q) =>
        q.snapshotId === snapshotId
          ? {
              ...q,
              ...updates,
              isAnswered:
                updates.selectedOption !== undefined
                  ? updates.selectedOption !== null
                  : q.isAnswered,
            }
          : q
      )
    );

    // Queue requests per snapshot to ensure in-order serialized dispatch
    const previousPromise = saveQueueRef.current[snapshotId] || Promise.resolve();
    const currentPromise = previousPromise
      .catch(() => {}) // Don't block subsequent requests if earlier one failed
      .then(async () => {
        try {
          await assessmentService.saveAnswer(snapshotId, {
            ...updates,
            sequence: currentSeq,
          });

          // Only transition to "saved" if this request is still the latest one for this question
          if (requestSequenceRef.current[snapshotId] === currentSeq) {
            setSavingStatus('saved');
            setTimeout(() => {
              setSavingStatus((curr) => (curr === 'saved' ? 'idle' : curr));
            }, 2000);
          }
        } catch (err) {
          // If a newer request was dispatched while this request was in flight, do not report stale error
          if (requestSequenceRef.current[snapshotId] === currentSeq) {
            setSavingStatus('error');
            setSaveErrorMessage(
              err.response?.data?.message || err.message || 'Failed to save your answer. Check connection.'
            );
          }
        }
      });

    saveQueueRef.current[snapshotId] = currentPromise;
  };

  const isTimeExpired = Boolean(attempt) && remainingSeconds <= 0;

  const handleSelectOption = (optionId) => {
    const currentQ = questions[currentIndex];
    if (!currentQ || isTimeExpired) return;
    saveQuestionUpdate(currentQ.snapshotId, { selectedOption: optionId });
  };

  const handleClearResponse = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ || isTimeExpired) return;
    saveQuestionUpdate(currentQ.snapshotId, { selectedOption: null });
  };

  const handleToggleReview = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ || isTimeExpired) return;
    saveQuestionUpdate(currentQ.snapshotId, {
      isMarkedForReview: !currentQ.isMarkedForReview,
    });
  };

  if (isLoading) {
    return <LoadingSpinner fullPage message="Initializing assessment environment..." />;
  }

  const currentQ = questions[currentIndex] || {};
  const answeredCount = questions.filter((q) => q.isAnswered).length;
  const unansweredCount = questions.length - answeredCount;
  const markedCount = questions.filter((q) => q.isMarkedForReview).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Auto-submit overlay if time has expired */}
      {autoSubmittedNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full text-center shadow-2xl">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Time Has Expired!</h3>
            <p className="text-sm text-slate-600 mt-2">
              Your assessment time has completed. We are automatically finalizing and scoring your assessment now...
            </p>
          </div>
        </div>
      )}

      {/* Top Floating Assessment Bar */}
      <div className="sticky top-16 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Question {currentIndex + 1} of {questions.length}
            </div>

            {/* Saving status indicator */}
            <div className="text-xs flex items-center gap-1.5 font-medium">
              {savingStatus === 'saving' && (
                <span className="text-amber-600 animate-pulse">Autosaving...</span>
              )}
              {savingStatus === 'saved' && (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              {savingStatus === 'error' && (
                <span className="text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Save failed!
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TimerDisplay remainingSeconds={remainingSeconds} size="md" />

            <Button
              variant="success"
              size="sm"
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={isSubmitting || isTimeExpired}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Submit Test
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout Grid: Question on left, Palette on right */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question & Answers (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          {saveErrorMessage && (
            <Alert
              variant="error"
              title="Connection Alert"
              className="mb-4"
              onClose={() => setSaveErrorMessage(null)}
            >
              {saveErrorMessage}
            </Alert>
          )}

          {isTimeExpired && (
            <Alert
              variant="warning"
              title="Assessment Concluded"
              className="mb-4"
            >
              Assessment time has concluded. Inputs are locked while finalization completes.
            </Alert>
          )}

          <div>
            {/* Header: Category & Difficulty */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="md">
                  {currentQ.category}
                </Badge>
                <Badge
                  variant={
                    currentQ.difficulty === 'Easy'
                      ? 'success'
                      : currentQ.difficulty === 'Medium'
                      ? 'warning'
                      : 'error'
                  }
                  size="md"
                >
                  {currentQ.difficulty}
                </Badge>
              </div>

              <button
                type="button"
                disabled={isTimeExpired}
                onClick={handleToggleReview}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border',
                  currentQ.isMarkedForReview
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
                  isTimeExpired && 'opacity-50 cursor-not-allowed pointer-events-none'
                )}
              >
                <Bookmark
                  className={cn(
                    'w-3.5 h-3.5',
                    currentQ.isMarkedForReview && 'fill-amber-600 text-amber-600'
                  )}
                />
                {currentQ.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
              </button>
            </div>

            {/* Question Text */}
            <div className="mb-6">
              <h2 className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                <span className="font-bold mr-2 text-indigo-600">
                  Q{currentIndex + 1}.
                </span>
                {currentQ.questionText}
              </h2>
            </div>

            {/* Options List */}
            <div className="space-y-3 mb-6">
              {(currentQ.options || []).map((opt) => {
                const isSelected = currentQ.selectedOption === opt.optionId;
                return (
                  <label
                    key={opt.optionId}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isTimeExpired) handleSelectOption(opt.optionId);
                    }}
                    className={cn(
                      'flex items-center gap-3.5 p-4 rounded-xl border transition-all select-none',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50',
                      isTimeExpired ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQ.snapshotId}`}
                      checked={isSelected}
                      disabled={isTimeExpired}
                      readOnly
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors',
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      )}
                    >
                      {opt.optionId}
                    </div>
                    <span className="text-sm font-medium text-slate-800 leading-normal">
                      {opt.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearResponse}
              disabled={!currentQ.isAnswered || isTimeExpired}
              className="text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Clear Selection
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => prev - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <Button
                variant={currentIndex === questions.length - 1 ? 'primary' : 'outline'}
                size="md"
                onClick={() => {
                  if (currentIndex < questions.length - 1) {
                    setCurrentIndex((prev) => prev + 1);
                  } else {
                    setIsSubmitModalOpen(true);
                  }
                }}
              >
                {currentIndex === questions.length - 1 ? 'Review & Submit' : 'Next'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Question Palette & Status Summary (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Question Palette
            </h3>

            {/* Palette Grid */}
            <div className="grid grid-cols-5 gap-2.5 mb-6">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAns = q.isAnswered;
                const isRev = q.isMarkedForReview;

                let chipStyle = 'bg-slate-100 text-slate-700 border-slate-200'; // unanswered default

                if (isAns && isRev) {
                  chipStyle = 'bg-purple-600 text-white border-purple-700'; // answered & review
                } else if (isAns) {
                  chipStyle = 'bg-emerald-600 text-white border-emerald-700'; // answered
                } else if (isRev) {
                  chipStyle = 'bg-amber-500 text-white border-amber-600'; // marked review only
                }

                return (
                  <button
                    key={q.snapshotId || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      'h-10 rounded-xl font-bold text-sm border flex items-center justify-center transition-all',
                      chipStyle,
                      isCurrent && 'ring-2 ring-indigo-600 ring-offset-2 scale-105'
                    )}
                    aria-label={`Go to question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block" />
                  Answered
                </span>
                <span className="font-semibold text-slate-800">{answeredCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block" />
                  Marked for Review
                </span>
                <span className="font-semibold text-slate-800">{markedCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-3.5 h-3.5 rounded bg-purple-600 inline-block" />
                  Answered & Marked
                </span>
                <span className="font-semibold text-slate-800">
                  {questions.filter((q) => q.isAnswered && q.isMarkedForReview).length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 inline-block" />
                  Unanswered
                </span>
                <span className="font-semibold text-slate-800">{unansweredCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => !isSubmitting && setIsSubmitModalOpen(false)}
        title="Confirm Assessment Submission"
        description="Are you sure you want to finalize and submit your assessment?"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={isSubmitting}
            >
              Return to Test
            </Button>
            <Button
              variant="success"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Confirm Submission
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-800">Answered</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{answeredCount}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-700">Unanswered</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{unansweredCount}</p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-xs font-semibold text-amber-800">Marked</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{markedCount}</p>
            </div>
          </div>

          {unansweredCount > 0 && (
            <Alert variant="warning" title="Unanswered Questions Remaining">
              You have {unansweredCount} unanswered questions. Unattempted questions carry 0 marks, but you cannot change your answers after submission.
            </Alert>
          )}

          <p className="text-xs text-slate-500">
            Once submitted, your responses will be evaluated instantly against the official marking criteria (+2 correct, -1 wrong).
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default AssessmentPage;
