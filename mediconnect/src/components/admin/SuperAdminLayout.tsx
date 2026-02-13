import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Settings, LogOut, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Building2, label: 'Hospitals', href: '/admin/hospitals' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
]

export function SuperAdminLayout() {
    const location = useLocation()
    const { signOut } = useAuth()

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-50 flex flex-col fixed h-full">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">MediConnect</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">SUPER ADMIN</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {sidebarItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.href)
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-200" : "text-slate-500")} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-3"
                        onClick={() => signOut()}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 min-w-0">
                <header className="h-16 bg-white border-b sticky top-0 z-10 px-6 flex items-center justify-between shadow-sm">
                    <h2 className="font-semibold text-lg text-slate-800">
                        {sidebarItems.find(i => location.pathname.startsWith(i.href))?.label || 'Dashboard'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
                    </div>
                </header>

                <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
