import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Browser client (Client Components) ───────────────────────
// Note: <Database> generic causes 'never' type inference with Supabase v2.97+.
// Using untyped client; query results are cast at call sites when needed.
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// ── Server client (Server Components, Route Handlers, Actions) ─
// Dynamic import keeps this module safe to bundle alongside Client Components.
export async function createSupabaseServerClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method is called from Server Components where cookies
          // cannot be set. This is safe to ignore if middleware refreshes sessions.
        }
      },
    },
  })
}

// ── Service role client (Stripe webhooks only) ────────────────
// NEVER use in regular API routes — bypasses RLS.
export function createSupabaseServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
