import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  AlertTriangle,
  Bell,
  ArrowRight,
  Plus,
  Send,
  CheckCircle,
  FileText
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Modal } from '../../components/common/Modal';
import toast from 'react-hot-toast';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [selectedStudentForWarning, setSelectedStudentForWarning] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [issuingWarning, setIssuingWarning] = useState(false);

  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      if (res.success) {
        if (res.data?.low_attendance_students) {
          res.data.low_attendance_students.sort((a, b) => a.name.localeCompare(b.name));
        }
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const openWarningModal = (student) => {
    setSelectedStudentForWarning(student);
    setWarningMessage(
      `Your current attendance is ${student.percentage}%, which is below the mandatory 75% requirement. Please meet with the academic department immediately.`
    );
    setWarningModalOpen(true);
  };

  const handleSendWarning = async (e) => {
    e.preventDefault();
    if (!selectedStudentForWarning) return;
    setIssuingWarning(true);
    try {
      const res = await api.post('/admin/warnings', {
        student_id: selectedStudentForWarning.id,
        type: 'Low Attendance',
        severity: 'high',
        message: warningMessage,
      });
      if (res.success) {
        toast.success(`Warning dispatched to ${selectedStudentForWarning.name} and parents`);
        setWarningModalOpen(false);
        fetchDashboard();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch warning');
    } finally {
      setIssuingWarning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <SkeletonLoader count={4} type="card" />
        <SkeletonLoader count={3} type="table" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: data?.total_students || 0,
      icon: GraduationCap,
      color: 'indigo',
      link: '/admin/students',
    },
    {
      title: 'Total Parents',
      value: data?.total_parents || 0,
      icon: Users,
      color: 'amber',
      link: '/admin/parents',
    },
    {
      title: "Today's Attendance",
      value: `${data?.today_attendance_percentage || 0}%`,
      subtitle: `${data?.today_records_count || 0} classes logged`,
      icon: CalendarCheck,
      color: 'emerald',
      link: '/admin/attendance',
    },
    {
      title: 'Low Attendance Alert',
      value: data?.low_attendance_count || 0,
      subtitle: 'Below 75% threshold',
      icon: AlertTriangle,
      color: 'rose',
      link: '/admin/warnings',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Administrator Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time analytics, institutional records, and alert management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/attendance')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            Mark Attendance
          </button>
          <button
            onClick={() => navigate('/admin/students')}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(card.link)}
              className="group cursor-pointer p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div
                  className={`p-2.5 rounded-xl ${
                    card.color === 'indigo'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                      : card.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : card.color === 'amber'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {card.value}
                </h3>
                {card.subtitle && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{card.subtitle}</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>View details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-Column Section: Low Attendance Alerts & Recent Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Attendance Flagged Students (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Low Attendance Warning System
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Students flagged automatically below 75% attendance threshold
                  </p>
                </div>
              </div>
              <Badge variant="urgent" size="sm">
                {data?.low_attendance_count || 0} Flagged
              </Badge>
            </div>

            {data?.low_attendance_students?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                All active students are meeting the 75% attendance criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3">Attendance %</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {data?.low_attendance_students?.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {s.roll_no}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          {s.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{s.class_name}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                            {s.percentage}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => openWarningModal(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-[11px] font-bold border border-rose-200 dark:border-rose-800 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Send Warning
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Institutional Notices (1 col) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-500" />
                Recent Notices
              </h3>
              <button
                onClick={() => navigate('/admin/notices')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3">
              {data?.recent_notices?.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No notices posted yet</p>
              ) : (
                data?.recent_notices?.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={n.priority} size="sm">
                        {n.priority}
                      </Badge>
                      <span className="text-[10px] text-slate-400">{n.publish_date}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {n.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/notices')}
            className="w-full mt-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Create Announcement
          </button>
        </div>
      </div>

      {/* Disciplinary Warning Modal */}
      <Modal
        isOpen={warningModalOpen}
        onClose={() => setWarningModalOpen(false)}
        title={`Dispatch Warning: ${selectedStudentForWarning?.name} (${selectedStudentForWarning?.roll_no})`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSendWarning} className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-200">
            This warning will immediately appear in the student's notification center and alert all linked parent accounts.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Warning Message
            </label>
            <textarea
              required
              rows={4}
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setWarningModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={issuingWarning}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {issuingWarning ? 'Dispatching...' : 'Confirm & Dispatch Warning'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
