import React from 'react';
import { ROLES_CONFIG } from './authConfig';
import { Shield, GraduationCap, Users } from 'lucide-react';

export const RoleSelector = ({ selectedRole, onSelectRole }) => {
  const roles = [
    { id: 'admin', label: 'Admin', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'student', label: 'Student', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { id: 'parent', label: 'Parent', icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl flex items-center justify-between border border-slate-200/60 dark:border-slate-700 shadow-inner">
      {roles.map((role) => {
        const isActive = selectedRole === role.id;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelectRole(role.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer select-none ${
              isActive
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm shadow-slate-200 dark:shadow-none font-bold transform scale-[1.01]'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/50'
            }`}
          >
            <span className={isActive ? ROLES_CONFIG[role.id].themeColor.text : 'text-slate-400'}>
              {role.icon}
            </span>
            <span>{role.label}</span>
          </button>
        );
      })}
    </div>
  );
};
