import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Key,
  GraduationCap,
  Baby
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const ParentManagement = () => {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relation: 'Father',
    student_ids: [],
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchParents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/parents${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      if (res.success) {
        const sortedParents = (res.data || []).sort((a, b) => a.name.localeCompare(b.name));
        setParents(sortedParents);
      }
    } catch {
      toast.error('Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsList = async () => {
    try {
      const res = await api.get('/admin/students?page=1&page_size=100&sort_by=name&sort_order=asc');
      if (res.success && res.data) {
        const sortedStudents = (res.data.items || []).sort((a, b) => a.name.localeCompare(b.name));
        setStudents(sortedStudents);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchStudentsList();
  }, []);

  useEffect(() => {
    fetchParents();
  }, [search]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      relation: 'Father',
      student_ids: [],
    });
    setAddModalOpen(true);
  };

  const handleOpenEdit = (parent) => {
    setSelectedParent(parent);
    setFormData({
      name: parent.name,
      email: parent.email,
      phone: parent.phone || '',
      relation: parent.relation,
      student_ids: parent.students?.map((s) => s.id) || [],
    });
    setEditModalOpen(true);
  };

  const handleToggleStudent = (studentId) => {
    setFormData((prev) => {
      const exists = prev.student_ids.includes(studentId);
      return {
        ...prev,
        student_ids: exists
          ? prev.student_ids.filter((id) => id !== studentId)
          : [...prev.student_ids, studentId],
      };
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/admin/parents', formData);
      if (res.success) {
        toast.success(res.message);
        setAddModalOpen(false);
        fetchParents();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add parent');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedParent) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/admin/parents/${selectedParent.id}`, formData);
      if (res.success) {
        toast.success(res.message);
        setEditModalOpen(false);
        fetchParents();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update parent');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedParent) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/admin/parents/${selectedParent.id}`);
      if (res.success) {
        toast.success(res.message);
        setDeleteConfirmOpen(false);
        fetchParents();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete parent');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedParent) return;
    setActionLoading(true);
    try {
      const res = await api.post('/auth/admin-reset-password', {
        user_id: selectedParent.user_id,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Parent & Guardian Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain parent accounts and link multiple students for unified family portals
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Parent
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by parent name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Parents Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader count={4} type="table" />
          </div>
        ) : parents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No parent accounts found"
            description="Register a new parent account to link with student records."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Parent Name</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Relation</th>
                  <th className="py-3.5 px-4">Linked Children</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {parents.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{p.email}</td>
                    <td className="py-3.5 px-4 text-slate-500">{p.phone || '—'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        {p.relation}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {p.students?.length === 0 ? (
                          <span className="text-[11px] text-slate-400">None linked</span>
                        ) : (
                          p.students.map((child) => (
                            <span
                              key={child.id}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-medium text-[11px]"
                            >
                              <Baby className="w-3 h-3" />
                              {child.name} ({child.roll_no})
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedParent(p);
                            setResetPwdModalOpen(true);
                          }}
                          title="Reset Password"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Parent"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedParent(p);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete Parent"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
      </div>

      {/* Add / Edit Parent Modal */}
      <Modal
        isOpen={addModalOpen || editModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditModalOpen(false);
        }}
        title={addModalOpen ? 'Register Parent Account' : `Edit Parent: ${selectedParent?.name}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={addModalOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Parent / Guardian Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Rajesh Sharma"
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
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="parent@sms.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="+1 555-0899"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Relationship to Student
              </label>
              <select
                value={formData.relation}
                onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Student Association (Many-to-Many Multi-select) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Link Child / Children (Select all that apply)
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1 bg-slate-50/50 dark:bg-slate-800/40">
              {students.map((student) => {
                const isSelected = formData.student_ids.includes(student.id);
                return (
                  <label
                    key={student.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-amber-100/70 dark:bg-amber-950/60 font-semibold text-amber-900 dark:text-amber-200'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleStudent(student.id)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>{student.name}</span>
                    </div>
                    <span className="font-mono text-[11px] opacity-75">{student.roll_no}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setAddModalOpen(false);
                setEditModalOpen(false);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              {actionLoading ? 'Saving...' : 'Save Parent Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Parent Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Parent Account"
        message={`Are you sure you want to remove ${selectedParent?.name}? The parent's access will be revoked.`}
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
        message={`Generate a new temporary password for ${selectedParent?.name}? The parent will be forced to change it on next login.`}
        confirmText="Generate Password"
        confirmVariant="primary"
        loading={actionLoading}
      />
    </div>
  );
};
