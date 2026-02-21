'use client'

import { useConfeiteiro } from '@/features/auth/hooks/useConfeiteiro'
import { getPlanoConfig, canCreatePedido, canUseCronogramaIA, canUseRelatoriosAvancados } from '../lib/planFeatures'
import type { PlanoConfig } from '../lib/planFeatures'
import type { PlanoTipo } from '@/server/db/types'

interface UsePlanoResult {
  plano: PlanoTipo
  config: PlanoConfig
  loading: boolean
  // feature checks
  podeCriarPedido: (pedidosMes: number) => boolean
  podeCronogramaIA: boolean
  podeRelatoriosAvancados: boolean
}

export function usePlano(): UsePlanoResult {
  const { confeiteiro, loading } = useConfeiteiro()
  const plano: PlanoTipo = confeiteiro?.plano ?? 'free'
  const config = getPlanoConfig(plano)

  return {
    plano,
    config,
    loading,
    podeCriarPedido: (pedidosMes: number) => canCreatePedido(plano, pedidosMes),
    podeCronogramaIA: canUseCronogramaIA(plano),
    podeRelatoriosAvancados: canUseRelatoriosAvancados(plano),
  }
}
