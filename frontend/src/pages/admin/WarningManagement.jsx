import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Send,
  CheckCircle,
  Filter,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const WarningManagement = () => {
  const [warnings, setWarnings] = useState([]);
  const [students, setStudents] = useState([]);
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    type: 'Low Attendance',
    severity: 'medium',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchWarningsAndAlerts = async () => {
    setLoading(true);
    try {
      const [warnRes, dashRes, studRes] = await Promise.all([
        api.get('/admin/warnings'),
        api.get('/admin/dashboard'),
        api.get('/admin/students?page=1&page_size=100'),
      ]);

      if (warnRes.success) setWarnings(warnRes.data);
      if (dashRes.success && dashRes.data) {
        setLowAttendanceStudents(dashRes.data.low_attendance_students || []);
      }
      if (studRes.success && studRes.data) {
        setStudents(studRes.data.items || []);
        if (studRes.data.items?.length > 0) {
          setForm((prev) => ({ ...prev, student_id: String(studRes.data.items[0].id) }));
        }
      }
    } catch {
      toast.error('Failed to load warnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarningsAndAlerts();
  }, []);

  const handleIssueWarning = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/admin/warnings', {
        ...form,
        student_id: Number(form.student_id),
      });
      if (res.success) {
        toast.success(res.message);
        setIssueModalOpen(false);
        setForm((prev) => ({ ...prev, message: '' }));
        fetchWarningsAndAlerts();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to issue warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSendLowAttendance = async (student) => {
    try {
      const res = await api.post('/admin/warnings', {
        student_id: student.id,
        type: 'Low Attendance',
        severity: 'high',
        message: `Official Notice: Your overall attendance is currently ${student.percentage}%, which is below the required 75% threshold. Please meet your class coordinator.`,
      });
      if (res.success) {
        toast.success(`Dispatched warning to ${student.name} and parent accounts`);
        fetchWarningsAndAlerts();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send warning');
    }
  };

  const handleStatusUpdate = async (warningId, newStatus) => {
    try {
      const res = await api.put(`/admin/warnings/${warningId}`, { status: newStatus });
      if (res.success) {
        toast.success(res.message);
        setWarnings((prev) =>
          prev.map((w) => (w.id === warningId ? { ...w, status: newStatus } : w))
        );
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Disciplinary & Academic Warnings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Issue attendance, marks, and conduct notices with real-time parent and student broadcasting
          </p>
        </div>

        <button
          onClick={() => setIssueModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Issue Warning
        </button>
      </div>

      {/* Auto-suggested Low Attendance Warnings Card */}
      {lowAttendanceStudents.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/40 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <h3 className="text-sm font-bold">
              Automated Warning Recommendations ({lowAttendanceStudents.length} Students Below 75%)
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            These students are failing the minimum attendance criteria. Dispatch an official formal warning in one click:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {lowAttendanceStudents.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {s.roll_no} • <span className="text-rose-600 font-bold">{s.percentage}%</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickSendLowAttendance(s)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-sm transition-colors"
                >
                  Send
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Official Warning History & Status Tracking
          </h3>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonLoader count={4} type="table" />
          </div>
        ) : warnings.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="No warnings issued"
            description="All students are currently in good standing without active warnings."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Message</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date Issued</th>
                  <th className="py-3.5 px-4 text-right">Change Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {warnings.map((w) => (
                  <tr
                    key={w.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{w.student_name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{w.student_roll_no}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {w.type}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          w.severity === 'high'
                            ? 'urgent'
                            : w.severity === 'medium'
                            ? 'important'
                            : 'default'
                        }
                        size="sm"
                      >
                        {w.severity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
                      {w.message}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          w.status === 'resolved'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : w.status === 'read'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(w.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={w.status}
                        onChange={(e) => handleStatusUpdate(w.id, e.target.value)}
                        className="px-2.5 py-1 text-[11px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="sent">Sent</option>
                        <option value="read">Read</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Warning Modal */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Issue Official Student Warning"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleIssueWarning} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Student *
            </label>
            <select
              required
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll_no})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Warning Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Low Attendance">Low Attendance</option>
                <option value="Poor Marks">Poor Marks</option>
                <option value="Discipline">Discipline</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Severity
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (Urgent)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Warning Message *
            </label>
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              placeholder="State the reason and required action for the student..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIssueModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Warning'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
