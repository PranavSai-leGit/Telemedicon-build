import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLayout } from './layouts/AppLayout';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

import { DashboardPage } from './pages/patient/DashboardPage';
import { RecordsPage } from './pages/patient/RecordsPage';
import { TimelinePage } from './pages/patient/TimelinePage';
import { LabsPage } from './pages/patient/LabsPage';
import { SummaryPage } from './pages/patient/SummaryPage';
import { SharingPage } from './pages/patient/SharingPage';

import { ClinicianDashboardPage } from './pages/clinician/ClinicianDashboardPage';
import { PatientDirectoryPage } from './pages/clinician/PatientDirectoryPage';
import { PatientReviewPage } from './pages/clinician/PatientReviewPage';
import { ClinicianDocumentsPage } from './pages/clinician/ClinicianDocumentsPage';
import { ClinicianHandoversPage } from './pages/clinician/ClinicianHandoversPage';
import { ClinicianDiscrepanciesPage } from './pages/clinician/ClinicianDiscrepanciesPage';
import { ClinicianConsentsPage } from './pages/clinician/ClinicianConsentsPage';
import { ClinicianActivityPage } from './pages/clinician/ClinicianActivityPage';

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminCliniciansPage } from './pages/admin/AdminCliniciansPage';
import { AdminPatientsPage } from './pages/admin/AdminPatientsPage';
import { AdminProcessingPage } from './pages/admin/AdminProcessingPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminConfigPage } from './pages/admin/AdminConfigPage';
import { AdminHealthPage } from './pages/admin/AdminHealthPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Patient Experience Routes */}
              <Route element={<AppLayout allowedRoles={['patient']} />}>
                <Route path="/patient/dashboard" element={<DashboardPage />} />
                <Route path="/patient/records" element={<RecordsPage />} />
                <Route path="/patient/timeline" element={<TimelinePage />} />
                <Route path="/patient/labs" element={<LabsPage />} />
                <Route path="/patient/summary" element={<SummaryPage />} />
                <Route path="/patient/sharing" element={<SharingPage />} />
              </Route>

              {/* Clinician Experience Routes */}
              <Route element={<AppLayout allowedRoles={['clinician']} />}>
                <Route path="/clinician/dashboard" element={<ClinicianDashboardPage />} />
                <Route path="/clinician/patients" element={<PatientDirectoryPage />} />
                <Route path="/clinician/patients/:patientId" element={<PatientReviewPage />} />
                <Route path="/clinician/documents" element={<ClinicianDocumentsPage />} />
                <Route path="/clinician/handovers" element={<ClinicianHandoversPage />} />
                <Route path="/clinician/discrepancies" element={<ClinicianDiscrepanciesPage />} />
                <Route path="/clinician/consents" element={<ClinicianConsentsPage />} />
                <Route path="/clinician/activity" element={<ClinicianActivityPage />} />
              </Route>

              {/* Administrator Experience Routes */}
              <Route element={<AppLayout allowedRoles={['administrator']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/clinicians" element={<AdminCliniciansPage />} />
                <Route path="/admin/patients" element={<AdminPatientsPage />} />
                <Route path="/admin/processing" element={<AdminProcessingPage />} />
                <Route path="/admin/audit" element={<AdminAuditPage />} />
                <Route path="/admin/config" element={<AdminConfigPage />} />
                <Route path="/admin/health" element={<AdminHealthPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
