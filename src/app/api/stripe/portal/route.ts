import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { createBillingPortalSession } from '@/server/services/stripeService'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // v2: look up stripe_customer_id via confeitaria_membros → confeitarias
  const { data: membro } = await supabase
    .from('confeitaria_membros')
    .select('confeitaria_id, confeitarias(stripe_customer_id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerId = (membro as any)?.confeitarias?.stripe_customer_id as string | null | undefined

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
