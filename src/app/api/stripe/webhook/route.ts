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

  // service_role bypassa RLS — seguro para webhooks backend
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const plano = (session.metadata?.plano ?? 'starter') as 'starter' | 'pro'

      if (userId) {
        await supabase
          .from('confeiteiros')
          .update({
            plano,
            stripe_customer_id: session.customer as string,
          })
          .eq('id', userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      // Reativa o plano quando assinatura é atualizada/reativada
      if (sub.status === 'active') {
        const plano = (sub.metadata?.plano ?? 'starter') as 'starter' | 'pro'
        await supabase
          .from('confeiteiros')
          .update({ plano })
          .eq('stripe_customer_id', sub.customer as string)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      // Downgrade para free ao cancelar
      await supabase
        .from('confeiteiros')
        .update({ plano: 'free' })
        .eq('stripe_customer_id', sub.customer as string)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      // Downgrade para free após falha de pagamento
      if (invoice.customer) {
        await supabase
          .from('confeiteiros')
          .update({ plano: 'free' })
          .eq('stripe_customer_id', invoice.customer as string)
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      // Reativa plano após pagamento bem-sucedido (ex: após falha anterior)
      if (invoice.customer) {
        const plano = (invoice.lines.data[0]?.metadata?.plano ?? 'starter') as 'starter' | 'pro'
        await supabase
          .from('confeiteiros')
          .update({ plano })
          .eq('stripe_customer_id', invoice.customer as string)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
