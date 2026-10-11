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
  AlertCircle
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

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [openWhatsAppAfter, setOpenWhatsAppAfter] = useState(true);
  const [form, setForm] = useState({
    student_id: '',
    type: 'Low Attendance',
    severity: 'medium',
    message: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Dedicated interactive WhatsApp Dispatch Modal state
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waData, setWaData] = useState({
    recipientName: '',
    phone: '',
    text: '',
    studentPhone: '',
    parentPhone: '',
    studentName: '',
    parentName: '',
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
    const phoneToUse = s?.phone || s?.parent_phone || '';
    setForm((prev) => ({
      ...prev,
      student_id: String(studentId),
      phone: normalizeWhatsAppPhone(phoneToUse),
    }));
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
          const firstPhone = first.phone || first.parent_phone || '';
          setForm((prev) => ({
            ...prev,
            student_id: String(first.id),
            phone: normalizeWhatsAppPhone(firstPhone),
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

    const cleanStudentPhone = normalizeWhatsAppPhone(studentPhone);
    const cleanParentPhone = normalizeWhatsAppPhone(parentPhone);
    const cleanPassedPhone = normalizeWhatsAppPhone(phone);

    const chosenCleanPhone = cleanPassedPhone || cleanStudentPhone || cleanParentPhone || '';

    const resolvedRecipient =
      recipientName ||
      (chosenCleanPhone && chosenCleanPhone === cleanStudentPhone
        ? (studentName ? `${studentName} (Student)` : 'Student')
        : chosenCleanPhone && chosenCleanPhone === cleanParentPhone
        ? (parentName ? `${parentName} (Parent)` : 'Parent')
        : (studentName || 'Student Contact'));

    setWaData({
      recipientName: resolvedRecipient,
      phone: chosenCleanPhone,
      text: waText,
      studentPhone: cleanStudentPhone,
      parentPhone: cleanParentPhone,
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
          const chosenPhone = form.phone || sPhone || pPhone;
          handleOpenWhatsAppModal({
            phone: chosenPhone,
            contactName: chosenPhone && chosenPhone === normalizeWhatsAppPhone(pPhone) ? `${pName} (Parent of ${targetName})` : targetName,
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
        toast.success(`Dispatched warning alert & email to ${student.name} and parent!`);
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

  // Filtered warnings list
  const filteredWarnings = useMemo(() => {
    return warnings.filter((w) => {
      const matchesSearch =
        !searchQuery ||
        (w.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.student_roll_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.type || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || w.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [warnings, searchQuery, statusFilter, severityFilter]);

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
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Dual Dispatch
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage academic notices with automated Email (Gmail) and direct WhatsApp contact
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <button
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="flex-1 sm:flex-initial btn-press px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs disabled:opacity-50"
            title="Verify Gmail SMTP connection"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{testingEmail ? 'Testing...' : 'Test SMTP'}</span>
          </button>

          <button
            onClick={() => setIssueModalOpen(true)}
            className="flex-1 sm:flex-initial btn-press px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
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

        {/* Filter & Search Bar */}
        {activeTab === 'warnings' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search warnings..."
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
                    ? "Try adjusting your search criteria or status filter."
                    : "All students are currently in good standing without active disciplinary warnings."
                }
              />
            </div>
          ) : (
            <>
              {/* DESKTOP / WINDOWS FLUENT DATA GRID (hidden on screens < 768px) */}
              <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200/80 dark:border-slate-800/80">
                    <tr>
                      <th className="py-2.5 px-3.5">Student</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Message</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Issued</th>
                      <th className="py-2.5 px-3.5 text-right">Direct Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredWarnings.map((w) => {
                      const matchingStudent = students.find((s) => s.id === w.student_id);
                      const parentPhone = w.parent_phone || matchingStudent?.parent_phone || '';
                      const studentPhone = w.student_phone || matchingStudent?.phone || '';
                      const parentName = w.parent_name || matchingStudent?.parent_name || '';
                      const waText = `*Official Academic Notice - Campus Attendance Office*\n\nAttention: An official *${w.severity.toUpperCase()}* severity warning has been logged for *${w.student_name}* (Roll: ${w.student_roll_no}).\n\n*Category:* ${w.type}\n*Message:* ${w.message}\n\nPlease contact the administration immediately regarding this matter.`;

                      return (
                        <tr
                          key={w.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          <td className="py-2.5 px-3.5">
                            <p className="font-semibold text-slate-900 dark:text-white">{w.student_name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{w.student_roll_no}</p>
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
                                  className="btn-press px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-[10px] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                                  title={`WhatsApp Parent: ${parentPhone}`}
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>Parent</span>
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
                                  className="btn-press px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                                  title={`WhatsApp Student: ${studentPhone}`}
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>Student</span>
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
                                  className="btn-press px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium transition-colors inline-flex items-center gap-1"
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>WA</span>
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

              {/* MOBILE STREAMLINED CARD FEED (visible on screens < 768px, zero table horizontal scrolling) */}
              <div className="md:hidden space-y-2.5">
                {filteredWarnings.map((w) => {
                  const matchingStudent = students.find((s) => s.id === w.student_id);
                  const parentPhone = w.parent_phone || matchingStudent?.parent_phone || '';
                  const studentPhone = w.student_phone || matchingStudent?.phone || '';
                  const parentName = w.parent_name || matchingStudent?.parent_name || '';
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
                              className="btn-press px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Parent</span>
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
                              className="btn-press px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Student</span>
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
                const waTextParent = `*Official Academic Notice - Campus Attendance Office*\n\nDear Parent/Guardian of ${s.name} (Roll No: ${s.roll_no}),\nThis is to notify you that your child's overall attendance is currently *${s.percentage}%*, which is below the mandatory 75% university requirement.\n\nPlease discuss this with your child and schedule a meeting with the class coordinator to avoid debarment from examinations.`;
                const waTextStudent = `*Official Academic Notice - Campus Attendance Office*\n\nAttention ${s.name} (${s.roll_no}),\nYour overall attendance has dropped to *${s.percentage}%* (Below 75% minimum threshold).\nPlease meet your class coordinator immediately to regularize your attendance.`;

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
                            👤 {s.phone}
                          </span>
                        )}
                        {s.parent_phone && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            👪 {s.parent_phone}
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
                        title="Issues official notice and dispatches Email + In-App alert"
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
                        className="btn-press px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                        title="Open WhatsApp modal with prefilled notice"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MINIMAL ISSUE WARNING MODAL */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Issue Student Warning"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleIssueWarning} className="space-y-3.5">
          {/* Target Student */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Student *
            </label>
            <select
              required
              value={form.student_id}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll_no})
                </option>
              ))}
            </select>
          </div>

          {/* Database Phone Autofill & Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                WhatsApp Phone *
              </label>
              {form.phone && (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Database autofilled
                </span>
              )}
            </div>

            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. 919876543210"
                className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            {/* Quick-switch pills for stored database contacts */}
            {(() => {
              const currentStudent = students.find((s) => String(s.id) === String(form.student_id));
              if (!currentStudent) return null;
              return (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">Autofill from:</span>
                  {currentStudent.phone && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, phone: normalizeWhatsAppPhone(currentStudent.phone) }))}
                      className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer btn-press ${
                        form.phone === normalizeWhatsAppPhone(currentStudent.phone)
                          ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      👤 Student: {normalizeWhatsAppPhone(currentStudent.phone)}
                    </button>
                  )}
                  {currentStudent.parent_phone && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, phone: normalizeWhatsAppPhone(currentStudent.parent_phone) }))}
                      className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer btn-press ${
                        form.phone === normalizeWhatsAppPhone(currentStudent.parent_phone)
                          ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      👪 Parent: {normalizeWhatsAppPhone(currentStudent.parent_phone)}
                    </button>
                  )}
                </div>
              );
            })()}
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
              onClick={() => setIssueModalOpen(false)}
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

      {/* MINIMAL INTERACTIVE WHATSAPP MODAL */}
      <Modal
        isOpen={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        title="WhatsApp Dispatch Sheet"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5">
          {/* Target Banner */}
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>To: {waData.recipientName}</span>
            </div>
            <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-mono">
              Direct API
            </span>
          </div>

          {/* Quick Contact Toggle Pills */}
          {(waData.studentPhone || waData.parentPhone) && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Switch Contact Target:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
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
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 btn-press cursor-pointer ${
                      waData.phone === waData.studentPhone
                        ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>👤 Student:</span>
                    <span className="font-mono">{waData.studentPhone}</span>
                  </button>
                )}

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
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 btn-press cursor-pointer ${
                      waData.phone === waData.parentPhone
                        ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>👪 Parent:</span>
                    <span className="font-mono">{waData.parentPhone}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Editable WhatsApp Phone Number */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              WhatsApp Phone Number *
            </label>
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
          </div>

          {/* Notice Textarea with Copy Button */}
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

          {/* Action Launch Buttons (Desktop Web & Mobile/App) */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleLaunchWhatsApp('web')}
              className="btn-press px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>WhatsApp Web</span>
            </button>

            <button
              type="button"
              onClick={() => handleLaunchWhatsApp('app')}
              className="btn-press px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp App</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
