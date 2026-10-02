import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentManagement } from './pages/admin/StudentManagement';
import { ParentManagement } from './pages/admin/ParentManagement';
import { AttendanceManagement } from './pages/admin/AttendanceManagement';
import { MarksManagement } from './pages/admin/MarksManagement';
import { NoticeManagement } from './pages/admin/NoticeManagement';
import { PDFManagement } from './pages/admin/PDFManagement';
import { WarningManagement } from './pages/admin/WarningManagement';
import { SubjectManagement } from './pages/admin/SubjectManagement';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentAttendance } from './pages/student/StudentAttendance';
import { StudentMarks } from './pages/student/StudentMarks';
import { StudentAnalytics } from './pages/student/StudentAnalytics';
import { StudentDocuments } from './pages/student/StudentDocuments';
import { StudentNotifications } from './pages/student/StudentNotifications';

// Parent Pages
import { ParentDashboard } from './pages/parent/ParentDashboard';
import { ParentAttendance } from './pages/parent/ParentAttendance';
import { ParentMarks } from './pages/parent/ParentMarks';
import { ParentAnalytics } from './pages/parent/ParentAnalytics';
import { ParentAlerts } from './pages/parent/ParentAlerts';

// Shared Pages
import { ChangePasswordPage } from './pages/shared/ChangePasswordPage';
import { NotFoundPage } from './pages/shared/NotFoundPage';

// Smart root redirector
const RootRedirect = () => {
  const { user, role, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
  if (role === 'PARENT') return <Navigate to="/parent/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '16px',
                background: '#0f172a',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
              },
            }}
          />

          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Root smart redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Authenticated Dashboard Routes */}
            <Route element={<DashboardLayout />}>
              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/students" element={<StudentManagement />} />
                <Route path="/admin/parents" element={<ParentManagement />} />
                <Route path="/admin/attendance" element={<AttendanceManagement />} />
                <Route path="/admin/marks" element={<MarksManagement />} />
                <Route path="/admin/subjects" element={<SubjectManagement />} />
                <Route path="/admin/notices" element={<NoticeManagement />} />
                <Route path="/admin/documents" element={<PDFManagement />} />
                <Route path="/admin/warnings" element={<WarningManagement />} />
              </Route>

              {/* Student Routes */}
              <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/attendance" element={<StudentAttendance />} />
                <Route path="/student/marks" element={<StudentMarks />} />
                <Route path="/student/analytics" element={<StudentAnalytics />} />
                <Route path="/student/documents" element={<StudentDocuments />} />
                <Route path="/student/notifications" element={<StudentNotifications />} />
              </Route>

              {/* Parent Routes */}
              <Route element={<ProtectedRoute allowedRoles={['PARENT']} />}>
                <Route path="/parent/dashboard" element={<ParentDashboard />} />
                <Route path="/parent/attendance" element={<ParentAttendance />} />
                <Route path="/parent/marks" element={<ParentMarks />} />
                <Route path="/parent/analytics" element={<ParentAnalytics />} />
                <Route path="/parent/alerts" element={<ParentAlerts />} />
              </Route>

              {/* Shared Authenticated Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'STUDENT', 'PARENT']} />}>
                <Route path="/change-password" element={<ChangePasswordPage />} />
              </Route>
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
