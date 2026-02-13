import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Stethoscope,
  Users,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronRight,
  Bell,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { HospitalAdmin } from '@/types/database'

interface NavItem {
  label: string
  icon: React.ElementType
  to: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/hms/dashboard' },
  { label: 'Appointments', icon: Calendar, to: '/hms/appointments' },
  { label: 'Doctors', icon: Stethoscope, to: '/hms/doctors' },
  { label: 'Patients', icon: Users, to: '/hms/patients' },
  { label: 'Queue', icon: Clock, to: '/hms/queue' },
  { label: 'Analytics', icon: BarChart3, to: '/hms/analytics' },
  { label: 'Settings', icon: Settings, to: '/hms/settings' },
]

const pageTitleMap: Record<string, string> = {
  '/hms/dashboard': 'Dashboard',
  '/hms/appointments': 'Appointments',
  '/hms/doctors': 'Doctors',
  '/hms/patients': 'Patients',
  '/hms/queue': 'Queue',
  '/hms/analytics': 'Analytics',
  '/hms/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  if (pageTitleMap[pathname]) return pageTitleMap[pathname]
  const matched = Object.keys(pageTitleMap).find(key => pathname.startsWith(key + '/'))
  return matched ? pageTitleMap[matched] : 'Hospital Management'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

function SidebarContent({
  displayName,
  hospitalName,
  initials,
  onSignOut,
  onNavClick,
}: {
  displayName: string
  hospitalName: string
  initials: string
  onSignOut: () => void
  onNavClick?: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Hospital brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-sm font-bold text-sidebar-foreground truncate">{hospitalName}</p>
          <p className="text-[10px] font-medium text-sidebar-foreground/60 uppercase tracking-widest">
            HMS
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
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
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">Hospital Admin</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="mt-2 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export function HmsLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const adminProfile = profile as HospitalAdmin | null
  const displayName = adminProfile?.name ?? 'Admin'
  const initials = getInitials(displayName)
  const pageTitle = getPageTitle(location.pathname)

  // Hospital name: prefer a hospital name field; fall back to display name
  // The HospitalAdmin profile doesn't carry the hospital name directly,
  // so we show the admin name in the top bar and "Hospital Management" in the brand area.
  // If a `hospital_name` field is added to profile later, it can be consumed here.
  const hospitalName = 'Hospital Management'

  async function handleSignOut() {
    await signOut()
    navigate('/hms/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-y-auto">
        <SidebarContent
          displayName={displayName}
          hospitalName={hospitalName}
          initials={initials}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Sidebar Drawer ── */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-200 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <SidebarContent
          displayName={displayName}
          hospitalName={hospitalName}
          initials={initials}
          onSignOut={handleSignOut}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">HMS</span>
              <ChevronRight className="hidden sm:block w-3.5 h-3.5" />
              <span className="font-semibold text-foreground">{pageTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button
              aria-label="Notifications"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* User badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold select-none">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground leading-tight">{displayName}</p>
                <p className="text-xs text-muted-foreground leading-tight">Hospital Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
