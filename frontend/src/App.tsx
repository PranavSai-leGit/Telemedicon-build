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
import { PatientReviewPage } from './pages/clinician/PatientReviewPage';

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

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
                <Route path="/clinician/patients/:patientId" element={<PatientReviewPage />} />
              </Route>

              {/* Administrator Experience Routes */}
              <Route element={<AppLayout allowedRoles={['administrator']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
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
