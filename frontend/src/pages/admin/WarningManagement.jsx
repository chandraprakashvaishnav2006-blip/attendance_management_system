import React, { useState, useEffect, useMemo } from 'react';
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
  User,
  Search,
  Users,
  Clock,
  CheckCheck,
  ChevronRight,
  AlertCircle,
  Megaphone,
  Sparkles,
  X,
  ChevronDown
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

  // Active view tab: 'warnings' or 'defaulters'
  const [activeTab, setActiveTab] = useState('warnings');

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Single Student Warning Modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [openWhatsAppAfter, setOpenWhatsAppAfter] = useState(true);
  const [studentPickerSearch, setStudentPickerSearch] = useState('');
  const [pickerDropdownOpen, setPickerDropdownOpen] = useState(false);

  const [form, setForm] = useState({
    student_id: '',
    target: 'both', // 'both' | 'student' | 'parent'
    type: 'Low Attendance',
    severity: 'medium',
    message: '',
    student_phone: '',
    parent_phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Broadcast / Bulk Message to ALL Students Modal state
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    targetRecipient: 'both', // 'both' | 'student' | 'parent'
    type: 'Low Attendance',
    severity: 'medium',
    message: '',
  });
  const [broadcasting, setBroadcasting] = useState(false);
  const [bulkDefaultersSending, setBulkDefaultersSending] = useState(false);

  // Interactive WhatsApp Dispatch Modal state (Supports BOTH child and parent)
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waData, setWaData] = useState({
    targetMode: 'both', // 'both' | 'student' | 'parent'
    studentName: '',
    parentName: '',
    studentPhone: '',
    parentPhone: '',
    studentRoll: '',
    text: '',
  });

  const normalizeWhatsAppPhone = (rawPhone) => {
    if (!rawPhone) return '';
    let digits = String(rawPhone).replace(/[^0-9]/g, '');
    if (!digits) return '';
    // Standard 10-digit Indian mobile number: prepend 91
    if (digits.length === 10) {
      return '91' + digits;
    }
    // If it already has 12 digits starting with 91
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits;
    }
    // If it has leading 0 and 11 digits, replace 0 with 91
    if (digits.length === 11 && digits.startsWith('0')) {
      return '91' + digits.slice(1);
    }
    return digits;
  };

  const handleStudentSelect = (studentId) => {
    const s = students.find((st) => String(st.id) === String(studentId));
    setForm((prev) => ({
      ...prev,
      student_id: String(studentId),
      student_phone: normalizeWhatsAppPhone(s?.phone || ''),
      parent_phone: normalizeWhatsAppPhone(s?.parent_phone || ''),
    }));
    setPickerDropdownOpen(false);
    setStudentPickerSearch('');
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
        const sortedLow = [...(dashRes.data.low_attendance_students || [])].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setLowAttendanceStudents(sortedLow);
      }
      if (studRes.success && studRes.data) {
        const sortedStudents = (studRes.data.items || []).sort((a, b) => a.name.localeCompare(b.name));
        setStudents(sortedStudents);
        if (sortedStudents.length > 0) {
          const first = sortedStudents[0];
          setForm((prev) => ({
            ...prev,
            student_id: prev.student_id || String(first.id),
            student_phone: prev.student_phone || normalizeWhatsAppPhone(first.phone || ''),
            parent_phone: prev.parent_phone || normalizeWhatsAppPhone(first.parent_phone || ''),
          }));
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

  // Filtered students for searchable child & parent picker
  const filteredPickerStudents = useMemo(() => {
    if (!studentPickerSearch.trim()) return students;
    const q = studentPickerSearch.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.roll_no || '').toLowerCase().includes(q) ||
        (s.phone && String(s.phone).includes(q)) ||
        (s.parent_name && s.parent_name.toLowerCase().includes(q)) ||
        (s.parent_phone && String(s.parent_phone).includes(q))
    );
  }, [students, studentPickerSearch]);

  const selectedStudentObj = useMemo(() => {
    return students.find((s) => String(s.id) === String(form.student_id));
  }, [students, form.student_id]);

  // Open WhatsApp Modal with support for BOTH student and parent
  const handleOpenWhatsAppModal = ({
    studentName = '',
    parentName = '',
    studentPhone = '',
    parentPhone = '',
    studentRoll = '',
    text = '',
    preferredTarget = 'both',
  }) => {
    setWaData({
      targetMode: preferredTarget,
      studentName: studentName || 'Student',
      parentName: parentName || 'Parent',
      studentPhone: normalizeWhatsAppPhone(studentPhone),
      parentPhone: normalizeWhatsAppPhone(parentPhone),
      studentRoll: studentRoll || '',
      text: text || '',
    });
    setWaModalOpen(true);
  };

  // Launch WhatsApp link for a specific phone number
  const launchWhatsAppLink = (phoneNum, messageText, mode = 'web') => {
    let num = String(phoneNum || '').replace(/[^0-9]/g, '');
    if (!num || num.length < 7) {
      toast.error('Please enter a valid mobile number with country code (e.g. 919876543210)');
      return false;
    }
    if (num.length === 10) {
      num = '91' + num;
    }
    const encoded = encodeURIComponent(messageText);
    const url =
      mode === 'web'
        ? `https://web.whatsapp.com/send?phone=${num}&text=${encoded}`
        : `https://api.whatsapp.com/send?phone=${num}&text=${encoded}`;

    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  };

  // Launch WhatsApp for BOTH student and parent in separate tabs
  const handleLaunchWhatsAppBoth = (mode = 'web') => {
    let launchedCount = 0;
    if (waData.studentPhone) {
      const studentNotice = waData.text.replace(/Dear Parent\/Guardian of.*?\n\n/i, '');
      launchWhatsAppLink(waData.studentPhone, studentNotice || waData.text, mode);
      launchedCount++;
    }
    if (waData.parentPhone) {
      setTimeout(() => {
        launchWhatsAppLink(waData.parentPhone, waData.text, mode);
      }, 350);
      launchedCount++;
    }

    if (launchedCount === 0) {
      toast.error('No valid phone numbers found for student or parent');
    } else {
      toast.success(`Launching WhatsApp for ${launchedCount} contact(s)!`);
    }
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

  // Issue single student warning (dispatches in-app, email to both student & parents)
  const handleIssueWarning = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/admin/warnings', {
        student_id: Number(form.student_id),
        type: form.type,
        severity: form.severity,
        message: form.message,
      });

      if (res.success) {
        toast.success('Warning issued! Transmitted via In-App Alert & Email to both Student and Parent accounts.');
        setIssueModalOpen(false);

        const targetStudent = students.find((s) => String(s.id) === String(form.student_id));
        const targetRoll = res.data?.student_roll_no || targetStudent?.roll_no || '';
        const targetName = res.data?.student_name || targetStudent?.name || 'Student';
        const sPhone = form.student_phone || res.data?.student_phone || targetStudent?.phone || '';
        const pPhone = form.parent_phone || res.data?.parent_phone || targetStudent?.parent_phone || '';
        const pName = res.data?.parent_name || targetStudent?.parent_name || 'Parent';

        const waNotice = `*Official Academic Notice - Campus Attendance Office*\n\nAttention: An official *${form.severity.toUpperCase()}* severity warning has been logged for *${targetName}* (Roll: ${targetRoll}).\n\n*Category:* ${form.type}\n*Notice:* ${form.message}\n\nPlease contact the administration immediately regarding this matter.`;

        setForm((prev) => ({ ...prev, message: '' }));
        fetchWarningsAndAlerts();

        if (openWhatsAppAfter) {
          handleOpenWhatsAppModal({
            studentName: targetName,
            parentName: pName,
            studentPhone: sPhone,
            parentPhone: pPhone,
            studentRoll: targetRoll,
            text: waNotice,
            preferredTarget: form.target,
          });
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to issue warning');
    } finally {
      setSubmitting(false);
    }
  };

  // ONE-CLICK: Send Message / Warning to ALL Students & Parents with fallback
  const handleBroadcastAll = async (e) => {
    e.preventDefault();
    if (!broadcastForm.message.trim()) {
      toast.error('Please enter a message description to broadcast');
      return;
    }
    setBroadcasting(true);
    try {
      const payload = {
        student_ids: null, // targets ALL active students!
        type: broadcastForm.type,
        severity: broadcastForm.severity,
        message: broadcastForm.message,
      };

      let res;
      try {
        res = await api.post('/admin/warnings/bulk', payload);
      } catch (err) {
        if (err?.status === 405 || err?.message?.includes('Method Not Allowed') || err?.response?.status === 405) {
          res = await api.post('/admin/warnings-bulk', payload);
        } else {
          throw err;
        }
      }

      if (res.success) {
        toast.success(
          res.message || `Dispatched official notices & emails to all ${students.length} students & parents in one click!`,
          { duration: 6000 }
        );
        setBroadcastModalOpen(false);
        setBroadcastForm((prev) => ({ ...prev, message: '' }));
        fetchWarningsAndAlerts();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  // ONE-CLICK: Send Warning & Email to ALL Defaulters (<75%) with fallback
  const handleSendAllDefaulters = async () => {
    if (lowAttendanceStudents.length === 0) {
      toast.info('No attendance defaulters found');
      return;
    }

    const confirmed = window.confirm(
      `Send official low attendance warnings & emails to ALL ${lowAttendanceStudents.length} students (<75%) and their parents in one click?`
    );
    if (!confirmed) return;

    setBulkDefaultersSending(true);
    try {
      const payload = {
        student_ids: lowAttendanceStudents.map((s) => s.id),
        type: 'Low Attendance',
        severity: 'high',
        message: 'Official Notice: Your overall attendance is currently below the mandatory 75% threshold. Please meet your class coordinator immediately to regularize attendance.',
      };

      let res;
      try {
        res = await api.post('/admin/warnings/bulk', payload);
      } catch (err) {
        if (err?.status === 405 || err?.message?.includes('Method Not Allowed') || err?.response?.status === 405) {
          res = await api.post('/admin/warnings-bulk', payload);
        } else {
          throw err;
        }
      }

      if (res.success) {
        toast.success(
          res.message || `Dispatched warnings & emails to all ${lowAttendanceStudents.length} defaulters and parents in one click!`,
          { duration: 6000 }
        );
        fetchWarningsAndAlerts();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch warnings to all defaulters');
    } finally {
      setBulkDefaultersSending(false);
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
        toast.success(`Dispatched warning alert & email to ${student.name} and parent!`);
        fetchWarningsAndAlerts();

        const waText = `*Official Academic Notice - Campus Attendance Office*\n\nDear Parent/Guardian of ${student.name} (Roll No: ${student.roll_no}),\nThis is to notify you that your child's overall attendance is currently *${student.percentage}%*, which is below the mandatory 75% university requirement.\n\nPlease discuss this with your child and schedule a meeting with the class coordinator to avoid debarment from examinations.`;
        handleOpenWhatsAppModal({
          studentName: student.name,
          parentName: student.parent_name || 'Parent',
          studentPhone: student.phone,
          parentPhone: student.parent_phone,
          studentRoll: student.roll_no,
          text: waText,
          preferredTarget: 'both',
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

  // Filtered warnings list - searchable by child AND parent names/phones
  const filteredWarnings = useMemo(() => {
    return warnings.filter((w) => {
      const matchingStudent = students.find((s) => s.id === w.student_id);
      const parentName = w.parent_name || matchingStudent?.parent_name || '';
      const parentPhone = w.parent_phone || matchingStudent?.parent_phone || '';
      const studentPhone = w.student_phone || matchingStudent?.phone || '';

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !searchQuery ||
        (w.student_name || '').toLowerCase().includes(q) ||
        (w.student_roll_no || '').toLowerCase().includes(q) ||
        (w.message || '').toLowerCase().includes(q) ||
        (w.type || '').toLowerCase().includes(q) ||
        studentPhone.includes(q) ||
        parentName.toLowerCase().includes(q) ||
        parentPhone.includes(q);

      const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || w.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [warnings, students, searchQuery, statusFilter, severityFilter]);

  // High severity count
  const highSeverityCount = useMemo(() => {
    return warnings.filter((w) => w.severity === 'high').length;
  }, [warnings]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Sleek Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Warnings & Disciplinary
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              Child & Parent Dispatch
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Send notices to both student & parent with automated Email & 1-click WhatsApp dispatch
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <button
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="btn-press px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs disabled:opacity-50"
            title="Verify Gmail SMTP connection"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden xs:inline">{testingEmail ? 'Testing...' : 'Test SMTP'}</span>
          </button>

          {/* ONE-CLICK ALL STUDENTS BUTTON */}
          <button
            onClick={() => setBroadcastModalOpen(true)}
            className="btn-press px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            title="Send notice to all students in one click"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Send All Students (1-Click)</span>
          </button>

          {/* ISSUE SINGLE WARNING BUTTON */}
          <button
            onClick={() => {
              setPickerDropdownOpen(false);
              setStudentPickerSearch('');
              setIssueModalOpen(true);
            }}
            className="btn-press px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue Warning</span>
          </button>
        </div>
      </div>

      {/* Minimal KPI Strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('warnings')}
          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all btn-press ${
            activeTab === 'warnings'
              ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xs ring-1 ring-slate-200/70 dark:ring-slate-700/70'
              : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/70 hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Issued</span>
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {warnings.length}
          </div>
        </button>

        <div className="p-2.5 sm:p-3 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Urgent / High</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400">
            {highSeverityCount}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('defaulters')}
          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all btn-press ${
            activeTab === 'defaulters'
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 shadow-2xs ring-1 ring-rose-200/70 dark:ring-rose-800/70'
              : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/70 hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Defaulters &lt;75%</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{lowAttendanceStudents.length}</span>
            {lowAttendanceStudents.length > 0 && (
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/60">
                Action
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Windows Fluent / iOS Segmented Tab Bar & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Segmented Controls */}
        <div className="inline-flex p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('warnings')}
            className={`btn-press px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'warnings'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Warnings History</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {warnings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('defaulters')}
            className={`btn-press px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'defaulters'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Attendance Defaulters</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              lowAttendanceStudents.length > 0
                ? 'bg-rose-500 text-white'
                : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {lowAttendanceStudents.length}
            </span>
          </button>
        </div>

        {/* Filter & Search Bar (Matches Child & Parent names/phones) */}
        {activeTab === 'warnings' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search child or parent name/phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="read">Read</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content: Tab 1 (Warnings History) */}
      {activeTab === 'warnings' && (
        <div className="space-y-3">
          {loading ? (
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              <SkeletonLoader count={4} type="table" />
            </div>
          ) : filteredWarnings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-8 text-center">
              <EmptyState
                icon={CheckCircle}
                title={searchQuery || statusFilter !== 'all' ? "No matching warnings" : "No warnings issued"}
                description={
                  searchQuery || statusFilter !== 'all'
                    ? "Try adjusting your search query (child or parent name/phone) or status filter."
                    : "All students are currently in good standing without active disciplinary warnings."
                }
              />
            </div>
          ) : (
            <>
              {/* DESKTOP / WINDOWS FLUENT DATA GRID */}
              <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200/80 dark:border-slate-800/80">
                    <tr>
                      <th className="py-2.5 px-3.5">Student & Parent</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Message</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Issued</th>
                      <th className="py-2.5 px-3.5 text-right">Send to Both / Direct</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredWarnings.map((w) => {
                      const matchingStudent = students.find((s) => s.id === w.student_id);
                      const parentPhone = w.parent_phone || matchingStudent?.parent_phone || '';
                      const studentPhone = w.student_phone || matchingStudent?.phone || '';
                      const parentName = w.parent_name || matchingStudent?.parent_name || 'Parent';
                      const waText = `*Official Academic Notice - Campus Attendance Office*\n\nAttention: An official *${w.severity.toUpperCase()}* severity warning has been logged for *${w.student_name}* (Roll: ${w.student_roll_no}).\n\n*Category:* ${w.type}\n*Message:* ${w.message}\n\nPlease contact the administration immediately regarding this matter.`;

                      return (
                        <tr
                          key={w.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          <td className="py-2.5 px-3.5">
                            <p className="font-semibold text-slate-900 dark:text-white">{w.student_name}</p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {w.student_roll_no} • 👪 {parentName}
                            </p>
                          </td>

                          <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                            {w.type}
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide capitalize ${
                                w.severity === 'high'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                                  : w.severity === 'medium'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {w.severity}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate text-[11px]" title={w.message}>
                            {w.message}
                          </td>

                          <td className="py-2.5 px-3">
                            <select
                              value={w.status}
                              onChange={(e) => handleStatusUpdate(w.id, e.target.value)}
                              className="px-2 py-0.5 text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            >
                              <option value="sent">Sent</option>
                              <option value="read">Read</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </td>

                          <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(w.created_at).toLocaleDateString()}
                          </td>

                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-CLICK BOTH BUTTON */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenWhatsAppModal({
                                    studentName: w.student_name,
                                    parentName: parentName,
                                    studentPhone: studentPhone,
                                    parentPhone: parentPhone,
                                    studentRoll: w.student_roll_no,
                                    text: waText,
                                    preferredTarget: 'both',
                                  })
                                }
                                className="btn-press px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-[10px] font-semibold transition-colors inline-flex items-center gap-1 shadow-2xs"
                                title="Open WhatsApp modal for BOTH student & parent"
                              >
                                <MessageSquare className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                <span>WA Both</span>
                              </button>

                              {parentPhone && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenWhatsAppModal({
                                      studentName: w.student_name,
                                      parentName: parentName,
                                      studentPhone: studentPhone,
                                      parentPhone: parentPhone,
                                      studentRoll: w.student_roll_no,
                                      text: waText,
                                      preferredTarget: 'parent',
                                    })
                                  }
                                  className="btn-press px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-[10px] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                                  title={`WhatsApp Parent: ${parentPhone}`}
                                >
                                  <span>Parent</span>
                                </button>
                              )}

                              {studentPhone && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenWhatsAppModal({
                                      studentName: w.student_name,
                                      parentName: parentName,
                                      studentPhone: studentPhone,
                                      parentPhone: parentPhone,
                                      studentRoll: w.student_roll_no,
                                      text: waText,
                                      preferredTarget: 'student',
                                    })
                                  }
                                  className="btn-press px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                                  title={`WhatsApp Student: ${studentPhone}`}
                                >
                                  <span>Child</span>
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

              {/* MOBILE STREAMLINED CARD FEED */}
              <div className="md:hidden space-y-2.5">
                {filteredWarnings.map((w) => {
                  const matchingStudent = students.find((s) => s.id === w.student_id);
                  const parentPhone = w.parent_phone || matchingStudent?.parent_phone || '';
                  const studentPhone = w.student_phone || matchingStudent?.phone || '';
                  const parentName = w.parent_name || matchingStudent?.parent_name || 'Parent';
                  const waText = `*Official Academic Notice - Campus Attendance Office*\n\nAttention: An official *${w.severity.toUpperCase()}* severity warning has been logged for *${w.student_name}* (Roll: ${w.student_roll_no}).\n\n*Category:* ${w.type}\n*Message:* ${w.message}\n\nPlease contact the administration immediately regarding this matter.`;

                  return (
                    <div
                      key={w.id}
                      className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5"
                    >
                      {/* Top Header: Student & Severity */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {w.student_name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {w.student_roll_no} • {w.type}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            👪 Parent: {parentName} {parentPhone ? `(${parentPhone})` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              w.severity === 'high'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : w.severity === 'medium'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {w.severity}
                          </span>

                          <select
                            value={w.status}
                            onChange={(e) => handleStatusUpdate(w.id, e.target.value)}
                            className="px-1.5 py-0.5 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                          >
                            <option value="sent">Sent</option>
                            <option value="read">Read</option>
                            <option value="resolved">Done</option>
                          </select>
                        </div>
                      </div>

                      {/* Warning Message snippet */}
                      <div className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-800">
                        {w.message}
                      </div>

                      {/* Contact Channels & Direct Touch Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400">
                          {new Date(w.created_at).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenWhatsAppModal({
                                studentName: w.student_name,
                                parentName: parentName,
                                studentPhone: studentPhone,
                                parentPhone: parentPhone,
                                studentRoll: w.student_roll_no,
                                text: waText,
                                preferredTarget: 'both',
                              })
                            }
                            className="btn-press px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Both</span>
                          </button>

                          {parentPhone && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenWhatsAppModal({
                                  studentName: w.student_name,
                                  parentName: parentName,
                                  studentPhone: studentPhone,
                                  parentPhone: parentPhone,
                                  studentRoll: w.student_roll_no,
                                  text: waText,
                                  preferredTarget: 'parent',
                                })
                              }
                              className="btn-press px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                            >
                              <span>Parent</span>
                            </button>
                          )}

                          {studentPhone && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenWhatsAppModal({
                                  studentName: w.student_name,
                                  parentName: parentName,
                                  studentPhone: studentPhone,
                                  parentPhone: parentPhone,
                                  studentRoll: w.student_roll_no,
                                  text: waText,
                                  preferredTarget: 'student',
                                })
                              }
                              className="btn-press px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                            >
                              <span>Child</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Content: Tab 2 (Attendance Defaulters < 75%) */}
      {activeTab === 'defaulters' && (
        <div className="space-y-3">
          {/* 1-CLICK ALL DEFAULTERS DISPATCH STRIP */}
          {lowAttendanceStudents.length > 0 && (
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/20 border border-rose-200/80 dark:border-rose-900/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {lowAttendanceStudents.length} Attendance Defaulters Below 75%
                  </p>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Dispatch official high-severity warnings & emails to all {lowAttendanceStudents.length} students and their parents with a single click.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendAllDefaulters}
                disabled={bulkDefaultersSending}
                className="btn-press px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{bulkDefaultersSending ? 'Dispatching All...' : 'Send All Defaulters (1-Click)'}</span>
              </button>
            </div>
          )}

          {lowAttendanceStudents.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                No Defaulters Found
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All enrolled students currently meet or exceed the 75% attendance threshold.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {lowAttendanceStudents.map((s) => {
                const waText = `*Official Academic Notice - Campus Attendance Office*\n\nDear Parent/Guardian of ${s.name} (Roll No: ${s.roll_no}),\nThis is to notify you that your child's overall attendance is currently *${s.percentage}%*, which is below the mandatory 75% university requirement.\n\nPlease discuss this with your child and schedule a meeting with the class coordinator to avoid debarment from examinations.`;

                return (
                  <div
                    key={s.id}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {s.roll_no} • {s.class_name}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 shrink-0">
                          {s.percentage}%
                        </span>
                      </div>

                      {/* Contact Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {s.phone && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            👤 Child: {s.phone}
                          </span>
                        )}
                        {s.parent_phone && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            👪 Parent: {s.parent_phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleQuickSendLowAttendance(s)}
                        className="flex-1 btn-press px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-medium transition-colors flex items-center justify-center gap-1 shadow-2xs"
                        title="Issues official notice and dispatches Email to both child & parent"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Issue & Email</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenWhatsAppModal({
                            studentName: s.name,
                            parentName: s.parent_name || 'Parent',
                            studentPhone: s.phone,
                            parentPhone: s.parent_phone,
                            studentRoll: s.roll_no,
                            text: waText,
                            preferredTarget: 'both',
                          })
                        }
                        className="btn-press px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                        title="Open WhatsApp sheet for both child & parent"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WA Both</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ISSUE SINGLE STUDENT WARNING (With Searchable Child & Parent Picker) */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => {
          setIssueModalOpen(false);
          setPickerDropdownOpen(false);
        }}
        title="Issue Student Warning"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleIssueWarning} className="space-y-3.5">
          {/* SEARCHABLE CHILD & PARENT SELECTOR */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Child & Parent *
            </label>

            {/* Selected Student & Parent Summary Card */}
            {selectedStudentObj ? (
              <div className="p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      👤 {selectedStudentObj.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white dark:bg-slate-750 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                      {selectedStudentObj.roll_no}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                    👪 Parent: {selectedStudentObj.parent_name || 'Parent'}{' '}
                    {selectedStudentObj.parent_phone ? `(${selectedStudentObj.parent_phone})` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPickerDropdownOpen(!pickerDropdownOpen)}
                  className="btn-press px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>Change</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            ) : null}

            {/* Live Autocomplete Search Input */}
            {(!selectedStudentObj || pickerDropdownOpen) && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentPickerSearch}
                    onChange={(e) => setStudentPickerSearch(e.target.value)}
                    placeholder="Search child name, roll no, or parent name / phone..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  {studentPickerSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentPickerSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Options List */}
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md divide-y divide-slate-100 dark:divide-slate-750">
                  {filteredPickerStudents.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching student or parent found for "{studentPickerSearch}"
                    </div>
                  ) : (
                    filteredPickerStudents.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleStudentSelect(s.id)}
                        className={`p-2 sm:p-2.5 hover:bg-indigo-50/60 dark:hover:bg-slate-700/60 cursor-pointer transition-colors text-xs flex items-center justify-between gap-2 ${
                          String(form.student_id) === String(s.id)
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 font-semibold'
                            : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {s.name} <span className="text-[10px] font-mono text-slate-400">({s.roll_no})</span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            👪 Parent: {s.parent_name || 'Parent'}{' '}
                            {s.parent_phone ? `• 📞 ${s.parent_phone}` : ''}
                          </p>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                          Select
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TARGET RECIPIENT SELECTOR (Both, Child, Parent) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Send Message & WhatsApp To:
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, target: 'both' }))}
                className={`py-1 text-xs font-medium rounded-md transition-all btn-press ${
                  form.target === 'both'
                    ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                👥 Both (Child & Parent)
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, target: 'student' }))}
                className={`py-1 text-xs font-medium rounded-md transition-all btn-press ${
                  form.target === 'student'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                👤 Child (Student)
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, target: 'parent' }))}
                className={`py-1 text-xs font-medium rounded-md transition-all btn-press ${
                  form.target === 'parent'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                👪 Parent Only
              </button>
            </div>
          </div>

          {/* DUAL CONTACT NUMBERS (Live Autofilled from Database) */}
          <div className="space-y-2">
            {(form.target === 'both' || form.target === 'student') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Child (Student) WhatsApp Phone
                  </label>
                  {form.student_phone && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      ✓ Database autofilled
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={form.student_phone}
                    onChange={(e) => setForm({ ...form, student_phone: e.target.value })}
                    placeholder="e.g. 919876543210"
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            )}

            {(form.target === 'both' || form.target === 'parent') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Parent WhatsApp Phone
                  </label>
                  {form.parent_phone ? (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      ✓ Database autofilled
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-500">
                      Optional / Enter if available
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                    placeholder="e.g. 919876543210"
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Type & Severity */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
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
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (Urgent)</option>
              </select>
            </div>
          </div>

          {/* Notice Message */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notice Description *
            </label>
            <textarea
              required
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full p-2.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="State the reason, percentage, or required remedial action..."
            />
          </div>

          {/* WhatsApp Autolaunch Option */}
          <div className="pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={openWhatsAppAfter}
                onChange={(e) => setOpenWhatsAppAfter(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-0"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Open WhatsApp contact sheet immediately after issuing
              </span>
            </label>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIssueModalOpen(false);
                setPickerDropdownOpen(false);
              }}
              className="btn-press px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-press px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Warning'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: 1-CLICK BROADCAST TO ALL STUDENTS & PARENTS */}
      <Modal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        title="Broadcast Message to All Students (1-Click)"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleBroadcastAll} className="space-y-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-100">
              <Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Instant Broadcast to All Enrolled Students</span>
            </div>
            <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
              This will create official notices and dispatch automated in-app alerts + SMTP emails to all <strong>{students.length} students</strong> and their parents at once.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={broadcastForm.type}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="Low Attendance">Low Attendance</option>
                <option value="General Announcement">General Announcement</option>
                <option value="Exam Alert">Exam Alert</option>
                <option value="Discipline">Discipline</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Severity
              </label>
              <select
                value={broadcastForm.severity}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, severity: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="low">Low (Info)</option>
                <option value="medium">Medium</option>
                <option value="high">High (Urgent)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Broadcast Message Description *
            </label>
            <textarea
              required
              rows={4}
              value={broadcastForm.message}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              className="w-full p-2.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="Enter message for all students and parents (e.g. Mandatory attendance regularisation notice)..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setBroadcastModalOpen(false)}
              className="btn-press px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={broadcasting}
              className="btn-press px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>{broadcasting ? 'Broadcasting...' : `Send to All ${students.length} Students (1-Click)`}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: INTERACTIVE WHATSAPP DISPATCH (Both Child & Parent Supported) */}
      <Modal
        isOpen={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        title="WhatsApp Dispatch Sheet"
        maxWidth="max-w-lg"
      >
        <div className="space-y-3.5">
          {/* Target Tabs: Both, Child, Parent */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setWaData((prev) => ({ ...prev, targetMode: 'both' }))}
              className={`py-1 text-xs font-medium rounded-lg transition-all btn-press ${
                waData.targetMode === 'both'
                  ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              👥 Both (Child & Parent)
            </button>
            <button
              type="button"
              onClick={() => setWaData((prev) => ({ ...prev, targetMode: 'student' }))}
              className={`py-1 text-xs font-medium rounded-lg transition-all btn-press ${
                waData.targetMode === 'student'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              👤 Child (Student)
            </button>
            <button
              type="button"
              onClick={() => setWaData((prev) => ({ ...prev, targetMode: 'parent' }))}
              className={`py-1 text-xs font-medium rounded-lg transition-all btn-press ${
                waData.targetMode === 'parent'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              👪 Parent Only
            </button>
          </div>

          {/* DUAL CONTACT CARDS WITH 1-CLICK ACTIONS */}
          <div className="space-y-2">
            {/* CHILD (STUDENT) CONTACT CARD */}
            {(waData.targetMode === 'both' || waData.targetMode === 'student') && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    👤 Child: {waData.studentName} {waData.studentRoll ? `(${waData.studentRoll})` : ''}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {waData.studentPhone ? '✓ Ready' : 'No number'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={waData.studentPhone}
                      onChange={(e) => setWaData({ ...waData, studentPhone: e.target.value })}
                      placeholder="Student WhatsApp number (e.g. 919876543210)"
                      className="w-full pl-8 pr-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => launchWhatsAppLink(waData.studentPhone, waData.text, 'web')}
                    className="btn-press px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium inline-flex items-center gap-1 shrink-0 shadow-2xs"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Send Child</span>
                  </button>
                </div>
              </div>
            )}

            {/* PARENT CONTACT CARD */}
            {(waData.targetMode === 'both' || waData.targetMode === 'parent') && (
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    👪 Parent: {waData.parentName || `Parent of ${waData.studentName}`}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    {waData.parentPhone ? '✓ Ready' : 'Enter number'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={waData.parentPhone}
                      onChange={(e) => setWaData({ ...waData, parentPhone: e.target.value })}
                      placeholder="Parent WhatsApp number (e.g. 919876543210)"
                      className="w-full pl-8 pr-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => launchWhatsAppLink(waData.parentPhone, waData.text, 'web')}
                    className="btn-press px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium inline-flex items-center gap-1 shrink-0 shadow-2xs"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Send Parent</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Formatted Notice Preview with 1-click Copy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Notice Preview
              </label>
              <button
                type="button"
                onClick={handleCopyWhatsAppText}
                className="btn-press inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={waData.text}
              onChange={(e) => setWaData({ ...waData, text: e.target.value })}
              className="w-full p-2.5 text-xs font-mono rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* MASTER 1-CLICK BUTTON TO DISPATCH BOTH */}
          {waData.targetMode === 'both' && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleLaunchWhatsAppBoth('web')}
                className="w-full btn-press py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch WhatsApp for Both (Child & Parent)</span>
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
