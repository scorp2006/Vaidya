import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
                MediConnect
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-lg">
                Hospital Management and Patient Care, Simplified.
            </p>
            <div className="flex gap-4">
                <Button asChild size="lg">
                    <Link to="/login">Hospital Login</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                    <Link to="/admin">Super Admin</Link>
                </Button>
            </div>
        </div>
    )
}
