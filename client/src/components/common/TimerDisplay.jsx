import React from 'react';
import { cn } from '../../utils/cn.js';
import { Clock, AlertTriangle } from 'lucide-react';

/**
 * TimerDisplay component
 * Formats seconds into MM:SS.
 * Highlights:
 * - Default: slate / indigo badge
 * - Amber (< 180 seconds / 3 minutes): warning state
 * - Red pulsing (< 60 seconds / 1 minute): critical state
 */
export function TimerDisplay({
  remainingSeconds = 0,
  className,
  showIcon = true,
  size = 'md',
}) {
  const safeSeconds = Math.max(0, Math.floor(remainingSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isCritical = safeSeconds <= 60 && safeSeconds > 0;
  const isWarning = safeSeconds <= 180 && safeSeconds > 60;
  const isExpired = safeSeconds === 0;

  const sizeClasses = {
    sm: 'text-sm px-2.5 py-1',
    md: 'text-base font-semibold px-3 py-1.5',
    lg: 'text-xl font-bold px-4 py-2',
  };

  const getStyle = () => {
    if (isExpired) {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }
    if (isCritical) {
      return 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse';
    }
    if (isWarning) {
      return 'bg-amber-50 text-amber-700 border-amber-300';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${minutes} minutes and ${seconds} seconds`}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border font-mono tracking-wider tabular-nums transition-colors',
        sizeClasses[size],
        getStyle(),
        className
      )}
    >
      {showIcon && (
        isCritical || isWarning ? (
          <AlertTriangle className={cn('w-4 h-4 shrink-0', isCritical ? 'text-rose-600' : 'text-amber-600')} />
        ) : (
          <Clock className="w-4 h-4 shrink-0 text-indigo-600" />
        )
      )}
      <span>{formattedTime}</span>
    </div>
  );
}

export default TimerDisplay;
