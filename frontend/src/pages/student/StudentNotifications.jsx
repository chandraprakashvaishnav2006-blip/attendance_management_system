import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, ShieldAlert, Award, Calendar, Check } from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const StudentNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/notifications');
      if (res.success) setNotifications(res.data);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await api.put(`/student/notifications/${id}/read`);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        toast.success('Marked as read');
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const getIcon = (type) => {
    if (type === 'warning') return <ShieldAlert className="w-5 h-5 text-rose-500" />;
    if (type === 'attendance_alert') return <Calendar className="w-5 h-5 text-amber-500" />;
    if (type === 'exam_mark') return <Award className="w-5 h-5 text-indigo-500" />;
    return <Bell className="w-5 h-5 text-emerald-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time administrative alerts, disciplinary warnings, exam publications, and institutional news
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'unread'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Unread ({notifications.filter((n) => !n.is_read).length})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'read'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Read
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader count={4} type="card" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No notifications to show"
          description="You're all caught up with your academic updates and warnings."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                !item.is_read
                  ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/80 shadow-md ring-1 ring-indigo-500/20'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    {!item.is_read && (
                      <Badge variant="urgent" size="sm">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.message}
                  </p>
                  <p className="text-[11px] text-slate-400 pt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {!item.is_read && (
                <button
                  onClick={() => handleMarkAsRead(item.id)}
                  title="Mark as read"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
