import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarCheck,
  Award,
  Bell,
  FileText,
  AlertTriangle,
  LineChart,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  Building2,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  const adminNav = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Students', path: '/admin/students', icon: GraduationCap },
    { name: 'Parents', path: '/admin/parents', icon: Users },
    { name: 'Attendance', path: '/admin/attendance', icon: CalendarCheck },
    { name: 'Marks & Exams', path: '/admin/marks', icon: Award },
    { name: 'Semesters & Subjects', path: '/admin/subjects', icon: BookOpen },
    { name: 'Branches & Sections', path: '/admin/branches-sections', icon: Building2 },
    { name: 'Notices', path: '/admin/notices', icon: Bell },
    { name: 'PDF Materials', path: '/admin/documents', icon: FileText },
    { name: 'Warnings', path: '/admin/warnings', icon: AlertTriangle },
  ];

  const studentNav = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', path: '/student/attendance', icon: CalendarCheck },
    { name: 'Marks & Results', path: '/student/marks', icon: Award },
    { name: 'Analytics', path: '/student/analytics', icon: LineChart },
    { name: 'PDF Materials', path: '/student/documents', icon: BookOpen },
    { name: 'Notifications', path: '/student/notifications', icon: Bell },
  ];

  const parentNav = [
    { name: 'Child Overview', path: '/parent/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', path: '/parent/attendance', icon: CalendarCheck },
    { name: 'Marks & Results', path: '/parent/marks', icon: Award },
    { name: 'Performance Analytics', path: '/parent/analytics', icon: LineChart },
    { name: 'Alerts & Warnings', path: '/parent/alerts', icon: ShieldAlert },
  ];

  let currentNav = adminNav;
  let accentClass = 'text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-white font-semibold';
  let roleBrand = { title: 'EduTrack', badge: 'Admin' };

  if (role === 'STUDENT') {
    currentNav = studentNav;
    roleBrand = { title: 'EduTrack', badge: 'Student' };
  } else if (role === 'PARENT') {
    currentNav = parentNav;
    roleBrand = { title: 'EduTrack', badge: 'Parent' };
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
              E
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {roleBrand.title}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {roleBrand.badge}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 pb-1">
            Menu
          </div>
          {currentNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                    isActive
                      ? `${accentClass} shadow-2xs`
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60">
          <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>EduTrack Pro</span>
            <span className="flex items-center gap-1.5 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
