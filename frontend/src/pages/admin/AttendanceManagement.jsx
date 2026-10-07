import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  History,
  Save,
  Filter,
  Plus,
  Edit2,
  X,
  BookOpen,
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

const TIME_SLOT_OPTIONS = [
  '09:00 - 10:00 AM (Period 1)',
  '10:00 - 11:00 AM (Period 2)',
  '11:15 - 12:15 PM (Period 3)',
  '12:15 - 01:15 PM (Period 4)',
  '02:00 - 03:00 PM (Period 5)',
  '03:00 - 04:00 PM (Period 6)',
  'Custom Slot',
];

export const AttendanceManagement = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOT_OPTIONS[0]);
  const [customTimeSlot, setCustomTimeSlot] = useState('');
  const [recordedTimeSlot, setRecordedTimeSlot] = useState(null);
  const [attendanceSlotMap, setAttendanceSlotMap] = useState({});

  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: 'Present' | 'Absent' | 'Late' | 'Leave' }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Audit trail state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditList, setAuditList] = useState([]);
  const [auditStudentName, setAuditStudentName] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // Selected class object and its specific semester subjects
  const selectedClassObj = classes.find((c) => String(c.id) === String(selectedClass));
  const availableSubjects = selectedClassObj?.subjects || [];

  const fetchAcademicData = async () => {
    try {
      const classRes = await api.get('/admin/classes');
      if (classRes.success) {
        setClasses(classRes.data);
        if (classRes.data.length > 0) {
          const firstClass = classRes.data[0];
          setSelectedClass(String(firstClass.id));
          if (firstClass.subjects && firstClass.subjects.length > 0) {
            setSelectedSubject(String(firstClass.subjects[0].id));
          }
        }
      }
    } catch {
      toast.error('Failed to load classes and subjects');
    }
  };

  // Synchronize selected subject when the user switches semester / class
  useEffect(() => {
    if (!selectedClass || classes.length === 0) return;
    const currentClass = classes.find((c) => String(c.id) === String(selectedClass));
    const semSubjects = currentClass?.subjects || [];
    if (semSubjects.length > 0) {
      const stillValid = semSubjects.some((s) => String(s.id) === String(selectedSubject));
      if (!stillValid) {
        setSelectedSubject(String(semSubjects[0].id));
      }
    } else {
      setSelectedSubject('');
    }
  }, [selectedClass, classes]);

  // Quick Add & Edit Subject Modal States
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState('add'); // 'add' | 'edit'
  const [subjectFormData, setSubjectFormData] = useState({ name: '', code: '' });
  const [subjectSaving, setSubjectSaving] = useState(false);

  const openAddSubjectModal = () => {
    setSubjectModalMode('add');
    setSubjectFormData({ name: '', code: '' });
    setIsSubjectModalOpen(true);
  };

  const openEditSubjectModal = () => {
    const currentSubj = availableSubjects.find((s) => String(s.id) === String(selectedSubject));
    if (!currentSubj) return;
    setSubjectModalMode('edit');
    setSubjectFormData({ name: currentSubj.name, code: currentSubj.code });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubjectModal = async (e) => {
    e.preventDefault();
    if (!subjectFormData.name.trim() || !subjectFormData.code.trim()) {
      toast.error('Subject name and code are required');
      return;
    }

    setSubjectSaving(true);
    try {
      if (subjectModalMode === 'add') {
        const payload = {
          name: subjectFormData.name.trim(),
          code: subjectFormData.code.trim().toUpperCase(),
          class_ids: selectedClass ? [Number(selectedClass)] : [],
        };
        const res = await api.post('/admin/subjects', payload);
        if (res.success) {
          toast.success(`Created "${res.data.name}" and assigned to ${selectedClassObj?.name || 'semester'}`);
          setIsSubjectModalOpen(false);
          const classRes = await api.get('/admin/classes');
          if (classRes.success) {
            setClasses(classRes.data);
            setSelectedSubject(String(res.data.id));
          }
        }
      } else {
        const currentSubj = availableSubjects.find((s) => String(s.id) === String(selectedSubject));
        if (!currentSubj) return;

        const payload = {
          name: subjectFormData.name.trim(),
          code: subjectFormData.code.trim().toUpperCase(),
        };
        const res = await api.put(`/admin/subjects/${currentSubj.id}`, payload);
        if (res.success) {
          toast.success(`Updated subject "${res.data.name}"`);
          setIsSubjectModalOpen(false);
          const classRes = await api.get('/admin/classes');
          if (classRes.success) {
            setClasses(classRes.data);
          }
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save subject');
    } finally {
      setSubjectSaving(false);
    }
  };

  const fetchAttendanceSheet = async () => {
    if (!selectedClass || !selectedSubject) return;
    setLoading(true);
    try {
      // 1. Fetch students for the class (alphabetical order)
      const studRes = await api.get(`/admin/students?class_id=${selectedClass}&page=1&page_size=100&sort_by=name&sort_order=asc`);
      const fetchedStudents = (studRes.data?.items || []).sort((a, b) => a.name.localeCompare(b.name));
      setStudents(fetchedStudents);

      // 2. Fetch existing attendance for this class, subject, date
      const attRes = await api.get(
        `/admin/attendance?class_id=${selectedClass}&subject_id=${selectedSubject}&date_val=${selectedDate}`
      );
      const existingRecords = attRes.data || [];

      // Build status and slot maps (default to Present if not yet recorded)
      const map = {};
      const slotMap = {};
      let firstSlot = null;

      existingRecords.forEach((r) => {
        map[r.student_id] = r.status;
        if (r.time_slot) {
          slotMap[r.student_id] = r.time_slot;
          if (!firstSlot) firstSlot = r.time_slot;
        }
      });

      fetchedStudents.forEach((s) => {
        if (!map[s.id]) {
          map[s.id] = 'Present'; // Default preset
        }
      });

      setAttendanceMap(map);
      setAttendanceSlotMap(slotMap);
      setRecordedTimeSlot(firstSlot);
      if (firstSlot) {
        if (TIME_SLOT_OPTIONS.includes(firstSlot)) {
          setSelectedTimeSlot(firstSlot);
        } else {
          setSelectedTimeSlot('Custom Slot');
          setCustomTimeSlot(firstSlot);
        }
      }
    } catch {
      toast.error('Failed to fetch attendance sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicData();
  }, []);

  useEffect(() => {
    fetchAttendanceSheet();
  }, [selectedClass, selectedSubject, selectedDate]);

  const handleMarkAll = (status) => {
    const updated = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
    toast.success(`Marked all as ${status}`);
  };

  const handleSingleStatusChange = (studentId, status) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }
    const effectiveSlot = selectedTimeSlot === 'Custom Slot'
      ? (customTimeSlot.trim() || null)
      : selectedTimeSlot;

    setSaving(true);
    try {
      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
        student_id: Number(studentId),
        status,
        time_slot: effectiveSlot,
      }));

      const res = await api.post('/admin/attendance/batch', {
        subject_id: Number(selectedSubject),
        date: selectedDate,
        time_slot: effectiveSlot,
        records,
      });

      if (res.success) {
        toast.success(res.message);
        setRecordedTimeSlot(effectiveSlot);
        fetchAttendanceSheet();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleViewAuditTrail = async (student) => {
    setAuditStudentName(student.name);
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      // Find attendance record ID for this student
      const attRes = await api.get(
        `/admin/attendance?student_id=${student.id}&subject_id=${selectedSubject}&date_val=${selectedDate}`
      );
      if (attRes.success && attRes.data?.length > 0) {
        const attId = attRes.data[0].id;
        const auditRes = await api.get(`/admin/attendance/${attId}/audits`);
        if (auditRes.success) setAuditList(auditRes.data);
      } else {
        setAuditList([]);
      }
    } catch {
      toast.error('Failed to load audit trail');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleExportAttendance = () => {
    const effectiveSlot = selectedTimeSlot === 'Custom Slot' ? customTimeSlot.trim() : selectedTimeSlot;
    let url = `/api/v1/admin/attendance/export/csv?class_id=${selectedClass}&subject_id=${selectedSubject}&date_val=${selectedDate}`;
    if (effectiveSlot) {
      url += `&time_slot=${encodeURIComponent(effectiveSlot)}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Attendance Administration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Log real-time attendance, modify past dates with audit logging, and export class reports
          </p>
        </div>

        <button
          onClick={handleExportAttendance}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Attendance Report (CSV)
        </button>
      </div>

      {/* Control Bar: Class, Subject, Date, Period Slot, Mark All */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* Class / Course */}
          <div className="min-w-0">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 truncate">
              Class / Course
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none truncate"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                Subject
              </label>
              <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={openAddSubjectModal}
                  className="inline-flex items-center gap-0.5 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                  title="Add new subject to this semester"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
                {selectedSubject && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={openEditSubjectModal}
                      className="inline-flex items-center gap-0.5 font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                      title="Edit currently selected subject"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={availableSubjects.length === 0}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 truncate"
            >
              {availableSubjects.length === 0 ? (
                <option value="">No subjects assigned to this semester</option>
              ) : (
                availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date */}
          <div className="min-w-0">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 truncate">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Period / Time Slot */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                Period / Time Slot
              </label>
              {recordedTimeSlot && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Recorded
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="relative">
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none truncate"
                >
                  {TIME_SLOT_OPTIONS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {selectedTimeSlot === 'Custom Slot' && (
                <input
                  type="text"
                  placeholder="e.g. 09:30 - 10:30 AM (Lab)"
                  value={customTimeSlot}
                  onChange={(e) => setCustomTimeSlot(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/30 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
            </div>
          </div>
        </div>

        {/* Action Shortcuts & Save */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Quick Shortcuts:</span>
            <button
              type="button"
              onClick={() => handleMarkAll('Present')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('Absent')}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors"
            >
              Mark All Absent
            </button>
          </div>

          <button
            type="button"
            disabled={saving || students.length === 0}
            onClick={handleSaveAttendance}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save & Broadcast Attendance'}
          </button>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader count={6} type="table" />
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No students enrolled in this class"
            description="Select another class or register students into this class first."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Roll No</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Section</th>
                  <th className="py-3.5 px-4">Period / Slot</th>
                  <th className="py-3.5 px-4 text-center">Status Selection</th>
                  <th className="py-3.5 px-4 text-right">Audit Trail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {students.map((student) => {
                  const currentStatus = attendanceMap[student.id] || 'Present';
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {student.roll_no}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {student.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">Sec {student.section}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          {attendanceSlotMap[student.id] || (selectedTimeSlot === 'Custom Slot' ? (customTimeSlot.trim() || 'Period 1') : selectedTimeSlot)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {['Present', 'Absent', 'Late', 'Leave'].map((st) => {
                            const isSelected = currentStatus === st;
                            let activeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800';
                            if (isSelected) {
                              if (st === 'Present')
                                activeClass = 'bg-emerald-600 text-white font-bold shadow-sm';
                              else if (st === 'Absent')
                                activeClass = 'bg-rose-600 text-white font-bold shadow-sm';
                              else if (st === 'Late')
                                activeClass = 'bg-amber-600 text-white font-bold shadow-sm';
                              else if (st === 'Leave')
                                activeClass = 'bg-blue-600 text-white font-bold shadow-sm';
                            }
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleSingleStatusChange(student.id, st)}
                                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                                  isSelected
                                    ? activeClass
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewAuditTrail(student)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                          Audit Log
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Trail Modal */}
      <Modal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        title={`Audit Trail: ${auditStudentName} (${selectedDate})`}
        maxWidth="max-w-lg"
      >
        {auditLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading audit log...</div>
        ) : auditList.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No historical modifications recorded for this entry.
          </p>
        ) : (
          <div className="space-y-3">
            {auditList.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-slate-400">{log.old_status}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {log.new_status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Modified by: {log.changed_by_name || 'Admin'}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(log.changed_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Quick Add / Edit Subject Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
            <button
              onClick={() => setIsSubjectModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
              <BookOpen className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {subjectModalMode === 'add' ? 'Add Subject' : 'Edit Subject'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {subjectModalMode === 'add'
                ? `Add New Subject to ${selectedClassObj?.name || 'Semester'}`
                : `Edit Subject: ${subjectFormData.name || ''}`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {subjectModalMode === 'add'
                ? `The new subject will be registered in the catalog and immediately linked to ${selectedClassObj?.name || 'this semester'}.`
                : 'Modify the subject course title or curriculum code.'}
            </p>

            <form onSubmit={handleSaveSubjectModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Cloud Computing"
                  value={subjectFormData.name}
                  onChange={(e) =>
                    setSubjectFormData({ ...subjectFormData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Course Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS410"
                  value={subjectFormData.code}
                  onChange={(e) =>
                    setSubjectFormData({ ...subjectFormData, code: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subjectSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {subjectSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{subjectModalMode === 'add' ? 'Add Subject' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
