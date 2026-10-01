import React, { useState, useEffect } from 'react';
import { ShieldAlert, Bell, CheckCircle2, Calendar, Check, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const ParentAlerts = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/parent/notifications');
      if (res.success) setNotifications(res.data);
    } catch {
      toast.error('Failed to load parent notifications and alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await api.put(`/parent/notifications/${id}/read`);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        toast.success('Alert acknowledged');
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const getAlertIcon = (type) => {
    if (type === 'warning') return <ShieldAlert className="w-5 h-5 text-rose-500" />;
    if (type === 'attendance_alert') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <Bell className="w-5 h-5 text-indigo-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Parent Alerts & Official Disciplinary Notices
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Instant absence notifications, low-attendance warnings, and official institutional announcements
        </p>
      </div>

      {loading ? (
        <SkeletonLoader count={4} type="card" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No alerts or warnings"
          description="Your child has no recorded absence alerts or disciplinary warnings."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                !item.is_read
                  ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/80 shadow-md ring-1 ring-amber-500/20'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                  {getAlertIcon(item.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    {!item.is_read && (
                      <Badge variant="urgent" size="sm">
                        New Alert
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
                  title="Acknowledge alert"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  Acknowledge
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
