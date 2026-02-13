import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Use service role key inside Edge Functions — bypasses RLS for bot operations
export const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  }
)
