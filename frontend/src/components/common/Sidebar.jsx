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
  let accentClass = 'text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 dark:text-indigo-400';
  let roleBrand = { title: 'EduTrack Admin', badge: 'Admin Portal', color: 'bg-indigo-600' };

  if (role === 'STUDENT') {
    currentNav = studentNav;
    accentClass = 'text-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 dark:text-emerald-400';
    roleBrand = { title: 'Student Portal', badge: 'Student View', color: 'bg-emerald-600' };
  } else if (role === 'PARENT') {
    currentNav = parentNav;
    accentClass = 'text-amber-600 bg-amber-50/80 dark:bg-amber-950/40 dark:text-amber-400';
    roleBrand = { title: 'Parent Portal', badge: 'Family View', color: 'bg-amber-600' };
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${roleBrand.color} text-white flex items-center justify-center font-extrabold text-lg shadow-md`}>
              E
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                {roleBrand.title}
              </h1>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                {roleBrand.badge}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
            Main Navigation
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? `${accentClass} shadow-sm`
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>EduTrack Pro v1.0</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </aside>
    </>
  );
};
