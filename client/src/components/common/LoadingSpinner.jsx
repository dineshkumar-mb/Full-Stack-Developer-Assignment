import React from 'react';
import { cn } from '../../utils/cn.js';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({
  className,
  size = 'md',
  message,
  fullPage = false,
  ...props
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  const spinner = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className
      )}
      role="status"
      aria-live="polite"
      {...props}
    >
      <Loader2
        className={cn('animate-spin text-indigo-600', sizes[size])}
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm font-medium text-slate-600">{message}</p>
      )}
      <span className="sr-only">{message || 'Loading...'}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
