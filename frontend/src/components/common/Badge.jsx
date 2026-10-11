import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-medium tracking-tight',
    md: 'px-2.5 py-0.5 text-xs font-medium tracking-tight',
    lg: 'px-3 py-1 text-xs font-semibold',
  };

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60',
    admin: 'bg-indigo-50/70 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
    student: 'bg-emerald-50/70 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    parent: 'bg-amber-50/70 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    // Attendance variants
    present: 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    absent: 'bg-rose-50/80 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    late: 'bg-amber-50/80 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    leave: 'bg-blue-50/80 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    // Severity / Priority variants
    urgent: 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60 font-semibold',
    important: 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60 font-semibold',
    normal: 'bg-slate-100 text-slate-700 border border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60',
    // Attendance percentage colors
    green: 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 font-medium',
    yellow: 'bg-amber-50/80 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-medium',
    red: 'bg-rose-50/80 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg transition-colors ${
        sizeClasses[size] || sizeClasses.md
      } ${variantClasses[variant] || variantClasses.default} ${className}`}
    >
      {children}
    </span>
  );
};
