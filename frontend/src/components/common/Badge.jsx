import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    admin: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    student: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    parent: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    // Attendance variants
    present: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    absent: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    leave: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    // Severity / Priority variants
    urgent: 'bg-rose-500 text-white animate-pulse',
    important: 'bg-amber-500 text-white',
    normal: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    // Attendance percentage colors
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold',
    yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold',
    red: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full transition-colors ${
        sizeClasses[size] || sizeClasses.md
      } ${variantClasses[variant] || variantClasses.default} ${className}`}
    >
      {children}
    </span>
  );
};
