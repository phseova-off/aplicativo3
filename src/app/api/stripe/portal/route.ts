import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { createBillingPortalSession } from '@/server/services/stripeService'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('confeiteiros')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const customerId = (perfil as unknown as { stripe_customer_id: string | null })?.stripe_customer_id

  if (!customerId) {
    return NextResponse.json(
      { error: 'Nenhuma assinatura ativa encontrada.' },
      { status: 400 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = await createBillingPortalSession(customerId, `${appUrl}/configuracoes/plano`)

  return NextResponse.json({ url })
}
