import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createDoctor } from '@/lib/hms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'

// Schema
const doctorSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    specialization: z.string().min(2, 'Specialization is required'),
    qualification: z.string().optional(),
    consultation_fee: z.coerce.number().min(0, 'Fee must be positive'),
    slot_start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    slot_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    working_days: z.array(z.number()).min(1, 'Select at least one working day'),
})

type DoctorFormValues = z.infer<typeof doctorSchema>

const DAYS = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' },
]

export function AddDoctorPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<DoctorFormValues>({
        resolver: zodResolver(doctorSchema),
        defaultValues: {
            name: '',
            specialization: '',
            qualification: '',
            consultation_fee: 500,
            slot_start_time: '09:00',
            slot_end_time: '17:00',
            working_days: [1, 2, 3, 4, 5],
        },
    })

    async function onSubmit(data: DoctorFormValues) {
        setIsLoading(true)
        try {
            await createDoctor({
                name: data.name,
                specialization: data.specialization,
                qualifications: data.qualification,
                experience_years: 0, // Default or add field
                consultation_fee: data.consultation_fee,
                working_days: data.working_days,
                working_hours_start: data.slot_start_time + ':00',
                working_hours_end: data.slot_end_time + ':00',
                slot_duration: 30, // Default
            })

            toast({
                title: 'Doctor added',
                description: `${data.name} has been added successfully.`,
            })
            navigate('/hms/doctors')
        } catch (error) {
            console.error(error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to add doctor. Please try again.',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/hms/doctors')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Add New Doctor</h2>
                    <p className="text-muted-foreground">Onboard a new doctor to your hospital.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Doctor Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Dr. John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="specialization"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Specialization</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Cardiologist" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="qualification"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Qualification</FormLabel>
                                            <FormControl>
                                                <Input placeholder="MBBS, MD" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="consultation_fee"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Consultation Fee (₹)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="slot_start_time"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Time</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="slot_end_time"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Time</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="working_days"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-4">
                                            <FormLabel className="text-base">Working Days</FormLabel>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {DAYS.map((day) => (
                                                <FormField
                                                    key={day.id}
                                                    control={form.control}
                                                    name="working_days"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem
                                                                key={day.id}
                                                                className="flex flex-row items-center space-x-3 space-y-0"
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(day.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, day.id])
                                                                                : field.onChange(
                                                                                    field.value?.filter(
                                                                                        (value) => value !== day.id
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal cursor-pointer">
                                                                    {day.label}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => navigate('/hms/doctors')}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Doctor
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
