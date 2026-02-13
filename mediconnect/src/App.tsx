import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { SuperAdminLoginPage } from '@/pages/auth/SuperAdminLoginPage'

// Super Admin pages
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout'
import { SuperAdminDashboard } from '@/pages/super-admin/Dashboard'
import { HospitalList } from '@/pages/super-admin/HospitalList'
import { OnboardHospital } from '@/pages/super-admin/OnboardHospital'
import { HospitalDetails } from '@/pages/super-admin/HospitalDetails'
import { PlatformAnalytics } from '@/pages/super-admin/PlatformAnalytics'
import { RevenueTracking } from '@/pages/super-admin/RevenueTracking'
import { PromotionManagement } from '@/pages/super-admin/PromotionManagement'

// HMS pages
import { HmsLayout } from '@/components/hms/HmsLayout'
import { HmsDashboard } from '@/pages/hms/Dashboard'
import { AppointmentsPage } from '@/pages/hms/Appointments'
import { DoctorsPage } from '@/pages/hms/Doctors'
import { AddDoctorPage } from '@/pages/hms/AddDoctor'
import { EditDoctorPage } from '@/pages/hms/EditDoctor'
import { PatientsPage } from '@/pages/hms/Patients'
import { PatientProfilePage } from '@/pages/hms/PatientProfile'
import { QueuePage } from '@/pages/hms/Queue'
import { HmsAnalyticsPage } from '@/pages/hms/Analytics'
import { HmsSettingsPage } from '@/pages/hms/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />

            {/* Super Admin */}
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute requireRole="super_admin">
                  <SuperAdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="hospitals" element={<HospitalList />} />
              <Route path="hospitals/new" element={<OnboardHospital />} />
              <Route path="hospitals/:id" element={<HospitalDetails />} />
              <Route path="analytics" element={<PlatformAnalytics />} />
              <Route path="revenue" element={<RevenueTracking />} />
              <Route path="promotions" element={<PromotionManagement />} />
            </Route>

            {/* HMS */}
            <Route
              path="/hms"
              element={
                <ProtectedRoute requireRole="hospital_admin">
                  <HmsLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/hms/dashboard" replace />} />
              <Route path="dashboard" element={<HmsDashboard />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="doctors" element={<DoctorsPage />} />
              <Route path="doctors/new" element={<AddDoctorPage />} />
              <Route path="doctors/:id/edit" element={<EditDoctorPage />} />
              <Route path="patients" element={<PatientsPage />} />
              <Route path="patients/:id" element={<PatientProfilePage />} />
              <Route path="queue" element={<QueuePage />} />
              <Route path="analytics" element={<HmsAnalyticsPage />} />
              <Route path="settings" element={<HmsSettingsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
