import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Search,
  Plus,
  Eye,
  Pause,
  Play,
  Hospital,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAllHospitals, useUpdateHospitalStatus } from '@/hooks/useSuperAdmin'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function TierBadge({ tier }: { tier: string }) {
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

function StatusBadge({ status }: { status: string }) {
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

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          <TableCell className="pl-5">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell className="pr-5">
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-7 w-14 rounded" />
              <Skeleton className="h-7 w-20 rounded" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

// ── Hospital List Page ────────────────────────────────────────────────────────

export function HospitalList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: hospitals, isLoading } = useAllHospitals()
  const { mutate: updateStatus, isPending: statusPending } = useUpdateHospitalStatus()

  const filtered = useMemo(() => {
    if (!hospitals) return []
    const q = search.toLowerCase().trim()
    if (!q) return hospitals
    return hospitals.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.city?.toLowerCase().includes(q),
    )
  }, [hospitals, search])

  function handleToggleStatus(h: any) {
    const nextStatus = h.subscription_status === 'suspended' ? 'active' : 'suspended'
    updateStatus({ hospitalId: h.id, status: nextStatus })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Hospitals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage all onboarded hospitals on the platform
          </p>
        </div>
        <Button
          onClick={() => navigate('/super-admin/hospitals/new')}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Onboard Hospital
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="border border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Hospital</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Doctors</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows />
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-16 pl-5"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="w-8 h-8 text-muted-foreground/40" />
                      <span className="text-sm">
                        {search
                          ? 'No hospitals match your search.'
                          : 'No hospitals onboarded yet.'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((h) => (
                  <TableRow
                    key={h.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate(`/super-admin/hospitals/${h.id}`)}
                  >
                    {/* Name */}
                    <TableCell className="pl-5 font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
                          <Hospital className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="truncate max-w-[180px]">{h.name}</span>
                      </div>
                    </TableCell>

                    {/* City */}
                    <TableCell className="text-muted-foreground text-sm">
                      {h.city ?? '—'}
                    </TableCell>

                    {/* Tier */}
                    <TableCell>
                      <TierBadge tier={h.subscription_plan} />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={h.subscription_status} />
                    </TableCell>

                    {/* Doctors count */}
                    <TableCell className="text-muted-foreground text-sm">
                      {h.doctors_count != null ? h.doctors_count : '—'}
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(h.created_at)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-5">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/super-admin/hospitals/${h.id}`)
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'h-7 px-2 text-xs gap-1',
                            h.subscription_status === 'suspended'
                              ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                              : 'text-red-600 border-red-200 hover:bg-red-50',
                          )}
                          disabled={statusPending}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleStatus(h)
                          }}
                        >
                          {h.subscription_status === 'suspended' ? (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              Activate
                            </>
                          ) : (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              Suspend
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Footer count */}
          {!isLoading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {filtered.length} of {hospitals?.length ?? 0} hospitals
              </span>
              {search && (
                <button
                  className="underline hover:text-foreground transition-colors"
                  onClick={() => setSearch('')}
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
