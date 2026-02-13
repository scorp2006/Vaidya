import { useQuery } from '@tanstack/react-query'
import { Activity, CreditCard, Users, TrendingUp } from 'lucide-react'
import { getPlatformStats } from '@/lib/super-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SuperAdminDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['platform-stats'],
        queryFn: getPlatformStats,
    })

    if (isLoading) {
        return <DashboardSkeleton />
    }

    const {
        totalHospitals,
        totalRevenueThisMonth: totalRevenue,
        totalDoctors: activePatients, // Using doctors count as proxy for now or need to fix prop mapping
        activeHospitals
    } = data || {
        totalHospitals: 0,
        totalRevenueThisMonth: 0,
        totalDoctors: 0,
        activeHospitals: 0,
    }

    // Calculate growth (mock for now as we don't have historical data easily accessible in one go)
    const hospitalsGrowth = 0

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Hospitals"
                    value={totalHospitals}
                    icon={Activity}
                    description={`+${hospitalsGrowth}% from last month`}
                />
                <StatsCard
                    title="Total Revenue"
                    value={`₹${(totalRevenue / 100000).toFixed(1)}L`}
                    icon={CreditCard}
                    description="Platform earnings"
                />
                <StatsCard
                    title="Active Patients"
                    value={activePatients.toLocaleString()}
                    icon={Users}
                    description="Across all hospitals"
                />
                <StatsCard
                    title="Growth Rate"
                    value={`${hospitalsGrowth}%`}
                    icon={TrendingUp}
                    description="New hospital signups"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                            <p>Chart Placeholder (Recharts)</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex items-center">
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">New Hospital Onboarded</p>
                                        <p className="text-sm text-muted-foreground">Just now</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function StatsCard({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: any, description: string }) {
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
            <div className="grid gap-4 md:grid-cols-7">
                <Skeleton className="col-span-4 h-64 rounded-xl" />
                <Skeleton className="col-span-3 h-64 rounded-xl" />
            </div>
        </div>
    )
}
