import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Moon,
  Sun,
  Bell,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Baby,
  KeyRound,
  Shield,
  GraduationCap,
  Users,
  ZoomIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from './Badge';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, role, logout, activeChild, switchActiveChild } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChildMenu, setShowChildMenu] = useState(false);

  // Fetch notifications for student/parent
  useEffect(() => {
    if (role === 'STUDENT' || role === 'PARENT') {
      const endpoint = role === 'STUDENT' ? '/student/notifications' : '/parent/notifications';
      api.get(endpoint)
        .then((res) => {
          if (res.success && res.data) {
            setNotifications(res.data);
            setUnreadCount(res.data.filter((n) => !n.is_read).length);
          }
        })
        .catch(() => {});
    }
  }, [role]);

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    const endpointPrefix = role === 'STUDENT' ? '/student/notifications' : '/parent/notifications';
    for (const notif of unread) {
      try {
        await api.put(`${endpointPrefix}/${notif.id}/read`);
      } catch {
        // Continue
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getRoleIcon = () => {
    if (role === 'ADMIN') return <Shield className="w-3.5 h-3.5 text-indigo-500" />;
    if (role === 'STUDENT') return <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />;
    return <Users className="w-3.5 h-3.5 text-amber-500" />;
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      {/* Left side: Mobile Toggle & Title */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 lg:hidden transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Parent Role: Child Switcher */}
        {role === 'PARENT' && user?.students?.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowChildMenu(!showChildMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors"
            >
              <Baby className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Child: <span className="font-semibold">{activeChild?.name || 'Select Child'}</span>
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showChildMenu && (
              <div
                className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in"
                onClick={() => setShowChildMenu(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Switch Active Child
                </div>
                {user.students.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => switchActiveChild(child)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      activeChild?.id === child.id
                        ? 'font-semibold text-amber-600 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{child.name}</p>
                      <p className="text-[10px] text-slate-400">
                        Roll: {child.roll_no} • {child.class_name || 'Class A'}
                      </p>
                    </div>
                    {activeChild?.id === child.id && (
                      <Badge variant="parent" size="sm">Active</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: Actions, Theme, Notifications, Profile */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications (For Student & Parent) */}
        {(role === 'STUDENT' || role === 'PARENT') && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in max-h-96 flex flex-col">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Notifications
                    </h4>
                    {unreadCount > 0 && <Badge variant="urgent" size="sm">{unreadCount} New</Badge>}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          !n.is_read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {user?.name || 'User'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {getRoleIcon()}
                <span className="text-[10px] font-medium text-slate-400">{user?.role}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in"
              onClick={() => setShowUserMenu(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <div className="mt-1.5">
                  <Badge variant={user?.role?.toLowerCase()} size="sm">
                    {user?.role}
                  </Badge>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => navigate('/change-password')}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-slate-400" />
                  Change Password
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
