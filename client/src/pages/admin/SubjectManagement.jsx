import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  GraduationCap,
  AlertCircle,
  Save,
  CheckSquare,
  Square,
  Calendar,
  Filter,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const SubjectManagement = () => {
  const [classes, setClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active view tab: 'semester_curriculum' or 'master_catalog'
  const [activeTab, setActiveTab] = useState('semester_curriculum');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', class_ids: [] });

  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const [semesterForm, setSemesterForm] = useState({ name: '', sections: 'A,B' });

  // Delete confirmations
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: null, // 'subject' or 'class'
    id: null,
    name: '',
  });

  // Load all classes and subjects
  const fetchCurriculumData = async () => {
    setLoading(true);
    try {
      const [classRes, subjRes] = await Promise.all([
        api.get('/admin/classes'),
        api.get('/admin/subjects'),
      ]);

      if (classRes.success) {
        setClasses(classRes.data);
        if (classRes.data.length > 0 && !selectedClassId) {
          setSelectedClassId(classRes.data[0].id);
        }
      }
      if (subjRes.success) {
        setAllSubjects(subjRes.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load curriculum data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculumData();
  }, []);

  // Currently selected class object
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0] || null;
  }, [classes, selectedClassId]);

  // Current semester's assigned subjects
  const currentSemesterSubjects = useMemo(() => {
    return currentClass?.subjects || [];
  }, [currentClass]);

  // Filtered master catalog
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return allSubjects;
    const q = searchQuery.toLowerCase();
    return allSubjects.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [allSubjects, searchQuery]);

  // Temporary selected subjects set for the assignment modal
  const [assignedSubjectIds, setAssignedSubjectIds] = useState([]);

  const openAssignModal = () => {
    if (!currentClass) return;
    setAssignedSubjectIds((currentClass.subjects || []).map((s) => s.id));
    setIsAssignModalOpen(true);
  };

  const toggleAssignSubject = (subjectId) => {
    setAssignedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSaveSemesterSubjects = async () => {
    if (!currentClass) return;
    setSaving(true);
    try {
      const res = await api.put(`/admin/classes/${currentClass.id}/subjects`, {
        subject_ids: assignedSubjectIds,
      });
      if (res.success) {
        toast.success(`Updated subjects for ${currentClass.name}`);
        setIsAssignModalOpen(false);
        fetchCurriculumData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update semester subjects');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickRemoveFromSemester = async (subjectId, subjectName) => {
    if (!currentClass) return;
    const newSubjectIds = (currentClass.subjects || [])
      .map((s) => s.id)
      .filter((id) => id !== subjectId);

    try {
      const res = await api.put(`/admin/classes/${currentClass.id}/subjects`, {
        subject_ids: newSubjectIds,
      });
      if (res.success) {
        toast.success(`Removed "${subjectName}" from ${currentClass.name}`);
        fetchCurriculumData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remove subject from semester');
    }
  };

  // Open Subject Create / Edit Modal
  const openSubjectModal = (subj = null) => {
    if (subj) {
      setEditingSubject(subj);
      // Pre-select classes this subject is linked to
      const linkedClassIds = classes
        .filter((c) => (c.subjects || []).some((s) => s.id === subj.id))
        .map((c) => c.id);

      setSubjectForm({
        name: subj.name,
        code: subj.code,
        class_ids: linkedClassIds,
      });
    } else {
      setEditingSubject(null);
      // Pre-select current semester
      setSubjectForm({
        name: '',
        code: '',
        class_ids: currentClass ? [currentClass.id] : [],
      });
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
      toast.error('Subject name and code are required');
      return;
    }

    setSaving(true);
    try {
      if (editingSubject) {
        const res = await api.put(`/admin/subjects/${editingSubject.id}`, {
          name: subjectForm.name.trim(),
          code: subjectForm.code.trim().toUpperCase(),
          class_ids: subjectForm.class_ids,
        });
        if (res.success) {
          toast.success(`Updated subject "${res.data.name}"`);
          setIsSubjectModalOpen(false);
          fetchCurriculumData();
        }
      } else {
        const res = await api.post('/admin/subjects', {
          name: subjectForm.name.trim(),
          code: subjectForm.code.trim().toUpperCase(),
          class_ids: subjectForm.class_ids,
        });
        if (res.success) {
          toast.success(`Created subject "${res.data.name}"`);
          setIsSubjectModalOpen(false);
          fetchCurriculumData();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  // Open Semester Create / Edit Modal
  const openSemesterModal = (cls = null) => {
    if (cls) {
      setEditingSemester(cls);
      setSemesterForm({ name: cls.name, sections: cls.sections || 'A,B' });
    } else {
      setEditingSemester(null);
      setSemesterForm({ name: `B.Tech - Semester ${classes.length + 1}`, sections: 'A,B' });
    }
    setIsSemesterModalOpen(true);
  };

  const handleSaveSemester = async (e) => {
    e.preventDefault();
    if (!semesterForm.name.trim()) {
      toast.error('Semester / Class name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingSemester) {
        const res = await api.put(`/admin/classes/${editingSemester.id}`, {
          name: semesterForm.name.trim(),
          sections: semesterForm.sections.trim(),
        });
        if (res.success) {
          toast.success(`Updated "${res.data.name}"`);
          setIsSemesterModalOpen(false);
          fetchCurriculumData();
        }
      } else {
        const res = await api.post('/admin/classes', {
          name: semesterForm.name.trim(),
          sections: semesterForm.sections.trim(),
          subject_ids: [],
        });
        if (res.success) {
          toast.success(`Created "${res.data.name}"`);
          setIsSemesterModalOpen(false);
          setSelectedClassId(res.data.id);
          fetchCurriculumData();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save semester');
    } finally {
      setSaving(false);
    }
  };

  // Handle Deletions
  const handleExecuteDelete = async () => {
    const { type, id, name } = deleteConfirm;
    try {
      if (type === 'subject') {
        const res = await api.delete(`/admin/subjects/${id}`);
        if (res.success) {
          toast.success(`Subject "${name}" deleted`);
          fetchCurriculumData();
        }
      } else if (type === 'class') {
        const res = await api.delete(`/admin/classes/${id}`);
        if (res.success) {
          toast.success(`Class "${name}" deleted`);
          setSelectedClassId(null);
          fetchCurriculumData();
        }
      }
    } catch (err) {
      toast.error(err.message || `Failed to delete ${type}`);
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Curriculum & Academic Structure</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Semesters & Subjects Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure different subjects per semester, update course codes, and organize syllabus offerings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openSubjectModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Subject</span>
          </button>

          <button
            onClick={() => openSemesterModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-indigo-500" />
            <span>Add Semester</span>
          </button>
        </div>
      </div>

      {/* Navigation View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('semester_curriculum')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'semester_curriculum'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Semester-Wise Curriculum ({classes.length} Semesters)</span>
          </button>

          <button
            onClick={() => setActiveTab('master_catalog')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'master_catalog'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Master Subject Catalog ({allSubjects.length} Total Subjects)</span>
          </button>
        </div>

        <button
          onClick={fetchCurriculumData}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* TAB 1: SEMESTER-WISE CURRICULUM VIEW */}
      {activeTab === 'semester_curriculum' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Semester Selector Pills */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Select Semester / Class
              </h2>
              <span className="text-[11px] text-slate-400">
                {classes.length} available
              </span>
            </div>

            <div className="space-y-2">
              {classes.map((cls) => {
                const isSelected = cls.id === currentClass?.id;
                const subjCount = cls.subjects?.length || 0;

                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                        }`}
                      >
                        S{cls.name.match(/\d+/)?.[0] || '•'}
                      </div>
                      <div>
                        <h4
                          className={`text-xs font-bold tracking-tight ${
                            isSelected
                              ? 'text-indigo-950 dark:text-indigo-200'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {cls.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Sec: {cls.sections || 'A,B'}</span>
                          <span>•</span>
                          <span
                            className={
                              subjCount === 0
                                ? 'text-amber-600 font-semibold'
                                : 'text-slate-600 dark:text-slate-300 font-medium'
                            }
                          >
                            {subjCount} subject{subjCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSemesterModal(cls);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Semester Name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Subjects Assigned to Current Semester */}
          <div className="lg:col-span-8 space-y-4">
            {currentClass ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
                {/* Semester Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {currentClass.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        Sections: {currentClass.sections}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      This semester has{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {currentSemesterSubjects.length}
                      </strong>{' '}
                      active subject{currentSemesterSubjects.length !== 1 ? 's' : ''}. Attendance
                      and Marks dropdowns for this semester will display only these subjects.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={openAssignModal}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Edit Semester Subjects</span>
                    </button>
                  </div>
                </div>

                {/* Subject Cards List */}
                {currentSemesterSubjects.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                    <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      No Subjects Assigned Yet
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                      Click the button below to assign subjects from the institution's catalog to{' '}
                      {currentClass.name}.
                    </p>
                    <button
                      onClick={openAssignModal}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Choose Subjects for {currentClass.name}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentSemesterSubjects.map((subj, idx) => (
                      <div
                        key={subj.id}
                        className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-start justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                              {subj.code}
                            </span>
                            <span className="text-[10px] text-slate-400">Subject #{idx + 1}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {subj.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 block">
                            Active in {currentClass.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openSubjectModal(subj)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleQuickRemoveFromSemester(subj.id, subj.name)
                            }
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-700"
                            title="Remove from this Semester"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500">Please select a semester from the left.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MASTER SUBJECT CATALOG */}
      {activeTab === 'master_catalog' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subjects by name or course code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() => openSubjectModal()}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Subject</span>
            </button>
          </div>

          {/* Subjects Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Subject Code</th>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Taught In Semesters</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-slate-400">
                      No subjects found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((s) => {
                    // Find all classes this subject is in
                    const linkedClasses = classes.filter((c) =>
                      (c.subjects || []).some((sub) => sub.id === s.id)
                    );

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {s.code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {s.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {linkedClasses.length === 0 ? (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                Unassigned
                              </span>
                            ) : (
                              linkedClasses.map((c) => (
                                <span
                                  key={c.id}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                                >
                                  {c.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => openSubjectModal(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: 'subject',
                                id: s.id,
                                name: s.name,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ASSIGN / EDIT SEMESTER SUBJECTS (Checklist) */}
      {isAssignModalOpen && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col relative">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
              <Layers className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Configure Curriculum</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Manage Subjects for {currentClass.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              Select all subjects that belong to this semester. Students and faculty in this semester
              will only see the checked subjects.
            </p>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Selected: {assignedSubjectIds.length} of {allSubjects.length} subjects
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignedSubjectIds(allSubjects.map((s) => s.id))}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setAssignedSubjectIds([])}
                  className="text-xs font-semibold text-slate-500 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Scrollable Checklist */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
              {allSubjects.map((s) => {
                const isChecked = assignedSubjectIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleAssignSubject(s.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {s.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {s.code}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSemesterSubjects}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Curriculum'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT SUBJECT */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
            <button
              onClick={() => setIsSubjectModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingSubject ? 'Edit Subject Details' : 'Create New Subject'}
            </h3>

            <form onSubmit={handleSaveSubject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Course Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS311"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assign to Semesters
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                  {classes.map((c) => {
                    const checked = subjectForm.class_ids.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...subjectForm.class_ids, c.id]
                              : subjectForm.class_ids.filter((id) => id !== c.id);
                            setSubjectForm({ ...subjectForm, class_ids: newIds });
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT SEMESTER */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
            <button
              onClick={() => setIsSemesterModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingSemester ? 'Edit Semester' : 'Add New Semester / Class'}
            </h3>

            <form onSubmit={handleSaveSemester} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Semester / Class Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech - Semester 9"
                  value={semesterForm.name}
                  onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sections (Comma Separated)
                </label>
                <input
                  type="text"
                  required
                  placeholder="A,B,C"
                  value={semesterForm.sections}
                  onChange={(e) => setSemesterForm({ ...semesterForm, sections: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSemesterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  {saving ? 'Saving...' : editingSemester ? 'Update Semester' : 'Create Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={`Delete ${deleteConfirm.type === 'subject' ? 'Subject' : 'Semester'}?`}
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmType="danger"
        onConfirm={handleExecuteDelete}
        onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' })}
      />
    </div>
  );
};
