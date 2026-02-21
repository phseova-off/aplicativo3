import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Public paths that never require authentication ───────────
const PUBLIC_PREFIXES = [
  '/login',
  '/cadastro',
  '/esqueci-senha',
  '/api/auth',
  '/api/stripe/webhook', // Stripe webhooks don't have session
]

function isPublic(pathname: string) {
  return (
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname === '/'
  )
}

export async function middleware(request: NextRequest) {
  // This pattern (mutate supabaseResponse) is required by @supabase/ssr
  // to propagate refreshed session cookies correctly.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Apply cookies to both request and response so the session is
          // readable by Server Components further down the chain.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  // IMPORTANT: always call getUser() — never getSession().
  // This validates the JWT with the Supabase server on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Not authenticated → /login ─────────────────────────────
  if (!user && !isPublic(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // ── Authenticated + hits auth pages → /dashboard ──────────
  if (user && (pathname === '/login' || pathname === '/cadastro')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Authenticated without onboarding → /onboarding ────────
  // (only block dashboard routes, not the onboarding itself)
  if (
    user &&
    !pathname.startsWith('/onboarding') &&
    !isPublic(pathname) &&
    !pathname.startsWith('/api/')
  ) {
    // Fetch onboarding flag — only once per request, lightweight query
    const { data: profile } = await supabase
      .from('confeiteiros')
      .select('onboarding_completo')
      .eq('id', user.id)
      .single()

    if (profile && !profile.onboarding_completo) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     * - Files with extensions (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
}
