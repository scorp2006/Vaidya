import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
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
    const isSuper = location.pathname.startsWith('/admin')
    return <Navigate to={isSuper ? '/login' : '/login'} state={{ from: location }} replace />
  }

  // Check role authorization
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Wrong role — send to their home
    if (role === 'super_admin') return <Navigate to="/admin" replace />
    // If they are hospital staff but trying to access unauthorized area, send to dashboard
    if (['admin', 'manager', 'receptionist'].includes(role)) return <Navigate to="/hms/dashboard" replace />

    // Default fallback
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
