import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function RedirectPage() {
    const { role, loading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!loading) {
            // Role has been determined (or timed out)
            if (role === 'super_admin') {
                navigate('/admin/dashboard', { replace: true })
            } else if (role === 'hospital_admin') {
                navigate('/hms/dashboard', { replace: true })
            } else {
                // Role is null (timeout or no role) - default to HMS
                navigate('/hms/dashboard', { replace: true })
            }
        }
    }, [role, loading, navigate])

    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Redirecting...</p>
            </div>
        </div>
    )
}
