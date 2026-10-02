import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  FileSpreadsheet,
  Trash2,
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

export const MarksManagement = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [students, setStudents] = useState([]);
  const [marksMap, setMarksMap] = useState({}); // { studentId: marksObtained }
  const [maxMarks, setMaxMarks] = useState(100.0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createExamModalOpen, setCreateExamModalOpen] = useState(false);

  const [examForm, setExamForm] = useState({
    name: '',
    exam_type: 'Unit Test',
    class_id: '',
    date: new Date().toISOString().split('T')[0],
    is_published: false,
  });

  const fetchInitialData = async () => {
    try {
      const [exRes, clRes, subRes] = await Promise.all([
        api.get('/admin/exams'),
        api.get('/admin/classes'),
        api.get('/admin/subjects'),
      ]);
      if (exRes.success) {
        setExams(exRes.data);
        if (exRes.data.length > 0) setSelectedExamId(String(exRes.data[0].id));
      }
      if (clRes.success) {
        setClasses(clRes.data);
        if (clRes.data.length > 0) {
          setExamForm((prev) => ({ ...prev, class_id: String(clRes.data[0].id) }));
        }
      }
      if (subRes.success) {
        setSubjects(subRes.data);
        if (subRes.data.length > 0) setSelectedSubjectId(String(subRes.data[0].id));
      }
    } catch {
      toast.error('Failed to load academic data');
    } finally {
      setLoading(false);
    }
  };
  // Current exam, class and available subjects for marks entry
  const currentExam = exams.find((e) => String(e.id) === String(selectedExamId));
  const examClass = classes.find((c) => String(c.id) === String(currentExam?.class_id));
  const availableSubjects = examClass?.subjects && examClass.subjects.length > 0
    ? examClass.subjects
    : subjects;

  // Synchronize subject when selected exam changes
  useEffect(() => {
    if (!selectedExamId || availableSubjects.length === 0) return;
    const stillValid = availableSubjects.some((s) => String(s.id) === String(selectedSubjectId));
    if (!stillValid) {
      setSelectedSubjectId(String(availableSubjects[0].id));
    }
  }, [selectedExamId, availableSubjects]);

  // Quick Add & Edit Subject Modal States
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState('add');
  const [subjectFormData, setSubjectFormData] = useState({ name: '', code: '' });
  const [subjectSaving, setSubjectSaving] = useState(false);

  const openAddSubjectModal = () => {
    setSubjectModalMode('add');
    setSubjectFormData({ name: '', code: '' });
    setIsSubjectModalOpen(true);
  };

  const openEditSubjectModal = () => {
    const currentSubj = availableSubjects.find((s) => String(s.id) === String(selectedSubjectId));
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
          class_ids: currentExam?.class_id ? [Number(currentExam.class_id)] : [],
        };
        const res = await api.post('/admin/subjects', payload);
        if (res.success) {
          toast.success(`Created "${res.data.name}" and assigned to ${examClass?.name || 'semester'}`);
          setIsSubjectModalOpen(false);
          const [clRes, subRes] = await Promise.all([
            api.get('/admin/classes'),
            api.get('/admin/subjects'),
          ]);
          if (clRes.success) setClasses(clRes.data);
          if (subRes.success) {
            setSubjects(subRes.data);
            setSelectedSubjectId(String(res.data.id));
          }
        }
      } else {
        const currentSubj = availableSubjects.find((s) => String(s.id) === String(selectedSubjectId));
        if (!currentSubj) return;

        const payload = {
          name: subjectFormData.name.trim(),
          code: subjectFormData.code.trim().toUpperCase(),
        };
        const res = await api.put(`/admin/subjects/${currentSubj.id}`, payload);
        if (res.success) {
          toast.success(`Updated subject "${res.data.name}"`);
          setIsSubjectModalOpen(false);
          const [clRes, subRes] = await Promise.all([
            api.get('/admin/classes'),
            api.get('/admin/subjects'),
          ]);
          if (clRes.success) setClasses(clRes.data);
          if (subRes.success) setSubjects(subRes.data);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save subject');
    } finally {
      setSubjectSaving(false);
    }
  };

  const fetchMarksSheet = async () => {
    if (!selectedExamId || !selectedSubjectId) return;
    setLoading(true);
    try {
      // 1. Get Exam details to find associated class
      const currentExam = exams.find((e) => String(e.id) === String(selectedExamId));
      if (!currentExam) return;

      // 2. Fetch students of that class
      const studRes = await api.get(`/admin/students?class_id=${currentExam.class_id}&page=1&page_size=100`);
      const fetchedStudents = studRes.data?.items || [];
      setStudents(fetchedStudents);

      // 3. Fetch current marks
      const marksRes = await api.get(
        `/admin/marks?exam_id=${selectedExamId}&subject_id=${selectedSubjectId}`
      );
      const existingMarks = marksRes.data || [];

      const map = {};
      existingMarks.forEach((m) => {
        map[m.student_id] = m.marks_obtained;
      });
      setMarksMap(map);
      if (existingMarks.length > 0) {
        setMaxMarks(existingMarks[0].max_marks);
      }
    } catch {
      toast.error('Failed to fetch marks grid');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchMarksSheet();
  }, [selectedExamId, selectedSubjectId]);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/exams', {
        ...examForm,
        class_id: Number(examForm.class_id),
      });
      if (res.success) {
        toast.success(res.message);
        setCreateExamModalOpen(false);
        const exRes = await api.get('/admin/exams');
        if (exRes.success) {
          setExams(exRes.data);
          setSelectedExamId(String(res.data.id));
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create exam');
    }
  };

  const handleTogglePublish = async (exam) => {
    try {
      const res = await api.put(`/admin/exams/${exam.id}`, {
        is_published: !exam.is_published,
      });
      if (res.success) {
        toast.success(`Exam is now ${!exam.is_published ? 'Published' : 'Hidden'}`);
        setExams((prev) =>
          prev.map((e) => (e.id === exam.id ? { ...e, is_published: !exam.is_published } : e))
        );
      }
    } catch (err) {
      toast.error('Failed to update publication status');
    }
  };

  const handleSaveMarks = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(marksMap).map(([studentId, marks]) => ({
        student_id: Number(studentId),
        subject_id: Number(selectedSubjectId),
        marks_obtained: Number(marks) || 0.0,
        max_marks: Number(maxMarks) || 100.0,
      }));

      const res = await api.post('/admin/marks/batch', {
        exam_id: Number(selectedExamId),
        subject_id: Number(selectedSubjectId),
        max_marks: Number(maxMarks),
        entries,
      });

      if (res.success) {
        toast.success(res.message);
        fetchMarksSheet();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Marks & Examination Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create academic exams, input marks per subject, toggle result publication, and rank students
          </p>
        </div>

        <button
          onClick={() => setCreateExamModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Exam
        </button>
      </div>

      {/* Selector & Publication Bar */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Exam
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.class_name || 'Class'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Subject
              </label>
              <div className="flex items-center gap-1.5">
                {examClass && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {availableSubjects.length} subject{availableSubjects.length !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={openAddSubjectModal}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                  title="Add new subject to this exam's semester"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
                {selectedSubjectId && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={openEditSubjectModal}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                      title="Edit currently selected subject"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={availableSubjects.length === 0}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
              >
                {availableSubjects.length === 0 ? (
                  <option value="">No subjects found for this exam's semester</option>
                ) : (
                  availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={openAddSubjectModal}
                className="p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer shrink-0"
                title="Add new subject to this exam's semester"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={!selectedSubjectId}
                onClick={openEditSubjectModal}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                title="Edit currently selected subject"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Maximum Marks
            </label>
            <input
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Exam Status & Save Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {currentExam && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">Publication Status:</span>
              <button
                type="button"
                onClick={() => handleTogglePublish(currentExam)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  currentExam.is_published
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {currentExam.is_published ? (
                  <>
                    <Eye className="w-3.5 h-3.5" /> Published to Students & Parents
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> Unpublished (Draft Only)
                  </>
                )}
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={saving || students.length === 0}
            onClick={handleSaveMarks}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Marks Grid'}
          </button>
        </div>
      </div>

      {/* Marks Grid Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader count={5} type="table" />
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No students found for this exam class"
            description="Select another exam or add students to the class."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Roll No</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Section</th>
                  <th className="py-3.5 px-4">Marks Obtained (Out of {maxMarks})</th>
                  <th className="py-3.5 px-4">Percentage</th>
                  <th className="py-3.5 px-4">Calculated Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {students.map((student) => {
                  const score = marksMap[student.id] !== undefined ? marksMap[student.id] : '';
                  const numScore = Number(score) || 0;
                  const pct = maxMarks > 0 ? Math.round((numScore / maxMarks) * 100) : 0;
                  let grade = 'F';
                  if (pct >= 90) grade = 'A+';
                  else if (pct >= 80) grade = 'A';
                  else if (pct >= 70) grade = 'B';
                  else if (pct >= 60) grade = 'C';
                  else if (pct >= 50) grade = 'D';
                  else if (pct >= 40) grade = 'E';

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {student.roll_no}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {student.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">Sec {student.section}</td>
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          min="0"
                          max={maxMarks}
                          step="0.5"
                          value={score}
                          onChange={(e) =>
                            setMarksMap({ ...marksMap, [student.id]: e.target.value })
                          }
                          className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="Score"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {pct}%
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            grade.startsWith('A')
                              ? 'present'
                              : grade === 'F'
                              ? 'absent'
                              : 'late'
                          }
                          size="sm"
                        >
                          Grade {grade}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Exam Modal */}
      <Modal
        isOpen={createExamModalOpen}
        onClose={() => setCreateExamModalOpen(false)}
        title="Schedule New Examination"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Exam Name *
            </label>
            <input
              type="text"
              required
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              placeholder="Unit Test 2, Mid-Term 2026..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Exam Type
            </label>
            <select
              value={examForm.exam_type}
              onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="Unit Test">Unit Test</option>
              <option value="Mid-term">Mid-term</option>
              <option value="Final">Final</option>
              <option value="Assignment">Assignment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Class
            </label>
            <select
              value={examForm.class_id}
              onChange={(e) => setExamForm({ ...examForm, class_id: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Exam Date
            </label>
            <input
              type="date"
              value={examForm.date}
              onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setCreateExamModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Create Exam
            </button>
          </div>
        </form>
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
                ? `Add New Subject to ${examClass?.name || 'Semester'}`
                : `Edit Subject: ${subjectFormData.name || ''}`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {subjectModalMode === 'add'
                ? `The new subject will be registered in the catalog and immediately linked to ${examClass?.name || 'this semester'}.`
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
