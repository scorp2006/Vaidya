import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, User, Phone, Calendar as CalendarIcon, FileText } from 'lucide-react'
import { getPatients } from '@/lib/hms'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { useAuth } from '@/context/AuthContext'

export function PatientsPage() {
    const { hospitalId } = useAuth()
    const [search, setSearch] = useState('')

    const { data: patients, isLoading } = useQuery({
        queryKey: ['patients', hospitalId],
        queryFn: () => getPatients(hospitalId),
        enabled: !!hospitalId,
    })

    const filteredPatients = patients?.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search)
    ) || []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Patients</h2>
                    <p className="text-muted-foreground">Directory of patients registered with your hospital.</p>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search patients by name or phone..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <PatientsSkeleton />
            ) : filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed h-64">
                    <User className="w-10 h-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No patients found</h3>
                    <p className="text-muted-foreground">
                        {search ? 'Try adjusting your search terms.' : 'Patients will appear here once they register or book appointments.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPatients.map((patient) => (
                        <Card key={patient.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center gap-4 p-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={patient.profile_url ?? undefined} alt={patient.name} />
                                    <AvatarFallback>{patient.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <CardTitle className="text-base">{patient.name}</CardTitle>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {patient.phone || 'No phone'}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 bg-muted/20 border-t">
                                <div className="grid grid-cols-2 gap-4 py-2 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Gender</span>
                                        <span className="font-medium capitalize">{patient.gender || '-'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Age</span>
                                        <span className="font-medium">
                                            {patient.date_of_birth ?
                                                `${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} yrs`
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col col-span-2">
                                        <span className="text-xs text-muted-foreground">Last Visit</span>
                                        <span className="font-medium flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                                            {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : 'Never'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 flex justify-end">
                                    <Button variant="ghost" size="sm" className="text-xs h-8">
                                        <FileText className="w-3 h-3 mr-1" />
                                        View Details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

function PatientsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center gap-4 p-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 mt-2 space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
