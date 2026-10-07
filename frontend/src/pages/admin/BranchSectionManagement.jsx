import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Building2,
  GitFork,
  Layers,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  GraduationCap,
  DoorOpen,
  UserCheck,
  ArrowRightLeft,
  Filter,
  RefreshCw,
  Info,
  CheckSquare,
  Square,
  Sparkles,
  BarChart3,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';

export const BranchSectionManagement = () => {
  const [activeTab, setActiveTab] = useState('branches'); // 'branches', 'sections', 'allocator'
  const [loading, setLoading] = useState(true);

  // Core Data
  const [branches, setBranches] = useState([]);
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  // Filters & Search
  const [branchSearch, setBranchSearch] = useState('');
  const [sectionSearch, setSectionSearch] = useState('');
  const [sectionClassFilter, setSectionClassFilter] = useState('');
  const [sectionBranchFilter, setSectionBranchFilter] = useState('');

  // Branch Modal State
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    hod_name: '',
    description: '',
    intake_capacity: 120,
    is_active: true,
  });

  // Section Modal State
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    name: 'A',
    class_id: '',
    branch_id: '',
    room_number: '',
    capacity: 60,
    class_teacher: '',
    is_active: true,
  });

  // Section Students Modal
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [activeSectionForStudents, setActiveSectionForStudents] = useState(null);

  // Allocator State
  const [allocatorClassId, setAllocatorClassId] = useState('');
  const [allocatorSectionId, setAllocatorSectionId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [allocating, setAllocating] = useState(false);

  // Delete Confirm
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: null, // 'branch' or 'section'
    id: null,
    title: '',
    message: '',
  });

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [brRes, secRes, clsRes, stdRes] = await Promise.all([
        api.get('/admin/branches'),
        api.get('/admin/sections'),
        api.get('/admin/classes'),
        api.get('/admin/students?page=1&page_size=100&sort_by=name&sort_order=asc'),
      ]);

      if (brRes.success) setBranches(brRes.data || []);
      if (secRes.success) setSections(secRes.data || []);
      if (clsRes.success) setClasses(clsRes.data || []);
      if (stdRes.success && stdRes.data?.items) {
        // Enforce strict alphabetical sorting A-Z
        const sorted = [...stdRes.data.items].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setStudents(sorted);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load branch & section data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalBranches = branches.length;
    const activeBranches = branches.filter((b) => b.is_active).length;
    const totalSections = sections.length;
    const totalIntakeCapacity = branches.reduce((acc, b) => acc + (b.intake_capacity || 0), 0);
    const totalEnrolled = students.length;
    const capacityUsagePct =
      totalIntakeCapacity > 0 ? Math.min(100, Math.round((totalEnrolled / totalIntakeCapacity) * 100)) : 0;

    return {
      totalBranches,
      activeBranches,
      totalSections,
      totalIntakeCapacity,
      totalEnrolled,
      capacityUsagePct,
    };
  }, [branches, sections, students]);

  // Filtered Branches
  const filteredBranches = useMemo(() => {
    if (!branchSearch.trim()) return branches;
    const q = branchSearch.toLowerCase();
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.hod_name && b.hod_name.toLowerCase().includes(q))
    );
  }, [branches, branchSearch]);

  // Filtered Sections
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const matchSearch =
        !sectionSearch.trim() ||
        s.name.toLowerCase().includes(sectionSearch.toLowerCase()) ||
        (s.room_number && s.room_number.toLowerCase().includes(sectionSearch.toLowerCase())) ||
        (s.class_teacher && s.class_teacher.toLowerCase().includes(sectionSearch.toLowerCase())) ||
        (s.class_name && s.class_name.toLowerCase().includes(sectionSearch.toLowerCase())) ||
        (s.branch_code && s.branch_code.toLowerCase().includes(sectionSearch.toLowerCase()));

      const matchClass = !sectionClassFilter || String(s.class_id) === String(sectionClassFilter);
      const matchBranch = !sectionBranchFilter || String(s.branch_id) === String(sectionBranchFilter);

      return matchSearch && matchClass && matchBranch;
    });
  }, [sections, sectionSearch, sectionClassFilter, sectionBranchFilter]);

  // Allocator Students (from source class and section)
  const allocatorSourceStudents = useMemo(() => {
    if (!allocatorClassId) return [];
    return students.filter((st) => {
      const matchClass = String(st.class_id) === String(allocatorClassId);
      const matchSec = !allocatorSectionId || String(st.section_id) === String(allocatorSectionId);
      return matchClass && matchSec;
    });
  }, [students, allocatorClassId, allocatorSectionId]);

  // Students in Selected Section (for view modal)
  const activeSectionStudents = useMemo(() => {
    if (!activeSectionForStudents) return [];
    return students
      .filter((st) => String(st.section_id) === String(activeSectionForStudents.id))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [students, activeSectionForStudents]);

  // Branch Handlers
  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      code: '',
      hod_name: '',
      description: '',
      intake_capacity: 120,
      is_active: true,
    });
    setBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      code: branch.code,
      hod_name: branch.hod_name || '',
      description: branch.description || '',
      intake_capacity: branch.intake_capacity || 120,
      is_active: branch.is_active,
    });
    setBranchModalOpen(true);
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchForm.name.trim() || !branchForm.code.trim()) {
      toast.error('Branch Name and Code are required');
      return;
    }

    try {
      if (editingBranch) {
        const res = await api.put(`/admin/branches/${editingBranch.id}`, branchForm);
        if (res.success) {
          toast.success(res.message || 'Branch updated');
          setBranches((prev) => prev.map((b) => (b.id === editingBranch.id ? res.data : b)));
        }
      } else {
        const res = await api.post('/admin/branches', branchForm);
        if (res.success) {
          toast.success(res.message || 'Branch created');
          setBranches((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      setBranchModalOpen(false);
      fetchData(); // Refresh metrics
    } catch (err) {
      toast.error(err.message || 'Failed to save branch');
    }
  };

  // Section Handlers
  const handleOpenAddSection = () => {
    setEditingSection(null);
    setSectionForm({
      name: 'A',
      class_id: classes[0]?.id || '',
      branch_id: branches[0]?.id || '',
      room_number: '',
      capacity: 60,
      class_teacher: '',
      is_active: true,
    });
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec) => {
    setEditingSection(sec);
    setSectionForm({
      name: sec.name,
      class_id: sec.class_id || '',
      branch_id: sec.branch_id || '',
      room_number: sec.room_number || '',
      capacity: sec.capacity || 60,
      class_teacher: sec.class_teacher || '',
      is_active: sec.is_active,
    });
    setSectionModalOpen(true);
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    if (!sectionForm.name.trim() || !sectionForm.class_id) {
      toast.error('Section Name and Class are required');
      return;
    }

    try {
      const payload = {
        ...sectionForm,
        class_id: Number(sectionForm.class_id),
        branch_id: sectionForm.branch_id ? Number(sectionForm.branch_id) : null,
        capacity: Number(sectionForm.capacity) || 60,
      };

      if (editingSection) {
        const res = await api.put(`/admin/sections/${editingSection.id}`, payload);
        if (res.success) {
          toast.success(res.message || 'Section updated');
          setSections((prev) => prev.map((s) => (s.id === editingSection.id ? res.data : s)));
        }
      } else {
        const res = await api.post('/admin/sections', payload);
        if (res.success) {
          toast.success(res.message || 'Section created');
          setSections((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      setSectionModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save section');
    }
  };

  // Delete Handlers
  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    try {
      if (type === 'branch') {
        const res = await api.delete(`/admin/branches/${id}`);
        if (res.success) {
          toast.success(res.message || 'Branch deleted');
          setBranches((prev) => prev.filter((b) => b.id !== id));
        }
      } else if (type === 'section') {
        const res = await api.delete(`/admin/sections/${id}`);
        if (res.success) {
          toast.success(res.message || 'Section deleted');
          setSections((prev) => prev.filter((s) => s.id !== id));
        }
      }
      setDeleteConfirm({ isOpen: false, type: null, id: null, title: '', message: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  // Allocator Action: Batch reassign students
  const handleAssignStudents = async () => {
    if (!targetSectionId) {
      toast.error('Please select a target section to allocate to');
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student to allocate');
      return;
    }

    setAllocating(true);
    try {
      const res = await api.post('/admin/sections/assign-students', {
        section_id: Number(targetSectionId),
        student_ids: selectedStudentIds,
      });

      if (res.success) {
        toast.success(res.message || `Allocated ${selectedStudentIds.length} student(s) successfully`);
        setSelectedStudentIds([]);
        fetchData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to allocate students');
    } finally {
      setAllocating(false);
    }
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === allocatorSourceStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(allocatorSourceStudents.map((s) => s.id));
    }
  };

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Building2 className="w-6 h-6" />
            </div>
            Branches & Sections Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize academic departments, manage classrooms, and govern student section allotments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'branches' && (
            <button
              onClick={handleOpenAddBranch}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </button>
          )}

          {activeTab === 'sections' && (
            <button
              onClick={handleOpenAddSection}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Branches */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Departments / Branches
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {metrics.totalBranches}
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {metrics.activeBranches} Active
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <GitFork className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Specializations</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Engineering</span>
          </div>
        </div>

        {/* Card 2: Sections */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Active Sections
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {metrics.totalSections}
              </h3>
              <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-1">
                Across {classes.length} Semesters
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Classroom units</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Room-equipped</span>
          </div>
        </div>

        {/* Card 3: Capacity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Intake Capacity
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {metrics.totalIntakeCapacity}
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                {metrics.totalEnrolled} Enrolled Students
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.capacityUsagePct}%` }}
              />
            </div>
            <p className="text-[10px] text-right text-slate-400 mt-1">{metrics.capacityUsagePct}% Filled</p>
          </div>
        </div>

        {/* Card 4: Student Allocation */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Allocation Health
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                100%
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                All Students Assigned
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>A-Z Sorting</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Enforced</span>
          </div>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'branches'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <GitFork className="w-4 h-4" />
          Departments / Branches
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 font-bold">
            {branches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sections')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'sections'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          Class Sections & Rooms
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 font-bold">
            {sections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('allocator')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'allocator'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Section Allocator & Transfer
        </button>
      </div>

      {/* TAB 1: BRANCHES */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search branches by code, name, or HOD..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {loading ? (
            <SkeletonLoader count={3} />
          ) : filteredBranches.length === 0 ? (
            <EmptyState
              title="No branches found"
              description="Get started by creating your institution's academic branches."
              actionLabel="Add Branch"
              onAction={handleOpenAddBranch}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBranches.map((br) => {
                const enrolledCount = br.students_count || 0;
                const capacity = br.intake_capacity || 120;
                const fillPct = Math.min(100, Math.round((enrolledCount / capacity) * 100));

                return (
                  <div
                    key={br.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Code Badge & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {br.code}
                        </span>
                        <Badge variant={br.is_active ? 'present' : 'default'} size="sm">
                          {br.is_active ? 'Active' : 'Archived'}
                        </Badge>
                      </div>

                      {/* Branch Name */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {br.name}
                      </h3>

                      {/* HOD Info */}
                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-600 dark:text-slate-400">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                        <span>HOD:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {br.hod_name || 'Not Designated'}
                        </span>
                      </div>

                      {/* Description */}
                      {br.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {br.description}
                        </p>
                      )}

                      {/* Capacity Meter */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500">Capacity Utilization</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {enrolledCount} / {capacity}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Associated Sections Count */}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          Attached Sections
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {br.sections_count || 0}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditBranch(br)}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Branch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: 'branch',
                            id: br.id,
                            title: `Delete Branch: ${br.name}`,
                            message: `Are you sure you want to delete ${br.name} (${br.code})? Make sure no students are currently assigned to this branch.`,
                          })
                        }
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SECTIONS & ROOMS */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by room, teacher, or section..."
                value={sectionSearch}
                onChange={(e) => setSectionSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Class Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={sectionClassFilter}
                  onChange={(e) => setSectionClassFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Semesters / Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Filter */}
              <select
                value={sectionBranchFilter}
                onChange={(e) => setSectionBranchFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>

              {(sectionClassFilter || sectionBranchFilter || sectionSearch) && (
                <button
                  onClick={() => {
                    setSectionClassFilter('');
                    setSectionBranchFilter('');
                    setSectionSearch('');
                  }}
                  className="text-xs text-rose-500 hover:underline font-semibold"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <SkeletonLoader count={4} />
          ) : filteredSections.length === 0 ? (
            <EmptyState
              title="No sections found"
              description="Create sections like 'A', 'B' and assign classrooms and teachers to them."
              actionLabel="Add Section"
              onAction={handleOpenAddSection}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSections.map((sec) => {
                const enrolled = sec.students_count || 0;
                const capacity = sec.capacity || 60;
                const pct = Math.min(100, Math.round((enrolled / capacity) * 100));

                return (
                  <div
                    key={sec.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-indigo-600/20">
                            {sec.name}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              Section {sec.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {sec.class_name || 'Class Unset'}
                            </span>
                          </div>
                        </div>

                        {sec.branch_code ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            {sec.branch_code}
                          </span>
                        ) : (
                          <Badge variant="default" size="sm">General</Badge>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-2 mt-4 text-xs">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                            Room Allocation:
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {sec.room_number || 'TBA'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            Class Teacher:
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {sec.class_teacher || 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      {/* Enrolled Students Meter */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">Students Enrolled</span>
                          <span className="font-black text-slate-900 dark:text-white">
                            {enrolled} / {capacity}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveSectionForStudents(sec);
                          setStudentsModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Users className="w-3.5 h-3.5" />
                        View Students ({enrolled})
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSection(sec)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Section"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              type: 'section',
                              id: sec.id,
                              title: `Delete Section: ${sec.name}`,
                              message: `Are you sure you want to delete Section ${sec.name} of ${sec.class_name}? Ensure no students are enrolled in this section.`,
                            })
                          }
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Delete Section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECTION ALLOCATOR & BATCH TRANSFER */}
      {activeTab === 'allocator' && (
        <div className="space-y-6">
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 p-4 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                Interactive Student Section Allotment
              </h4>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Select a class and current section, pick individual students or select all (always presented in strict alphabetical A-Z order), and reassign them to their target section in one click.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Source & Destination Setup */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                1. Select Source & Target
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Source Class / Semester
                </label>
                <select
                  value={allocatorClassId}
                  onChange={(e) => {
                    setAllocatorClassId(e.target.value);
                    setAllocatorSectionId('');
                    setSelectedStudentIds([]);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Current Section (Optional filter)
                </label>
                <select
                  value={allocatorSectionId}
                  onChange={(e) => {
                    setAllocatorSectionId(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Sections in this Class</option>
                  {sections
                    .filter((s) => !allocatorClassId || String(s.class_id) === String(allocatorClassId))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name} ({s.branch_code || 'General'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                  Target Destination Section
                </label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Target Section...</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.class_name} - Section {s.name} ({s.branch_code || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleAssignStudents}
                  disabled={allocating || selectedStudentIds.length === 0 || !targetSectionId}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {allocating
                    ? 'Transferring...'
                    : `Transfer Selected (${selectedStudentIds.length})`}
                </button>
              </div>
            </div>

            {/* Right: Alphabetical Students Table with Checkboxes */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    2. Select Students (Alphabetical A-Z)
                  </h3>
                  <p className="text-xs text-slate-400">
                    {allocatorSourceStudents.length} Students found
                  </p>
                </div>

                {allocatorSourceStudents.length > 0 && (
                  <button
                    onClick={handleSelectAllStudents}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {selectedStudentIds.length === allocatorSourceStudents.length ? (
                      <>
                        <CheckSquare className="w-4 h-4" /> Deselect All
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" /> Select All ({allocatorSourceStudents.length})
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-100 dark:divide-slate-800 mt-2">
                {!allocatorClassId ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    Select a Source Class from the left panel to load students.
                  </div>
                ) : allocatorSourceStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    No students match the chosen criteria.
                  </div>
                ) : (
                  allocatorSourceStudents.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleStudentSelection(st.id)}
                        className={`py-3 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-indigo-600 dark:text-indigo-400"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white block">
                              {st.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {st.roll_no} • {st.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {st.branch_code && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              {st.branch_code}
                            </span>
                          )}
                          <Badge variant="default" size="sm">
                            Sec: {st.section_name || st.section || 'Unassigned'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BRANCH */}
      <Modal
        isOpen={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        title={editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Create New Academic Branch'}
      >
        <form onSubmit={handleSaveBranch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Branch / Department Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Computer Science & Engineering"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Branch Code (Acronym) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CSE, ECE, ME"
                value={branchForm.code}
                onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Head of Department (HOD)
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Rajesh Sharma"
                value={branchForm.hod_name}
                onChange={(e) => setBranchForm({ ...branchForm, hod_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Annual Intake Capacity
              </label>
              <input
                type="number"
                min="1"
                value={branchForm.intake_capacity}
                onChange={(e) =>
                  setBranchForm({ ...branchForm, intake_capacity: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Specialization Overview
            </label>
            <textarea
              rows="3"
              placeholder="Brief description of the department curriculum and focus..."
              value={branchForm.description}
              onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="branch_active"
              checked={branchForm.is_active}
              onChange={(e) => setBranchForm({ ...branchForm, is_active: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="branch_active" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Department is actively operating & admitting students
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setBranchModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20"
            >
              {editingBranch ? 'Save Changes' : 'Create Branch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD / EDIT SECTION */}
      <Modal
        isOpen={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={editingSection ? `Edit Section: ${editingSection.name}` : 'Create New Class Section'}
      >
        <form onSubmit={handleSaveSection} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Section Label / Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. A, B, C, or CSE-1"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Associated Class / Semester *
              </label>
              <select
                required
                value={sectionForm.class_id}
                onChange={(e) => setSectionForm({ ...sectionForm, class_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Branch / Department
              </label>
              <select
                value={sectionForm.branch_id}
                onChange={(e) => setSectionForm({ ...sectionForm, branch_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">General / Shared Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Room / Hall Number
              </label>
              <input
                type="text"
                placeholder="e.g. Hall 101, Lab 4B"
                value={sectionForm.room_number}
                onChange={(e) => setSectionForm({ ...sectionForm, room_number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Section Capacity
              </label>
              <input
                type="number"
                min="1"
                value={sectionForm.capacity}
                onChange={(e) =>
                  setSectionForm({ ...sectionForm, capacity: Number(e.target.value) || 60 })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Class Teacher / Advisor
              </label>
              <input
                type="text"
                placeholder="e.g. Prof. Priya Nair"
                value={sectionForm.class_teacher}
                onChange={(e) => setSectionForm({ ...sectionForm, class_teacher: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="section_active"
              checked={sectionForm.is_active}
              onChange={(e) => setSectionForm({ ...sectionForm, is_active: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="section_active" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Section is currently active for attendance & classes
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSectionModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20"
            >
              {editingSection ? 'Save Changes' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW ENROLLED STUDENTS IN SECTION */}
      <Modal
        isOpen={studentsModalOpen}
        onClose={() => {
          setStudentsModalOpen(false);
          setActiveSectionForStudents(null);
        }}
        title={`Enrolled Students: Section ${activeSectionForStudents?.name || ''} (${
          activeSectionForStudents?.class_name || ''
        })`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              All students listed in <strong>Alphabetical Order (A-Z)</strong>
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Total: {activeSectionStudents.length} Students
            </span>
          </div>

          {activeSectionStudents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No students are currently allocated to this section. Use the Section Allocator tab to transfer students here.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
              {activeSectionStudents.map((st, idx) => (
                <div
                  key={st.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">
                      {idx + 1}.
                    </span>
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white block">
                        {st.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {st.roll_no} • {st.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {st.branch_code && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        {st.branch_code}
                      </span>
                    )}
                    <Badge variant={st.status === 'active' ? 'present' : 'default'} size="sm">
                      {st.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStudentsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null, title: '', message: '' })}
        onConfirm={confirmDelete}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        confirmText="Yes, Delete"
        variant="danger"
      />
    </div>
  );
};
