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
  ExternalLink,
  Copy,
  User
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
  const [openWhatsAppAfter, setOpenWhatsAppAfter] = useState(true);
  const [form, setForm] = useState({
    student_id: '',
    type: 'Low Attendance',
    severity: 'medium',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [defaultWhatsAppPhone, setDefaultWhatsAppPhone] = useState('');

  // Dedicated interactive WhatsApp Dispatch Modal state
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waData, setWaData] = useState({
    recipientName: '',
    phone: '',
    text: '',
    studentPhone: '',
    parentPhone: '',
    defaultPhone: '',
    studentName: '',
    parentName: '',
  });

  const normalizeWhatsAppPhone = (rawPhone) => {
    if (!rawPhone) return '';
    let digits = String(rawPhone).replace(/[^0-9]/g, '');
    if (!digits) return '';
    // If it's a standard 10-digit mobile number, prepend 91 (India)
    if (digits.length === 10) {
      return '91' + digits;
    }
    // If it has leading 0 and 11 digits, replace 0 with 91
    if (digits.length === 11 && digits.startsWith('0')) {
      return '91' + digits.slice(1);
    }
    return digits;
  };

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
        if (dashRes.data.default_whatsapp_phone) {
          setDefaultWhatsAppPhone(dashRes.data.default_whatsapp_phone);
        }
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

  const handleOpenWhatsAppModal = (optionsOrPhone, contactName, text) => {
    let phone = '';
    let recipientName = '';
    let waText = '';
    let studentPhone = '';
    let parentPhone = '';
    let studentName = '';
    let parentName = '';

    if (typeof optionsOrPhone === 'object' && optionsOrPhone !== null) {
      phone = optionsOrPhone.phone || '';
      recipientName = optionsOrPhone.contactName || '';
      waText = optionsOrPhone.text || '';
      studentPhone = optionsOrPhone.studentPhone || '';
      parentPhone = optionsOrPhone.parentPhone || '';
      studentName = optionsOrPhone.studentName || '';
      parentName = optionsOrPhone.parentName || '';
    } else {
      phone = optionsOrPhone || '';
      recipientName = contactName || '';
      waText = text || '';
    }

    // Auto-select phone: prefer explicit phone, then parentPhone, then studentPhone, then defaultWhatsAppPhone (.env)
    const cleanStudentPhone = normalizeWhatsAppPhone(studentPhone);
    const cleanParentPhone = normalizeWhatsAppPhone(parentPhone);
    const cleanPassedPhone = normalizeWhatsAppPhone(phone);
    const cleanDefaultPhone = normalizeWhatsAppPhone(defaultWhatsAppPhone);

    const chosenCleanPhone = cleanPassedPhone || cleanParentPhone || cleanStudentPhone || cleanDefaultPhone || '';

    const resolvedRecipient =
      recipientName ||
      (chosenCleanPhone && chosenCleanPhone === cleanParentPhone
        ? (parentName ? `${parentName} (Parent)` : 'Parent')
        : chosenCleanPhone && chosenCleanPhone === cleanStudentPhone
        ? (studentName ? `${studentName} (Student)` : 'Student')
        : chosenCleanPhone && cleanDefaultPhone && chosenCleanPhone === cleanDefaultPhone
        ? 'Default Recipient (.env)'
        : (studentName || 'Student Contact'));

    setWaData({
      recipientName: resolvedRecipient,
      phone: chosenCleanPhone,
      text: waText,
      studentPhone: cleanStudentPhone,
      parentPhone: cleanParentPhone,
      defaultPhone: cleanDefaultPhone,
      studentName: studentName,
      parentName: parentName,
    });
    setWaModalOpen(true);
  };

  const handleLaunchWhatsApp = (mode = 'app') => {
    let num = waData.phone.replace(/[^0-9]/g, '');
    if (!num || num.length < 7) {
      toast.error('Please enter a valid WhatsApp mobile number with country code (e.g. 919876543210)');
      return;
    }
    if (num.length === 10) {
      num = '91' + num;
    }
    const encoded = encodeURIComponent(waData.text);
    const url =
      mode === 'web'
        ? `https://web.whatsapp.com/send?phone=${num}&text=${encoded}`
        : `https://api.whatsapp.com/send?phone=${num}&text=${encoded}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyWhatsAppText = () => {
    navigator.clipboard.writeText(waData.text);
    toast.success('Notice copied to clipboard!');
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await api.post('/admin/test-email');
      if (res.success) {
        toast.success(res.message, { duration: 6000 });
      }
    } catch (err) {
      toast.error(err.message || 'SMTP Email Test Failed. Check Gmail App Password in .env', { duration: 7000 });
    } finally {
      setTestingEmail(false);
    }
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
        toast.success('Warning issued! Transmitted via In-App Alert and Email.');
        setIssueModalOpen(false);

        const targetStudent = students.find((s) => String(s.id) === String(form.student_id));
        const targetRoll = res.data?.student_roll_no || targetStudent?.roll_no || '';
        const targetName = res.data?.student_name || targetStudent?.name || 'Student';
        const sPhone = res.data?.student_phone || targetStudent?.phone || '';
        const pPhone = res.data?.parent_phone || targetStudent?.parent_phone || '';
        const pName = res.data?.parent_name || targetStudent?.parent_name || 'Parent';

        const waNotice = `*Official Academic Notice - Campus Attendance Office*\n\nAttention: An official *${form.severity.toUpperCase()}* severity warning has been logged for *${targetName}* (Roll: ${targetRoll}).\n\n*Category:* ${form.type}\n*Notice:* ${form.message}\n\nPlease contact the administration immediately regarding this matter.`;

        setForm((prev) => ({ ...prev, message: '' }));
        fetchWarningsAndAlerts();

        if (openWhatsAppAfter) {
          handleOpenWhatsAppModal({
            phone: pPhone || sPhone,
            contactName: pPhone ? `${pName} (Parent of ${targetName})` : targetName,
            text: waNotice,
            studentPhone: sPhone,
            parentPhone: pPhone,
            studentName: targetName,
            parentName: pName,
          });
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to issue warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSendLowAttendance = async (student) => {
    try {
      const msg = `Official Notice: Your overall attendance is currently ${student.percentage}%, which is below the required 75% threshold. Please meet your class coordinator immediately.`;
      const res = await api.post('/admin/warnings', {
        student_id: student.id,
        type: 'Low Attendance',
        severity: 'high',
        message: msg,
      });
      if (res.success) {
        toast.success(`Dispatched warning alert & email to ${student.name} and parent accounts!`);
        fetchWarningsAndAlerts();

        const waText = `*Official Academic Notice - Campus Attendance Office*\n\nDear Parent/Guardian of ${student.name} (Roll No: ${student.roll_no}),\nThis is to notify you that your child's overall attendance is currently *${student.percentage}%*, which is below the mandatory 75% university requirement.\n\nPlease discuss this with your child and schedule a meeting with the class coordinator to avoid debarment from examinations.`;
        handleOpenWhatsAppModal({
          phone: student.parent_phone || student.phone,
          contactName: student.parent_name ? `${student.parent_name} (Parent of ${student.name})` : student.name,
          text: waText,
          studentPhone: student.phone,
          parentPhone: student.parent_phone,
          studentName: student.name,
          parentName: student.parent_name,
        });
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

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="flex-1 sm:flex-none justify-center px-3 py-2 sm:py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs disabled:opacity-50"
            title="Sends a test verification email via configured Gmail SMTP"
          >
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span>{testingEmail ? 'Testing SMTP...' : 'Test Gmail'}</span>
          </button>

          <button
            onClick={() => setIssueModalOpen(true)}
            className="flex-1 sm:flex-none justify-center px-3.5 py-2 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue Warning</span>
          </button>
        </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
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
                        handleOpenWhatsAppModal({
                          phone: s.parent_phone || s.phone,
                          contactName: s.parent_name ? `${s.parent_name} (Parent of ${s.name})` : s.name,
                          text: s.parent_phone ? waTextParent : waTextStudent,
                          studentPhone: s.phone,
                          parentPhone: s.parent_phone,
                          studentName: s.name,
                          parentName: s.parent_name,
                        })
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
          <div className="overflow-x-auto touch-scroll responsive-table-container">
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
                  const matchingStudent = students.find((s) => s.id === w.student_id);
                  const parentPhone = w.parent_phone || matchingStudent?.parent_phone || '';
                  const studentPhone = w.student_phone || matchingStudent?.phone || '';
                  const parentName = w.parent_name || matchingStudent?.parent_name || '';
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
                              onClick={() =>
                                handleOpenWhatsAppModal({
                                  phone: parentPhone,
                                  contactName: `${parentName || 'Parent'} (${w.student_name})`,
                                  text: waText,
                                  studentPhone: studentPhone,
                                  parentPhone: parentPhone,
                                  studentName: w.student_name,
                                  parentName: parentName,
                                })
                              }
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
                              onClick={() =>
                                handleOpenWhatsAppModal({
                                  phone: studentPhone,
                                  contactName: w.student_name,
                                  text: waText,
                                  studentPhone: studentPhone,
                                  parentPhone: parentPhone,
                                  studentName: w.student_name,
                                  parentName: parentName,
                                })
                              }
                              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium transition-colors flex items-center gap-1"
                              title={`Send WhatsApp to Student (${studentPhone})`}
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>WA Student</span>
                            </button>
                          )}
                          {!parentPhone && !studentPhone && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenWhatsAppModal({
                                  phone: '',
                                  contactName: w.student_name,
                                  text: waText,
                                  studentPhone: '',
                                  parentPhone: '',
                                  studentName: w.student_name,
                                  parentName: '',
                                })
                              }
                              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium transition-colors flex items-center gap-1"
                              title="Open WhatsApp dispatch"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>WhatsApp</span>
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
            {(() => {
              const currentStudent = students.find((s) => String(s.id) === String(form.student_id));
              if (!currentStudent) return null;
              return (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span>Student Contact Preview</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">Roll: {currentStudent.roll_no}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Student:</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {currentStudent.phone || <span className="text-slate-400 italic font-sans">Not set</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Parent:</span>
                      <span className="font-medium text-slate-900 dark:text-white truncate">
                        {currentStudent.parent_phone ? (
                          <span className="font-mono">{currentStudent.parent_phone}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </span>
                    </div>
                  </div>
                  {(currentStudent.parent_phone || currentStudent.phone) ? (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                      ✓ Mobile number available — will autofill WhatsApp dispatch from student record
                    </p>
                  ) : defaultWhatsAppPhone ? (
                    <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium pt-0.5">
                      ℹ️ No student phone saved — will autofill default number ({defaultWhatsAppPhone}) from .env
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 pt-0.5">
                      ⚠️ No mobile number in record — you can type it manually when WhatsApp opens
                    </p>
                  )}
                </div>
              );
            })()}
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

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={openWhatsAppAfter}
                onChange={(e) => setOpenWhatsAppAfter(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-0"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Open WhatsApp Dispatch immediately after issuing
              </span>
            </label>
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

      {/* Interactive WhatsApp Dispatch Modal */}
      <Modal
        isOpen={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        title="Send Warning Notice via WhatsApp"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
            <p className="font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Target Recipient: {waData.recipientName}
            </p>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
              You can verify or edit the recipient mobile number before launching WhatsApp.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                WhatsApp Mobile Number (e.g. 919876543210) *
              </label>
              {waData.phone && (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                  {waData.phone === waData.parentPhone || waData.phone === waData.studentPhone
                    ? '✓ Autofilled from student info'
                    : waData.phone === waData.defaultPhone
                    ? '✓ Autofilled from .env default'
                    : '✓ Number ready'}
                </span>
              )}
            </div>

            {/* Quick-select pills for Parent, Student & Default .env */}
            {(waData.parentPhone || waData.studentPhone || waData.defaultPhone) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Quick Select:</span>
                {waData.parentPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      setWaData((prev) => ({
                        ...prev,
                        phone: prev.parentPhone,
                        recipientName: prev.parentName ? `${prev.parentName} (Parent)` : 'Parent',
                      }));
                    }}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                      waData.phone === waData.parentPhone
                        ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500 font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>Parent:</span>
                    <span className="font-mono">{waData.parentPhone}</span>
                  </button>
                )}
                {waData.studentPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      setWaData((prev) => ({
                        ...prev,
                        phone: prev.studentPhone,
                        recipientName: prev.studentName ? `${prev.studentName} (Student)` : 'Student',
                      }));
                    }}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                      waData.phone === waData.studentPhone
                        ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500 font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>Student:</span>
                    <span className="font-mono">{waData.studentPhone}</span>
                  </button>
                )}
                {waData.defaultPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      setWaData((prev) => ({
                        ...prev,
                        phone: prev.defaultPhone,
                        recipientName: 'Default Recipient (.env)',
                      }));
                    }}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                      waData.phone === waData.defaultPhone
                        ? 'bg-sky-600 text-white border-sky-600 dark:bg-sky-500 dark:border-sky-500 font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>Default (.env):</span>
                    <span className="font-mono">{waData.defaultPhone}</span>
                  </button>
                )}
              </div>
            )}

            {!waData.parentPhone && !waData.studentPhone && !waData.defaultPhone && !waData.phone && (
              <div className="mb-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300">
                Notice: No contact number was found in student profile or .env settings. Please enter the number manually below.
              </div>
            )}

            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={waData.phone}
                onChange={(e) => setWaData({ ...waData, phone: e.target.value })}
                placeholder="919876543210"
                className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Note: 10-digit Indian numbers will automatically be prefixed with 91.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Formatted Warning Notice
              </label>
              <button
                type="button"
                onClick={handleCopyWhatsAppText}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <textarea
              rows={5}
              value={waData.text}
              onChange={(e) => setWaData({ ...waData, text: e.target.value })}
              className="w-full p-2.5 text-xs font-mono rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleLaunchWhatsApp('web')}
              className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open WhatsApp Web</span>
            </button>
            <button
              type="button"
              onClick={() => handleLaunchWhatsApp('app')}
              className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open WhatsApp App</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
