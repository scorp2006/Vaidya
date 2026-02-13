import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { HospitalAdmin, SuperAdmin } from '@/types/database'

type UserRole = 'super_admin' | 'hospital_admin' | null

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole
  profile: HospitalAdmin | SuperAdmin | null
  hospitalId: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    profile: null,
    hospitalId: null,
    loading: true,
  })

  async function loadProfile(user: User): Promise<Partial<AuthState>> {
    // Check super_admin first
    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (superAdmin) {
      // Update last_login_at
      await supabase
        .from('super_admins')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', user.id)

      return { role: 'super_admin', profile: superAdmin, hospitalId: null }
    }

    // Check hospital_admin
    const { data: hospitalAdmin } = await supabase
      .from('hospital_admins')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (hospitalAdmin) {
      await supabase
        .from('hospital_admins')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', user.id)

      return {
        role: 'hospital_admin',
        profile: hospitalAdmin,
        hospitalId: hospitalAdmin.hospital_id,
      }
    }

    return { role: null, profile: null, hospitalId: null }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profileData = await loadProfile(session.user)
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          ...profileData,
          loading: false,
        }))
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profileData = await loadProfile(session.user)
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            ...profileData,
            loading: false,
          }))
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            role: null,
            profile: null,
            hospitalId: null,
            loading: false,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
