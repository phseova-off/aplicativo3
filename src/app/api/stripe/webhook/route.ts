import { NextResponse } from 'next/server'
import { constructStripeEvent } from '@/server/services/stripeService'
import { createSupabaseServiceClient } from '@/server/db/client'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructStripeEvent(body, signature)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const plano = session.metadata?.plano as 'basico' | 'pro'

      if (userId && session.subscription) {
        await supabase.from('assinaturas').upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plano: plano ?? 'basico',
            status: 'ativa',
          },
          { onConflict: 'user_id' }
        )

        await supabase
          .from('profiles')
          .update({ plano: plano ?? 'basico' })
          .eq('id', userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.user_id
      const status = sub.status === 'active' ? 'ativa'
        : sub.status === 'canceled' ? 'cancelada'
        : sub.status === 'past_due' ? 'inadimplente'
        : 'trial'

      if (userId) {
        await supabase
          .from('assinaturas')
          .update({
            status,
            periodo_inicio: new Date(sub.current_period_start * 1000).toISOString(),
            periodo_fim: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', sub.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('assinaturas')
        .update({ status: 'cancelada' })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string
      if (subId) {
        await supabase
          .from('assinaturas')
          .update({ status: 'inadimplente' })
          .eq('stripe_subscription_id', subId)
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string
      if (subId) {
        await supabase
          .from('assinaturas')
          .update({ status: 'ativa' })
          .eq('stripe_subscription_id', subId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
