import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

export const PLANS = {
  // "starter" aligns with the DB enum (PlanoTipo = 'free' | 'starter' | 'pro')
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_PRICE_ID_STARTER ?? process.env.STRIPE_PRICE_ID_BASICO!,
    amount: 4990, // R$49,90 in centavos
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_ID_PRO!,
    amount: 9700, // R$97 in centavos
  },
} as const

export type PlanKey = keyof typeof PLANS

export async function createCheckoutSession({
  userId,
  userEmail,
  planKey,
  successUrl,
  cancelUrl,
}: {
  userId: string
  userEmail: string
  planKey: PlanKey
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const plan = PLANS[planKey]

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: userEmail,
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      plano: planKey,
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        plano: planKey,
      },
    },
    locale: 'pt-BR',
  })

  return session.url!
}

export function constructStripeEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session.url
}
