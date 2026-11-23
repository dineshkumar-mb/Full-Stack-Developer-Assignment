import React from 'react';
import { cn } from '../../utils/cn.js';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  onClose,
  ...props
}) {
  const variants = {
    info: {
      container: 'bg-sky-50 border-sky-200 text-sky-900',
      icon: Info,
      iconColor: 'text-sky-600',
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
    },
    error: {
      container: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: AlertCircle,
      iconColor: 'text-rose-600',
    },
  };

  const currentVariant = variants[variant] || variants.info;
  const Icon = currentVariant.icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border text-sm',
        currentVariant.container,
        className
      )}
      {...props}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', currentVariant.iconColor)} />
      <div className="flex-1">
        {title && <h5 className="font-semibold mb-1">{title}</h5>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default Alert;
