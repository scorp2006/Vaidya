import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  ChevronRight,
  Check,
  Loader2,
  Eye,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useCreateHospital } from '@/hooks/useSuperAdmin'

// ── Zod schemas per step ──────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, 'Hospital name must be at least 2 characters'),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(5, 'Full address is required'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email address'),
})

const step2Schema = z.object({
  subscription_plan: z.enum(['basic', 'growth', 'enterprise'], {
    required_error: 'Select a subscription tier',
  }),
})

const step3Schema = z.object({
  admin_name: z.string().min(2, 'Admin name must be at least 2 characters'),
  admin_email: z.string().email('Enter a valid admin email'),
  admin_password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

// ── Plan options ──────────────────────────────────────────────────────────────

const PLANS = [
  {
    value: 'basic',
    label: 'Basic',
    price: '₹30,000/mo',
    description: 'Up to 10 doctors, core HMS features',
    color: 'border-slate-200 hover:border-slate-400',
    selectedColor: 'border-slate-600 bg-slate-50',
    badge: 'bg-slate-100 text-slate-700',
  },
  {
    value: 'growth',
    label: 'Growth',
    price: '₹50,000/mo',
    description: 'Up to 50 doctors, analytics, priority support',
    color: 'border-blue-200 hover:border-blue-400',
    selectedColor: 'border-blue-600 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    price: '₹75,000/mo',
    description: 'Unlimited doctors, custom integrations, SLA',
    color: 'border-purple-200 hover:border-purple-400',
    selectedColor: 'border-purple-600 bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
  },
] as const

// ── Password generator ────────────────────────────────────────────────────────

function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const special = '!@#$%^&*()_+-='
  const all = upper + lower + digits + special
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)]

  let pwd =
    rand(upper) +
    rand(upper) +
    rand(lower) +
    rand(lower) +
    rand(digits) +
    rand(digits) +
    rand(special) +
    rand(special)

  // Fill up to 14 characters
  for (let i = pwd.length; i < 14; i++) {
    pwd += rand(all)
  }

  // Shuffle
  return pwd
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Hospital Info', 'Subscription', 'Admin Account']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1
        const done = stepNum < current
        const active = stepNum === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-16 mx-3 mb-5 transition-all',
                  done ? 'bg-emerald-500' : 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Form field component ──────────────────────────────────────────────────────

interface FieldProps {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
}

function Field({ label, error, children, required }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">{error}</p>
      )}
    </div>
  )
}

// ── Step 1: Hospital Info ─────────────────────────────────────────────────────

function Step1Form({
  defaultValues,
  onNext,
}: {
  defaultValues: Partial<Step1Data>
  onNext: (data: Step1Data) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <Field label="Hospital Name" error={errors.name?.message} required>
        <Input placeholder="e.g. Apollo City Hospital" {...register('name')} />
      </Field>
      <Field label="City" error={errors.city?.message} required>
        <Input placeholder="e.g. Mumbai" {...register('city')} />
      </Field>
      <Field label="Full Address" error={errors.address?.message} required>
        <Input placeholder="e.g. 123 Health Street, Andheri West" {...register('address')} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone" error={errors.phone?.message} required>
          <Input placeholder="+91 98765 43210" {...register('phone')} />
        </Field>
        <Field label="Email" error={errors.email?.message} required>
          <Input type="email" placeholder="info@hospital.com" {...register('email')} />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" className="gap-2">
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}

// ── Step 2: Subscription ──────────────────────────────────────────────────────

function Step2Form({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<Step2Data>
  onNext: (data: Step2Data) => void
  onBack: () => void
}) {
  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues,
  })

  const selected = watch('subscription_plan')

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.value
          return (
            <button
              key={plan.value}
              type="button"
              onClick={() => setValue('subscription_plan', plan.value as Step2Data['subscription_plan'], { shouldValidate: true })}
              className={cn(
                'text-left rounded-xl border-2 p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected ? plan.selectedColor : plan.color,
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <span
                  className={cn(
                    'inline-block px-2 py-0.5 rounded-full text-xs font-bold',
                    plan.badge,
                  )}
                >
                  {plan.label}
                </span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-foreground">{plan.price}</p>
              <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
            </button>
          )
        })}
      </div>
      {errors.subscription_plan && (
        <p className="text-xs text-red-500">{errors.subscription_plan.message}</p>
      )}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="gap-2">
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}

// ── Step 3: Admin Account ─────────────────────────────────────────────────────

function Step3Form({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<Step3Data>
  onNext: (data: Step3Data) => void
  onBack: () => void
}) {
  const [showPwd, setShowPwd] = useState(false)
  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues,
  })

  const password = watch('admin_password') ?? ''

  function handleGenerate() {
    const pwd = generatePassword()
    setValue('admin_password', pwd, { shouldValidate: true })
    setShowPwd(true)
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <Field label="Admin Full Name" error={errors.admin_name?.message} required>
        <Input placeholder="e.g. Dr. Rajan Mehta" {...register('admin_name')} />
      </Field>
      <Field label="Admin Email" error={errors.admin_email?.message} required>
        <Input type="email" placeholder="admin@hospital.com" {...register('admin_email')} />
      </Field>
      <Field label="Password" error={errors.admin_password?.message} required>
        <div className="relative">
          <Input
            type={showPwd ? 'text' : 'password'}
            placeholder="Minimum 10 characters"
            className="pr-20"
            {...register('admin_password')}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
        {password && !errors.admin_password && (
          <p className="text-xs text-emerald-600">Password looks strong</p>
        )}
      </Field>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs gap-2"
        onClick={handleGenerate}
      >
        Auto-generate strong password
      </Button>
      {showPwd && password && (
        <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded-lg break-all">
          {password}
        </p>
      )}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="gap-2">
          Review &amp; Submit <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}

// ── Summary step ──────────────────────────────────────────────────────────────

interface SummaryRow {
  label: string
  value: string
}

function SummaryCard({
  title,
  rows,
}: {
  title: string
  rows: SummaryRow[]
}) {
  return (
    <div className="rounded-xl border border-border/70 overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border/50">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="divide-y divide-border/40">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground text-right max-w-[60%] break-words">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main OnboardHospital page ─────────────────────────────────────────────────

type AllFormData = Step1Data & Step2Data & Step3Data

export function OnboardHospital() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<AllFormData>>({})
  const { mutate: createHospital, isPending } = useCreateHospital()

  function handleStep1(data: Step1Data) {
    setFormData((prev) => ({ ...prev, ...data }))
    setStep(2)
  }

  function handleStep2(data: Step2Data) {
    setFormData((prev) => ({ ...prev, ...data }))
    setStep(3)
  }

  function handleStep3(data: Step3Data) {
    setFormData((prev) => ({ ...prev, ...data }))
    setStep(4)
  }

  function handleSubmit() {
    const payload = formData as AllFormData
    createHospital(payload, {
      onSuccess: () => {
        navigate('/super-admin/hospitals')
      },
    })
  }

  const planLabel =
    PLANS.find((p) => p.value === formData.subscription_plan)?.label ?? '—'
  const planPrice =
    PLANS.find((p) => p.value === formData.subscription_plan)?.price ?? '—'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Onboard Hospital</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Fill in the details to create a new hospital account on MediConnect.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex justify-center py-2">
        <StepIndicator current={Math.min(step, 3)} />
      </div>

      {/* Form card */}
      <Card className="border border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {step === 1 && 'Hospital Information'}
                {step === 2 && 'Choose Subscription Plan'}
                {step === 3 && 'Administrator Account'}
                {step === 4 && 'Review & Confirm'}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {step === 1 && 'Basic details about the hospital'}
                {step === 2 && 'Select the monthly subscription tier'}
                {step === 3 && 'Credentials for the hospital administrator'}
                {step === 4 && 'Verify all details before submitting'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          {step === 1 && (
            <Step1Form defaultValues={formData} onNext={handleStep1} />
          )}
          {step === 2 && (
            <Step2Form
              defaultValues={formData}
              onNext={handleStep2}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3Form
              defaultValues={formData}
              onNext={handleStep3}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <div className="space-y-4">
              <SummaryCard
                title="Hospital Info"
                rows={[
                  { label: 'Name', value: formData.name ?? '—' },
                  { label: 'City', value: formData.city ?? '—' },
                  { label: 'Address', value: formData.address ?? '—' },
                  { label: 'Phone', value: formData.phone ?? '—' },
                  { label: 'Email', value: formData.email ?? '—' },
                ]}
              />
              <SummaryCard
                title="Subscription"
                rows={[
                  { label: 'Plan', value: `${planLabel} — ${planPrice}` },
                ]}
              />
              <SummaryCard
                title="Admin Account"
                rows={[
                  { label: 'Admin Name', value: formData.admin_name ?? '—' },
                  { label: 'Admin Email', value: formData.admin_email ?? '—' },
                  { label: 'Password', value: '••••••••••••' },
                ]}
              />

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  disabled={isPending}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="gap-2 min-w-[130px]"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm &amp; Create
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
