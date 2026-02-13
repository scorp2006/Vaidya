import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { Stethoscope, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (signInError || !user) {
      setServerError(signInError?.message ?? 'Invalid email or password. Please try again.')
      return
    }

    // Navigate to redirect page which will determine role and redirect appropriately
    navigate('/redirect', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm px-8 py-10">

          {/* Branding */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary">
              <Stethoscope className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">MediConnect</h1>
              <p className="text-sm text-muted-foreground mt-1">Hospital Management Portal</p>
            </div>
          </div>

          {/* Form heading */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your credentials to access the HMS dashboard.
            </p>
          </div>

          {/* Error alert */}
          {serverError && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{serverError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@hospital.com"
                  className={[
                    'w-full rounded-lg border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
                    'outline-none transition-colors',
                    'focus:ring-2 focus:ring-ring focus:border-ring',
                    errors.email ? 'border-destructive focus:ring-destructive/40' : 'border-input',
                  ].join(' ')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={[
                    'w-full rounded-lg border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
                    'outline-none transition-colors',
                    'focus:ring-2 focus:ring-ring focus:border-ring',
                    errors.password ? 'border-destructive focus:ring-destructive/40' : 'border-input',
                  ].join(' ')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Are you a platform admin?{' '}
              <Link
                to="/super-admin/login"
                className="text-primary font-medium hover:underline"
              >
                Super Admin Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
