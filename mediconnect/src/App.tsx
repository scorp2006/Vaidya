import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Layouts
import { HmsLayout } from '@/components/hms/HmsLayout'
import { SuperAdminLayout } from '@/components/admin/SuperAdminLayout'

// Auth Pages
import { LandingPage } from '@/pages/Landing'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { RedirectPage } from '@/pages/auth/RedirectPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'

// HMS Pages
import { HmsDashboard } from '@/pages/hms/Dashboard'
import { DoctorsPage } from '@/pages/hms/Doctors'
import { AddDoctorPage } from '@/pages/hms/AddDoctor'
import { AppointmentsPage } from '@/pages/hms/Appointments'
import { PatientsPage } from '@/pages/hms/Patients'

// Super Admin Pages
import { SuperAdminDashboard } from '@/pages/admin/Dashboard'
import { HospitalsPage } from '@/pages/admin/Hospitals'
import { OnboardHospitalPage } from '@/pages/admin/OnboardHospital'
import { AdminSettingsPage } from '@/pages/admin/Settings'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/redirect" element={<RedirectPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* HMS Routes (Hospital Admin) */}
            <Route path="/hms" element={
              <ProtectedRoute allowedRoles={['admin', 'doctor', 'receptionist']}>
                <HmsLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/hms/dashboard" replace />} />
              <Route path="dashboard" element={<HmsDashboard />} />
              <Route path="doctors" element={<DoctorsPage />} />
              <Route path="doctors/new" element={<AddDoctorPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="patients" element={<PatientsPage />} />
            </Route>

            {/* Super Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="hospitals" element={<HospitalsPage />} />
              <Route path="hospitals/new" element={<OnboardHospitalPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
