import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  DollarSign,
  Star,
  LogOut,
  Bell,
  ChevronRight,
  Stethoscope,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { SuperAdmin } from '@/types/database'

interface NavItem {
  label: string
  icon: React.ElementType
  to: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/super-admin/dashboard' },
  { label: 'Hospitals', icon: Building2, to: '/super-admin/hospitals' },
  { label: 'Analytics', icon: BarChart3, to: '/super-admin/analytics' },
  { label: 'Revenue', icon: DollarSign, to: '/super-admin/revenue' },
  { label: 'Promotions', icon: Star, to: '/super-admin/promotions' },
]

const pageTitleMap: Record<string, string> = {
  '/super-admin/dashboard': 'Dashboard',
  '/super-admin/hospitals': 'Hospitals',
  '/super-admin/analytics': 'Analytics',
  '/super-admin/revenue': 'Revenue',
  '/super-admin/promotions': 'Promotions',
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitleMap[pathname]) return pageTitleMap[pathname]
  // Prefix match for nested routes (e.g. /super-admin/hospitals/new)
  const matched = Object.keys(pageTitleMap).find(key => pathname.startsWith(key + '/'))
  return matched ? pageTitleMap[matched] : 'Super Admin'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

export function SuperAdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const adminProfile = profile as SuperAdmin | null
  const displayName = adminProfile?.name ?? 'Super Admin'
  const displayEmail = adminProfile?.email ?? ''
  const initials = getInitials(displayName)
  const pageTitle = getPageTitle(location.pathname)

  async function handleSignOut() {
    await signOut()
    navigate('/super-admin/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="flex flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-y-auto">

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <Stethoscope className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-sidebar-foreground">MediConnect</p>
            <p className="text-[10px] font-medium text-sidebar-foreground/60 uppercase tracking-widest">
              Admin
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                ].join(' ')
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            {/* Avatar */}
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/20 text-primary-foreground text-xs font-bold shrink-0 select-none">
              {initials}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</p>
              {displayEmail && (
                <p className="text-xs text-sidebar-foreground/50 truncate">{displayEmail}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Super Admin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground">{pageTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button
              aria-label="Notifications"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Admin badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold select-none">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground leading-tight">{displayName}</p>
                <p className="text-xs text-muted-foreground leading-tight">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
