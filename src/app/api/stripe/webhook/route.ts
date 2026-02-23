import { NextResponse } from 'next/server'
import { constructStripeEvent } from '@/server/services/stripeService'
import { createSupabaseServiceClient } from '@/server/db/client'
import { assertRateLimit, RATE_CONFIGS } from '@/server/middleware/rateLimit'
import { handleApiError } from '@/server/middleware/errorHandler'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  const ip = request.headers.get('x-forwarded-for') ?? 'stripe'

  // Rate limit before signature verification
  try {
    await assertRateLimit(`stripe-webhook:${ip}`, RATE_CONFIGS.stripeWebhook)
  } catch (err) {
    const { status, ...body } = handleApiError(err, 'stripe-webhook-rate-limit')
    return NextResponse.json(body, { status })
  }

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

  // ── Idempotency: skip already-processed events ────────────────────────────
  const { data: existing } = await supabase
    .from('stripe_events_processados')
    .select('stripe_event_id')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ received: true, skipped: true })
  }

  // ── Process event ─────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const plano = (session.metadata?.plano ?? 'starter') as 'starter' | 'pro'
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string | null

        if (userId) {
          // Update both tables in parallel — confeitarias is the v2 source of truth
          await Promise.all([
            supabase
              .from('confeitarias')
              .update({
                plano,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
              })
              .eq('id', userId),
            supabase
              .from('confeiteiros')
              .update({ plano, stripe_customer_id: customerId })
              .eq('id', userId),
          ])
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        if (sub.status === 'active') {
          const plano = (sub.metadata?.plano ?? 'starter') as 'starter' | 'pro'
          await Promise.all([
            supabase
              .from('confeitarias')
              .update({ plano, stripe_subscription_id: sub.id })
              .eq('stripe_customer_id', sub.customer as string),
            supabase
              .from('confeiteiros')
              .update({ plano })
              .eq('stripe_customer_id', sub.customer as string),
          ])
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await Promise.all([
          supabase
            .from('confeitarias')
            .update({ plano: 'free', stripe_subscription_id: null })
            .eq('stripe_customer_id', sub.customer as string),
          supabase
            .from('confeiteiros')
            .update({ plano: 'free' })
            .eq('stripe_customer_id', sub.customer as string),
        ])
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.customer) {
          await Promise.all([
            supabase
              .from('confeitarias')
              .update({ plano: 'free' })
              .eq('stripe_customer_id', invoice.customer as string),
            supabase
              .from('confeiteiros')
              .update({ plano: 'free' })
              .eq('stripe_customer_id', invoice.customer as string),
          ])
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.customer) {
          const plano = (invoice.lines.data[0]?.metadata?.plano ?? 'starter') as 'starter' | 'pro'
          await Promise.all([
            supabase
              .from('confeitarias')
              .update({ plano })
              .eq('stripe_customer_id', invoice.customer as string),
            supabase
              .from('confeiteiros')
              .update({ plano })
              .eq('stripe_customer_id', invoice.customer as string),
          ])
        }
        break
      }
    }
  } catch (err) {
    // Log processing error but don't mark event as processed so Stripe retries
    console.error('[webhook] processing error', { eventId: event.id, type: event.type, err })
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }

  // ── Mark event as processed (idempotency record) ──────────────────────────
  await supabase.from('stripe_events_processados').insert({
    stripe_event_id: event.id,
    tipo: event.type,
    payload_resumo: {
      livemode: event.livemode,
      created: event.created,
    },
  })

  return NextResponse.json({ received: true })
}
