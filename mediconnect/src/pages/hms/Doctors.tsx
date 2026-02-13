import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Stethoscope, Star } from 'lucide-react'
import { getDoctors } from '@/lib/hms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export function DoctorsPage() {
    const { hospitalId } = useAuth()
    const [search, setSearch] = useState('')

    const { data: doctors, isLoading } = useQuery({
        queryKey: ['doctors', hospitalId],
        queryFn: () => getDoctors(hospitalId!),
        enabled: !!hospitalId,
    })

    const filteredDoctors = doctors?.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialization.toLowerCase().includes(search.toLowerCase())
    ) || []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Doctors</h2>
                    <p className="text-muted-foreground">Manage your hospital's medical staff</p>
                </div>
                <Button asChild>
                    <Link to="/hms/doctors/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Doctor
                    </Link>
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search doctors..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <DoctorsSkeleton />
            ) : filteredDoctors.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed h-64">
                    <Stethoscope className="w-10 h-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No doctors found</h3>
                    <p className="text-muted-foreground mb-4">
                        {search ? 'Try adjusting your search terms.' : 'Get started by adding your first doctor.'}
                    </p>
                    {!search && (
                        <Button asChild variant="outline">
                            <Link to="/hms/doctors/new">Add Doctor</Link>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredDoctors.map((doctor) => (
                        <Card key={doctor.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <div className="aspect-video w-full bg-muted/30 flex items-center justify-center border-b">
                                {doctor.profile_image_url ? (
                                    <img src={doctor.profile_image_url} alt={doctor.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Stethoscope className="w-12 h-12 text-muted-foreground/30" />
                                )}
                            </div>
                            <CardHeader className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{doctor.name}</CardTitle>
                                        <CardDescription className="font-medium text-primary">
                                            {doctor.specialization}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={doctor.is_active ? "default" : "secondary"}>
                                        {doctor.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                                    <span>{doctor.rating.toFixed(1)} ({doctor.total_reviews} reviews)</span>
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">₹{doctor.consultation_fee}</span> / visit
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

function DoctorsSkeleton() {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <CardHeader className="p-4 space-y-2">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <Skeleton className="h-4 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
