import React from 'react';
import { ROLES_CONFIG } from './authConfig';
import { ShieldCheck, GraduationCap, HeartHandshake } from 'lucide-react';

export const RoleBanner = ({ role }) => {
  const config = ROLES_CONFIG[role];

  const getIcon = () => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'student':
        return <GraduationCap className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'parent':
        return <HeartHandshake className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      default:
        return null;
    }
  };

  const getBadgeBg = () => {
    switch (role) {
      case 'admin':
        return 'bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300';
      case 'student':
        return 'bg-sky-100/80 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300';
      case 'parent':
        return 'bg-teal-100/80 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300';
      default:
        return '';
    }
  };

  return (
    <div className={`w-full p-3.5 rounded-xl border ${config.themeColor.border} ${config.themeColor.subtle} transition-all duration-300 flex items-start gap-3`}>
      <div className={`p-2 rounded-lg ${getBadgeBg()} shrink-0 mt-0.5`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {config.badge}
          </span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
          {config.description}
        </p>
      </div>
    </div>
  );
};
