import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/server/db/client'
import { createCheckoutSession, type PlanKey } from '@/server/services/stripeService'

const checkoutSchema = z.object({
  planKey: z.enum(['basico', 'pro']),
})

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = checkoutSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 422 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const url = await createCheckoutSession({
    userId: user.id,
    userEmail: user.email!,
    planKey: parsed.data.planKey as PlanKey,
    successUrl: `${appUrl}/dashboard?checkout=success`,
    cancelUrl: `${appUrl}/dashboard?checkout=cancelled`,
  })

  return NextResponse.json({ url })
}
