import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

interface Props {
  children: React.ReactNode
  requireRole?: 'super_admin' | 'hospital_admin'
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirect to appropriate login page based on path
    const isSuper = location.pathname.startsWith('/super-admin')
    return <Navigate to={isSuper ? '/super-admin/login' : '/login'} state={{ from: location }} replace />
  }

  if (requireRole && role !== requireRole) {
    // Wrong role — send to their home
    if (role === 'super_admin') return <Navigate to="/super-admin" replace />
    if (role === 'hospital_admin') return <Navigate to="/hms/dashboard" replace />
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
