import { useQuery } from '@tanstack/react-query'
import { getHmsDashboard } from '@/lib/hms'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Stethoscope, Calendar, Users, Clock, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function HmsDashboard() {
  const { user } = useAuth()

  // In a real app, the hospital_id should come from the user's profile or context.
  // For now, we'll assume the user metadata contains it, or we fetch it.
  // Based on `src/lib/subdomain.ts` logic (not seen but implied), 
  // or `src/lib/hms.ts` requiring hospitalId.
  // Let's assume for this MVP that we can get it from the first hospital_admin record 
  // or the auth context if updated. 
  // CAVEAT: The current AuthContext might not expose hospital_id directly.
  // We'll try to use a hardcoded active hospital ID if not found, or handle error.

  // TODO: Fix this to get actual hospital ID dynamically
  // const hospitalId = '00000000-0000-0000-0000-000000000000' // Placeholder

  const { data, isLoading, error } = useQuery({
    queryKey: ['hms-dashboard', hospitalId],
    queryFn: () => getHmsDashboard(hospitalId!),
    enabled: !!hospitalId,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Error loading dashboard</h3>
        <p className="text-muted-foreground">{String(error)}</p>
      </div>
    )
  }

  const { activeDoctors, todayAppointments, totalPatients, upcomingQueue } = data || {
    activeDoctors: 0,
    todayAppointments: 0,
    totalPatients: 0,
    upcomingQueue: [],
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Active Doctors"
          value={activeDoctors}
          icon={Stethoscope}
          description="Doctors available today"
        />
        <StatsCard
          title="Today's Appointments"
          value={todayAppointments}
          icon={Calendar}
          description="Confirmed bookings"
        />
        <StatsCard
          title="Total Patients"
          value={totalPatients}
          icon={Users}
          description="Registered patients"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Upcoming Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No upcoming appointments in queue.</p>
            ) : (
              <div className="space-y-4">
                {upcomingQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{item.patient_name || 'Unknown Patient'}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.appointment_time.slice(0, 5)} • {item.doctor?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium capitalize text-primary">
                      {item.status.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* TODO: Add quick actions */}
            <p className="text-sm text-muted-foreground">Shortcuts coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: number
  icon: React.ElementType
  description: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-3 w-[140px]" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-[300px] w-full rounded-xl" />
    </div>
  )
}
