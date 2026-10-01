import React from 'react';

export const SkeletonLoader = ({ count = 3, type = 'card' }) => {
  if (type === 'table') {
    return (
      <div className="w-full space-y-3 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-32 bg-slate-200/70 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800"
        />
      ))}
    </div>
  );
};
