'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { PLANO_CONFIG } from '../lib/planFeatures'
import type { PlanoTipo } from '@/server/db/types'

/**
 * Detecta ?upgrade=success na URL após retorno do Stripe Checkout
 * e exibe um toast de boas-vindas ao novo plano.
 *
 * Renderiza null — apenas efeito colateral.
 * Inclua dentro de um <Suspense> pois usa useSearchParams().
 */
export function UpgradeSuccessToast() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('upgrade') !== 'success') return

    // Try to read the plan from the URL (webhook may have already updated it)
    const planoParam = searchParams.get('plano') as PlanoTipo | null
    const planoLabel = planoParam ? PLANO_CONFIG[planoParam]?.label : null
    const msg = planoLabel
      ? `Bem-vinda ao plano ${planoLabel}! 🎉 Seu upgrade foi ativado com sucesso.`
      : 'Upgrade realizado com sucesso! 🎉 Seu novo plano já está ativo.'

    toast.success(msg, {
      duration: 6000,
      style: { maxWidth: 360 },
    })

    // Remove query params without re-render
    router.replace('/dashboard', { scroll: false })
  }, [searchParams, router])

  return null
}
