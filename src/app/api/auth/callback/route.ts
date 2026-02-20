import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth error — redirect to login with error message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
