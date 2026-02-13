import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export function UnauthorizedPage() {
    const navigate = useNavigate()
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <div className="mb-4 rounded-full bg-destructive/10 p-4">
                <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                You do not have permission to view this page. Please contact your administrator if you believe this is an error.
            </p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
    )
}
