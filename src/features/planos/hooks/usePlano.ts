'use client'

import { useCallback } from 'react'
import { useConfeitaria } from '@/features/auth/hooks/useConfeitaria'
import {
  getPlanoConfig,
  canCreatePedido,
  canUseCronogramaIA,
  canUseRelatoriosAvancados,
  type PlanoConfig,
} from '../lib/planFeatures'
import type { PlanoTipo } from '@/server/db/types'

interface UsePlanoResult {
  plano: PlanoTipo
  config: PlanoConfig
  loading: boolean
  // usage counters (from confeitaria row)
  pedidosMes: number
  cronogramasMes: number
  // feature checks
  podeCriarPedido: (pedidosMes: number) => boolean
  podeCronogramaIA: boolean
  podeRelatoriosAvancados: boolean
  // actions
  handleUpgrade: (planKey: 'starter' | 'pro') => Promise<void>
}

export function usePlano(): UsePlanoResult {
  const { confeitaria, plano, loading } = useConfeitaria()
  const config = getPlanoConfig(plano)

  const pedidosMes   = confeitaria?.pedidos_mes_atual       ?? 0
  const cronogramasMes = confeitaria?.cronogramas_ia_mes_atual ?? 0

  const handleUpgrade = useCallback(async (planKey: 'starter' | 'pro') => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planKey }),
    })
    if (!res.ok) throw new Error('checkout_failed')
    const { url } = await res.json()
    window.location.href = url
  }, [])

  return {
    plano,
    config,
    loading,
    pedidosMes,
    cronogramasMes,
    podeCriarPedido: (pedidos: number) => canCreatePedido(plano, pedidos),
    podeCronogramaIA: canUseCronogramaIA(plano),
    podeRelatoriosAvancados: canUseRelatoriosAvancados(plano),
    handleUpgrade,
  }
}
