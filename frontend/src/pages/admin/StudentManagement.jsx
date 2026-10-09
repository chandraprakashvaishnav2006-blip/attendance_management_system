import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Upload,
  Download,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Key
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    roll_no: '',
    email: '',
    class_id: '',
    branch_id: '',
    section_id: '',
    section: 'A',
    dob: '',
    gender: 'Male',
    phone: '',
    address: '',
    status: 'active',
  });

  const [importFile, setImportFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAuxData = async () => {
    try {
      const [classRes, brRes, secRes] = await Promise.all([
        api.get('/admin/classes'),
        api.get('/admin/branches'),
        api.get('/admin/sections'),
      ]);
      if (classRes.success) setClasses(classRes.data || []);
      if (brRes.success) setBranches(brRes.data || []);
      if (secRes.success) setSections(secRes.data || []);
    } catch {
      // Ignore
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: 'name',
        sort_order: 'asc',
      });
      if (search) params.append('search', search);
      if (classFilter) params.append('class_id', classFilter);
      if (branchFilter) params.append('branch_id', branchFilter);
      if (sectionFilter) params.append('section_id', sectionFilter);
      if (statusFilter) params.append('status_filter', statusFilter);
      params.append('_t', String(Date.now()));

      const res = await api.get(`/admin/students?${params.toString()}`);
      if (res.success && res.data) {
        const sortedList = (res.data.items || []).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setStudents(sortedList);
        setTotal(res.data.total);
        setTotalPages(res.data.total_pages);
      }
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [page, search, classFilter, branchFilter, sectionFilter, statusFilter]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      roll_no: '',
      email: '',
      class_id: classes[0]?.id || '',
      branch_id: branches[0]?.id || '',
      section_id: '',
      section: 'A',
      dob: '',
      gender: 'Male',
      phone: '',
      address: '',
      status: 'active',
    });
    setAddModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      roll_no: student.roll_no,
      email: student.email,
      class_id: student.class_id || '',
      branch_id: student.branch_id || '',
      section_id: student.section_id || '',
      section: student.section || 'A',
      dob: student.dob || '',
      gender: student.gender || 'Male',
      phone: student.phone || '',
      address: student.address || '',
      status: student.status,
    });
    setEditModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        class_id: formData.class_id ? Number(formData.class_id) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        section_id: formData.section_id ? Number(formData.section_id) : null,
      };
      const res = await api.post('/admin/students', payload);
      if (res.success) {
        toast.success(res.message);
        setAddModalOpen(false);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add student');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        class_id: formData.class_id ? Number(formData.class_id) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        section_id: formData.section_id ? Number(formData.section_id) : null,
        section: formData.section,
        dob: formData.dob || null,
        gender: formData.gender,
        phone: formData.phone,
        address: formData.address,
        status: formData.status,
      };
      const res = await api.put(`/admin/students/${selectedStudent.id}`, payload);
      if (res.success) {
        toast.success(res.message);
        setEditModalOpen(false);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update student');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/admin/students/${selectedStudent.id}`);
      if (res.success) {
        toast.success(res.message);
        setDeleteConfirmOpen(false);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete student');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      const res = await api.post('/auth/admin-reset-password', {
        user_id: selectedStudent.user_id,
      });
      if (res.success) {
        toast.success(res.message, { duration: 6000 });
        setResetPwdModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Please select a CSV file');
      return;
    }
    const form = new FormData();
    form.append('file', importFile);
    if (formData.class_id) form.append('class_id', formData.class_id);

    setActionLoading(true);
    try {
      const res = await api.post('/admin/students/bulk-import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.success) {
        toast.success(res.message);
        setImportModalOpen(false);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const url = `/admin/students-export/csv${classFilter ? `?class_id=${classFilter}` : ''}`;
      const blobData = await api.get(url, { responseType: 'blob' });
      const blob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: 'text/csv' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      toast.success('CSV exported successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Student Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain student profiles, enrolled courses, accounts, and batch operations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, roll no, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} ({b.name})
              </option>
            ))}
          </select>

          <select
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Sections</option>
            {sections
              .filter((s) => !classFilter || String(s.class_id) === String(classFilter))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name} ({s.branch_code || 'General'})
                </option>
              ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader count={5} type="table" />
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No students found"
            description="Try clearing search filters or click 'Add Student' to register a new student."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Roll Number</th>
                  <th className="py-3.5 px-4">Branch & Class</th>
                  <th className="py-3.5 px-4">Attendance</th>
                  <th className="py-3.5 px-4">Parents Linked</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
                          {s.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                          <p className="text-[11px] text-slate-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {s.roll_no}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.branch_code && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            {s.branch_code}
                          </span>
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {s.class_name || 'Unassigned'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          Sec {s.section_name || s.section}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 min-w-[110px]">
                        {s.attendance_percentage !== undefined && s.attendance_percentage !== null ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  s.total_classes === 0
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    : s.attendance_percentage >= 75
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                {s.total_classes === 0 ? 'No records' : `${s.attendance_percentage}%`}
                              </span>
                              {s.total_classes > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {s.present_count}/{s.total_classes}
                                </span>
                              )}
                            </div>
                            {s.total_classes > 0 && (
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    s.attendance_percentage >= 85
                                      ? 'bg-emerald-500'
                                      : s.attendance_percentage >= 75
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, s.attendance_percentage))}%` }}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px]">--</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.parent_count} linked
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{s.phone || '—'}</td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={s.status === 'active' ? 'present' : 'absent'}
                        size="sm"
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedStudent(s);
                            setResetPwdModalOpen(true);
                          }}
                          title="Reset Password"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Edit Student"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(s);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete Student"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {students.length} of {total} students (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Student"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Aarav Sharma"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Roll Number / Student ID *
              </label>
              <input
                type="text"
                required
                value={formData.roll_no}
                onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="CS202601"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="aarav@sms.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Branch / Department
              </label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Class / Semester
              </label>
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Section
              </label>
              <select
                value={formData.section_id}
                onChange={(e) => {
                  const secId = e.target.value;
                  const secObj = sections.find((s) => String(s.id) === String(secId));
                  setFormData({
                    ...formData,
                    section_id: secId,
                    section: secObj ? secObj.name : 'A',
                  });
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Section</option>
                {sections
                  .filter((s) => !formData.class_id || String(s.class_id) === String(formData.class_id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name} ({s.branch_code || 'General'})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+1 555-0199"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Address
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="123 Tech Campus Road..."
            />
          </div>

          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200">
            Account login will be auto-generated with default temporary password:{' '}
            <code className="font-bold">{formData.roll_no ? `${formData.roll_no}@Pass123` : '[RollNo]@Pass123'}</code>. Student will be prompted to change password on first login.
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Student: ${selectedStudent?.name}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Branch / Department
              </label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Class / Semester
              </label>
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Section
              </label>
              <select
                value={formData.section_id}
                onChange={(e) => {
                  const secId = e.target.value;
                  const secObj = sections.find((s) => String(s.id) === String(secId));
                  setFormData({
                    ...formData,
                    section_id: secId,
                    section: secObj ? secObj.name : formData.section,
                  });
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select Section</option>
                {sections
                  .filter((s) => !formData.class_id || String(s.class_id) === String(formData.class_id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name} ({s.branch_code || 'General'})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              {actionLoading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import CSV Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Bulk Import Students via CSV"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Upload a CSV file containing columns: <code className="font-bold">name, roll_no, email, section, phone, gender, address</code>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assign to Class (Optional)
            </label>
            <select
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">Do not assign</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              required
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setImportModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              {actionLoading ? 'Uploading...' : 'Process Import'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Student Record"
        message={`Are you sure you want to delete ${selectedStudent?.name} (${selectedStudent?.roll_no})? This will delete the student profile, user account, attendance, and mark records.`}
        confirmText="Confirm Delete"
        confirmVariant="danger"
        loading={actionLoading}
      />

      {/* Admin Reset Password Dialog */}
      <ConfirmDialog
        isOpen={resetPwdModalOpen}
        onClose={() => setResetPwdModalOpen(false)}
        onConfirm={handleResetPassword}
        title="Generate Temporary Password"
        message={`Generate a new temporary password for ${selectedStudent?.name}? The student will be forced to change it on their next login.`}
        confirmText="Generate Password"
        confirmVariant="primary"
        loading={actionLoading}
      />
    </div>
  );
};
