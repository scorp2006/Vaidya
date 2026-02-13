import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Filter, MoreHorizontal, Check, X, Clock } from 'lucide-react'
import { getAppointments, updateAppointmentStatus } from '@/lib/hms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useAuth } from "@/context/AuthContext"; // Added useAuth import

export function AppointmentsPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { hospitalId } = useAuth() // Replaced hardcoded hospitalId with useAuth

    // Use string for native date input (YYYY-MM-DD)
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd')) // Renamed dateStr to date
    const [status, setStatus] = useState<string>('all') // Renamed statusFilter to status
    const [search, setSearch] = useState('')

    const { data: appointments, isLoading, refetch } = useQuery({ // Added refetch
        queryKey: ['appointments', hospitalId, date, status, search], // Updated queryKey
        queryFn: () =>
            getAppointments(hospitalId!, { // Added '!' to hospitalId
                date: date || undefined, // Updated variable name
                status: status === 'all' ? undefined : status, // Updated variable name
                search: search || undefined,
            }),
        enabled: !!hospitalId,
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'confirmed' | 'cancelled' | 'completed' | 'no_show' }) =>
            updateAppointmentStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
            queryClient.invalidateQueries({ queryKey: ['hms-dashboard'] })
            toast({ title: 'Status updated' })
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: String(error),
                variant: 'destructive',
            })
        },
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
                    <p className="text-muted-foreground">Manage patient bookings and schedules.</p>
                </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    {/* Native Date Picker */}
                    <div className="w-[240px]">
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="no_show">No Show</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Search */}
                <div className="w-full sm:w-[300px]">
                    <Input
                        placeholder="Search by patient name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex items-center justify-center">
                                        <Clock className="w-4 h-4 mr-2 animate-spin text-muted-foreground" />
                                        Loading appointments...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : appointments?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No appointments found for this date.
                                </TableCell>
                            </TableRow>
                        ) : (
                            appointments?.map((appt) => (
                                <TableRow key={appt.id}>
                                    <TableCell className="font-medium">
                                        {appt.appointment_time.slice(0, 5)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{appt.patient_name || 'Unknown'}</div>
                                        <div className="text-xs text-muted-foreground">{appt.patient_phone}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{appt.doctor?.name}</div>
                                        <div className="text-xs text-muted-foreground">{appt.doctor?.specialization}</div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={appt.status} />
                                    </TableCell>
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
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => updateStatusMutation.mutate({ id: appt.id, status: 'confirmed' })}
                                                    disabled={appt.status === 'confirmed'}
                                                >
                                                    <Check className="w-4 h-4 mr-2" /> Mark Confirmed
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => updateStatusMutation.mutate({ id: appt.id, status: 'completed' })}
                                                    disabled={appt.status === 'completed'}
                                                >
                                                    <Check className="w-4 h-4 mr-2" /> Mark Completed
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => updateStatusMutation.mutate({ id: appt.id, status: 'no_show' })}
                                                    disabled={appt.status === 'no_show'}
                                                >
                                                    <X className="w-4 h-4 mr-2" /> Mark No-Show
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => updateStatusMutation.mutate({ id: appt.id, status: 'cancelled' })}
                                                    disabled={appt.status === 'cancelled'}
                                                >
                                                    Cancel Appointment
                                                </DropdownMenuItem>
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

function StatusBadge({ status }: { status: string }) {
    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        confirmed: 'default',
        completed: 'secondary',
        cancelled: 'destructive',
        pending: 'outline',
        no_show: 'destructive',
    }

    const variant = variantMap[status] || 'outline'
    const label = status.replace('_', ' ').toUpperCase()

    return (
        <Badge variant={variant}>
            {label}
        </Badge>
    )
}
