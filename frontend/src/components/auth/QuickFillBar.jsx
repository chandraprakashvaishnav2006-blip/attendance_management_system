import React from 'react';
import { Sparkles, Shield, GraduationCap, Users } from 'lucide-react';

export const QuickFillBar = ({ onQuickFill, activeRole }) => {
  return (
    <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
      <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-amber-600 dark:text-amber-400 mb-2.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
        <span>QUICK FILL DEMO LOGINS</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onQuickFill('admin')}
          className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeRole === 'admin'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Shield className="w-3 h-3 text-indigo-500" />
          <span>Admin</span>
        </button>

        <button
          type="button"
          onClick={() => onQuickFill('student')}
          className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeRole === 'student'
              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-3 h-3 text-sky-500" />
          <span>Student</span>
        </button>

        <button
          type="button"
          onClick={() => onQuickFill('parent')}
          className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeRole === 'parent'
              ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-semibold'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3 h-3 text-teal-500" />
          <span>Parent</span>
        </button>
      </div>
    </div>
  );
};
