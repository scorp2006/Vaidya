import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { createHospital, createHospitalAdmin } from '@/lib/super-admin'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const formSchema = z.object({
    name: z.string().min(2, 'Hospital name must be at least 2 characters'),
    subdomain: z.string()
        .min(3, 'Subdomain must be at least 3 characters')
        .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
    city: z.string().min(2, 'City is required'),
    adminName: z.string().min(2, 'Admin name is required'),
    adminEmail: z.string().email('Invalid email address'),
    adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
    plan: z.enum(['basic', 'growth', 'enterprise']),
})

export function OnboardHospitalPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            subdomain: '',
            city: '',
            adminName: '',
            adminEmail: '',
            adminPassword: '',
            plan: 'growth',
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            // 1. Create the hospital
            const hospital = await createHospital({
                name: values.name,
                city: values.city,
                address: values.city, // Using city as address for now since form doesn't have address field
                phone: '', // Placeholder
                email: values.adminEmail, // Using admin email as hospital email
                subscription_plan: values.plan,
            })

            if (!hospital) throw new Error('Failed to create hospital')

            // 2. Create the admin user linked to this hospital
            await createHospitalAdmin({
                hospitalId: hospital.id,
                email: values.adminEmail,
                name: values.adminName,
                password: values.adminPassword,
            })

            toast({
                title: "Hospital Onboarded",
                description: `${values.name} has been successfully registered with admin access.`,
            })

            navigate('/admin/hospitals')
        } catch (error: any) {
            console.error('Onboarding error:', error)
            toast({
                title: "Error",
                description: error.message || "Failed to onboard hospital. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/admin/hospitals')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Onboard New Hospital</h2>
                    <p className="text-muted-foreground">Register a new hospital and create their admin account.</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Hospital Details</CardTitle>
                            <CardDescription>Basic information about the medical facility.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hospital Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Apollo Hospitals" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="subdomain"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subdomain</FormLabel>
                                            <FormControl>
                                                <div className="flex">
                                                    <Input placeholder="apollo" className="rounded-r-none" {...field} />
                                                    <div className="flex items-center px-3 border border-l-0 rounded-r-md bg-muted text-muted-foreground text-sm">
                                                        .mediconnect.com
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription>Unique URL identifier for this hospital.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Hyderabad" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="plan"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subscription Plan</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a plan" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="basic">Basic (₹30,000/mo)</SelectItem>
                                                <SelectItem value="growth">Growth (₹50,000/mo)</SelectItem>
                                                <SelectItem value="enterprise">Enterprise (₹75,000/mo)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Administrator Account</CardTitle>
                            <CardDescription>Create the initial admin user for this hospital.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="adminName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admin Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Dr. Suresh Kumar" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="adminEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="admin@hospital.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="adminPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="••••••••" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button variant="outline" type="button" onClick={() => navigate('/admin/hospitals')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? 'Onboarding...' : 'Onboard Hospital'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}
