import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Send,
  CheckCircle,
  Filter,
  ShieldAlert,
  ArrowRight,
  Mail,
  MessageSquare,
  Phone,
  ExternalLink
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
        api.get('/admin/students?page=1&page_size=100&sort_by=name&sort_order=asc'),
      ]);

      if (warnRes.success) setWarnings(warnRes.data);
      if (dashRes.success && dashRes.data) {
        const sortedLow = [...(dashRes.data.low_attendance_students || [])].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setLowAttendanceStudents(sortedLow);
      }
      if (studRes.success && studRes.data) {
        const sortedStudents = (studRes.data.items || []).sort((a, b) => a.name.localeCompare(b.name));
        setStudents(sortedStudents);
        if (sortedStudents.length > 0) {
          setForm((prev) => ({ ...prev, student_id: String(sortedStudents[0].id) }));
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

  const handleOpenWhatsApp = (phone, contactName, text) => {
    if (!phone) {
      toast.error(`No phone number registered for ${contactName || 'this contact'}`);
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleIssueWarning = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/admin/warnings', {
        ...form,
        student_id: Number(form.student_id),
      });
      if (res.success) {
        toast.success('Warning issued! Dispatched via In-App Notification and Email.');
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
        message: `Official Notice: Your overall attendance is currently ${student.percentage}%, which is below the required 75% threshold. Please meet your class coordinator immediately.`,
      });
      if (res.success) {
        toast.success(`Dispatched warning alert & email to ${student.name} and parent accounts!`);
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Disciplinary & Academic Warnings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Issue conduct & low attendance notices with automated In-App, Email (Gmail), and WhatsApp dispatch
          </p>
        </div>

        <button
          onClick={() => setIssueModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Issue Warning
        </button>
      </div>

      {/* Auto-suggested Low Attendance Warnings Card */}
      {lowAttendanceStudents.length > 0 && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <h3 className="text-xs font-semibold">
                Attendance Risk Defaulters ({lowAttendanceStudents.length} Students Below 75%)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Instant In-App, Email & WhatsApp Available
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These students fail the mandatory 75% attendance threshold. Dispatch an official warning via Email/Portal or click WhatsApp:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {lowAttendanceStudents.map((s) => {
              const waTextParent = `*Official Academic Notice - Campus Attendance Office*\n\nDear Parent/Guardian of ${s.name} (Roll No: ${s.roll_no}),\nThis is to notify you that your child's overall attendance is currently *${s.percentage}%*, which is below the mandatory 75% university requirement.\n\nPlease discuss this with your child and schedule a meeting with the class coordinator to avoid debarment from examinations.`;
              const waTextStudent = `*Official Academic Notice - Campus Attendance Office*\n\nAttention ${s.name} (${s.roll_no}),\nYour overall attendance has dropped to *${s.percentage}%* (Below 75% minimum threshold).\nPlease meet your class coordinator immediately to regularize your attendance.`;

              return (
                <div
                  key={s.id}
                  className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                      <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                        {s.percentage}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {s.roll_no} • {s.class_name}
                    </p>
                    {s.phone && (
                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        Phone: {s.phone} {s.parent_phone ? `• Parent: ${s.parent_phone}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => handleQuickSendLowAttendance(s)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-medium transition-colors flex items-center justify-center gap-1 shadow-2xs"
                      title="Issues official warning and dispatches In-App alert + Email"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Issue & Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenWhatsApp(
                          s.parent_phone || s.phone,
                          s.parent_name ? `${s.parent_name} (Parent)` : s.name,
                          s.parent_phone ? waTextParent : waTextStudent
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                      title="Open WhatsApp with pre-filled warning text"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warnings History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            Official Warning History & Contact Dispatch
          </h3>
          <span className="text-[11px] text-slate-400">
            {warnings.length} warning record(s)
          </span>
        </div>

        {loading ? (
          <div className="p-5">
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
              <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200/80 dark:border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Dispatch Channels</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issued On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {warnings.map((w) => {
                  const parentPhone = w.parent_phone;
                  const studentPhone = w.student_phone;
                  const waText = `*Official Academic Notice - Campus Attendance Office*\n\nAttention: An official *${w.severity.toUpperCase()}* severity warning has been logged for *${w.student_name}* (Roll: ${w.student_roll_no}).\n\n*Category:* ${w.type}\n*Message:* ${w.message}\n\nPlease contact the administration immediately regarding this matter.`;

                  return (
                    <tr
                      key={w.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{w.student_name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{w.student_roll_no}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {w.type}
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed text-[11px]">
                        {w.message}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <Mail className="w-3 h-3" />
                            Email Dispatched
                          </span>
                          {(parentPhone || studentPhone) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <MessageSquare className="w-3 h-3" />
                              WhatsApp Ready
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">No phone listed</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={w.status}
                          onChange={(e) => handleStatusUpdate(w.id, e.target.value)}
                          className="px-2 py-1 text-[11px] rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="sent">Sent</option>
                          <option value="read">Read</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(w.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {parentPhone && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(parentPhone, `${w.parent_name || 'Parent'}`, waText)}
                              className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-medium transition-colors flex items-center gap-1"
                              title={`Send WhatsApp to Parent (${parentPhone})`}
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>WA Parent</span>
                            </button>
                          )}
                          {studentPhone && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(studentPhone, w.student_name, waText)}
                              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium transition-colors flex items-center gap-1"
                              title={`Send WhatsApp to Student (${studentPhone})`}
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>WA Student</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              Automated Dual Dispatch Enabled
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Dispatches via in-app portal alert and SMTP email to the student and linked parents. WhatsApp links will be ready upon creation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Student *
            </label>
            <select
              required
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll_no})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Warning Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="Low Attendance">Low Attendance</option>
                <option value="Poor Marks">Poor Marks</option>
                <option value="Discipline">Discipline</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Severity
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (Urgent)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Warning Message *
            </label>
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full p-2.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="State the reason, percentage, and required action for the student..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIssueModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Warning & Email'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
