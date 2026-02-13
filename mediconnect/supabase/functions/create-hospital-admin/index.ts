/**
 * create-hospital-admin Edge Function
 * Called by Super Admin to onboard a new hospital + create their admin account.
 *
 * POST body: {
 *   hospitalId: string,    // existing hospital row id
 *   email: string,
 *   name: string,
 *   password: string,
 *   role?: 'admin' | 'manager' | 'receptionist'
 * }
 *
 * Requires: Authorization: Bearer <service_role_key>
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Build service-role client for admin operations
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify caller is an authenticated super admin
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')

  // Try service role bypass first (for cron/scripts)
  const isServiceRole = token === SERVICE_ROLE_KEY

  if (!isServiceRole) {
    // Verify JWT and check super_admin table
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!superAdmin) {
      return new Response('Forbidden: super admin only', { status: 403 })
    }
  }

  try {
    const body = await req.json() as {
      hospitalId: string
      email: string
      name: string
      password: string
      role?: 'admin' | 'manager' | 'receptionist'
    }

    const { hospitalId, email, name, password, role = 'admin' } = body

    if (!hospitalId || !email || !name || !password) {
      return json({ success: false, error: 'Missing required fields' }, 400)
    }

    // 1. Check hospital exists
    const { data: hospital, error: hErr } = await supabase
      .from('hospitals')
      .select('id, name')
      .eq('id', hospitalId)
      .single()

    if (hErr || !hospital) {
      return json({ success: false, error: 'Hospital not found' }, 404)
    }

    // 2. Create Supabase Auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // skip email confirmation for admin-created accounts
    })

    if (authErr || !authData?.user) {
      return json({ success: false, error: authErr?.message ?? 'Failed to create auth user' }, 400)
    }

    const userId = authData.user.id

    // 3. Insert hospital_admin record
    const { data: admin, error: adminErr } = await supabase
      .from('hospital_admins')
      .insert({
        hospital_id: hospitalId,
        user_id: userId,
        email,
        name,
        role,
      })
      .select('id, email, name, role, created_at')
      .single()

    if (adminErr) {
      // Rollback: delete the auth user we just created
      await supabase.auth.admin.deleteUser(userId)
      return json({ success: false, error: adminErr.message }, 500)
    }

    // 4. Log in audit
    await supabase.from('audit_logs').insert({
      actor_type: 'super_admin',
      action: 'hospital_admin.created',
      entity_type: 'hospital_admin',
      entity_id: admin.id,
      metadata: { hospital_id: hospitalId, hospital_name: hospital.name, email, role },
    })

    return json({ success: true, admin })
  } catch (err) {
    console.error('create-hospital-admin error:', err)
    return json({ success: false, error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
