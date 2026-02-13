import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, MoreHorizontal, Building2 } from 'lucide-react'
import { getAllHospitals } from '@/lib/super-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function HospitalsPage() {
    const [search, setSearch] = useState('')
    const { data: hospitals, isLoading } = useQuery({
        queryKey: ['admin-hospitals'],
        queryFn: getAllHospitals,
    })

    const filteredHospitals = hospitals?.filter(h =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.city.toLowerCase().includes(search.toLowerCase())
    ) || []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Hospitals</h2>
                    <p className="text-muted-foreground">Manage registered hospitals and clinics.</p>
                </div>
                <Button asChild>
                    <a href="/admin/hospitals/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Onboard Hospital
                    </a>
                </Button>
            </div>

            <div className="flex items-center py-4">
                <Input
                    placeholder="Search by name or city..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hospital Name</TableHead>
                            <TableHead>Subdomain</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10">
                                    Loading hospitals...
                                </TableCell>
                            </TableRow>
                        ) : filteredHospitals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No hospitals found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredHospitals.map((hospital) => (
                                <TableRow key={hospital.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-primary/10 p-2 rounded-lg">
                                                <Building2 className="w-4 h-4 text-primary" />
                                            </div>
                                            {hospital.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{hospital.subdomain}.mediconnect.com</TableCell>
                                    <TableCell>{hospital.city}</TableCell>
                                    <TableCell>
                                        <Badge variant={hospital.subscription_status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                            {hospital.subscription_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">{hospital.subscription_plan}</TableCell>
                                    <TableCell>{new Date(hospital.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                                <DropdownMenuItem>Edit Settings</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">Suspend Access</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
