import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Hospital,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  usePlatformStats,
  useRecentHospitals,
  useMonthlyStats,
} from '@/hooks/useSuperAdmin'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatCurrency(n: number | undefined | null): string {
  if (n == null) return '—'
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n}`
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type TierLabel = 'basic' | 'growth' | 'enterprise' | string

function TierBadge({ tier }: { tier: TierLabel }) {
  const map: Record<string, string> = {
    basic: 'bg-slate-100 text-slate-700 border-slate-200',
    growth: 'bg-blue-50 text-blue-700 border-blue-200',
    enterprise: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  const cls = map[tier] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize',
        cls,
      )}
    >
      {tier}
    </span>
  )
}

type StatusLabel = 'active' | 'trial' | 'suspended' | string

function StatusBadge({ status }: { status: StatusLabel }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    trial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize',
        cls,
      )}
    >
      {status}
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string
  icon: React.ElementType
  trend?: number | null
  trendLabel?: string
  iconBg?: string
  loading?: boolean
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconBg = 'bg-primary/10',
  loading = false,
}: StatCardProps) {
  const trendPositive = trend != null && trend >= 0

  return (
    <Card className="border border-border/60">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {trend != null && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    trendPositive ? 'text-emerald-600' : 'text-red-500',
                  )}
                >
                  {trendPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {trendPositive ? '+' : ''}
                    {trend.toFixed(1)}% {trendLabel ?? 'vs last month'}
                  </span>
                </div>
              )}
            </div>
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl',
                iconBg,
              )}
            >
              <Icon className="w-5 h-5 text-primary" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Revenue Chart ─────────────────────────────────────────────────────────────

function RevenueChart({
  data,
  loading,
}: {
  data: { month: string; revenue: number; commission: number }[] | undefined
  loading: boolean
}) {
  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Monthly Revenue</CardTitle>
        <CardDescription>Platform revenue over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56 w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={data ?? []}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="comGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(val: number) => [`₹${val.toLocaleString()}`, undefined]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
              <Area
                type="monotone"
                dataKey="commission"
                name="Commission"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#comGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Recent Hospitals Table ────────────────────────────────────────────────────

function RecentHospitalsTable({
  hospitals,
  loading,
}: {
  hospitals: any[] | undefined
  loading: boolean
}) {
  const navigate = useNavigate()

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Recent Hospitals</CardTitle>
          <CardDescription>Newly onboarded hospitals</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1"
          onClick={() => navigate('/super-admin/hospitals')}
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-5 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(hospitals ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10 pl-5">
                    No hospitals found.
                  </TableCell>
                </TableRow>
              ) : (
                (hospitals ?? []).map((h) => (
                  <TableRow
                    key={h.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/super-admin/hospitals/${h.id}`)}
                  >
                    <TableCell className="pl-5 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                          <Hospital className="w-3.5 h-3.5 text-primary" />
                        </div>
                        {h.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{h.city ?? '—'}</TableCell>
                    <TableCell>
                      <TierBadge tier={h.subscription_plan} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={h.subscription_status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(h.created_at)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/super-admin/hospitals/${h.id}`)
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

export function SuperAdminDashboard() {
  const { data: stats, isLoading: statsLoading } = usePlatformStats()
  const { data: recentHospitals, isLoading: hospitalsLoading } = useRecentHospitals()
  const { data: monthlyStats, isLoading: monthlyLoading } = useMonthlyStats()

  const statCards = [
    {
      title: 'Total Hospitals',
      value: formatNumber(stats?.total_hospitals),
      icon: Building2,
      trend: stats?.hospitals_growth ?? null,
      iconBg: 'bg-blue-50',
    },
    {
      title: 'Active Hospitals',
      value: formatNumber(stats?.active_hospitals),
      icon: Hospital,
      trend: stats?.active_growth ?? null,
      iconBg: 'bg-emerald-50',
    },
    {
      title: 'Total Doctors',
      value: formatNumber(stats?.total_doctors),
      icon: Users,
      trend: stats?.doctors_growth ?? null,
      iconBg: 'bg-purple-50',
    },
    {
      title: "Today's Appointments",
      value: formatNumber(stats?.todays_appointments),
      icon: Calendar,
      trend: stats?.appointments_growth ?? null,
      iconBg: 'bg-orange-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform overview and key metrics
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} loading={statsLoading} />
        ))}
      </div>

      {/* Revenue chart */}
      <RevenueChart data={monthlyStats} loading={monthlyLoading} />

      {/* Recent hospitals */}
      <RecentHospitalsTable hospitals={recentHospitals} loading={hospitalsLoading} />
    </div>
  )
}
