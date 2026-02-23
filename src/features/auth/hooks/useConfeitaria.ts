'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/server/db/client'
import type { Confeitaria, ConfeitariaMembro, PlanoTipo } from '@/server/db/types'
import { getLimitesPlano, type LimitesPlano } from '@/server/lib/planos'

export interface UseConfeitariaResult {
  confeitaria: Confeitaria | null
  membro: ConfeitariaMembro | null
  plano: PlanoTipo
  limites: LimitesPlano
  /** Percentual de pedidos usados este mês (0–100) */
  pedidosPct: number
  /** Percentual de cronogramas IA usados este mês (0–100) */
  cronogramasPct: number
  loading: boolean
  refresh: () => Promise<void>
}

export function useConfeitaria(): UseConfeitariaResult {
  const [confeitaria, setConfeitaria] = useState<Confeitaria | null>(null)
  const [membro, setMembro] = useState<ConfeitariaMembro | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Fetch membership + confeitaria in one query
    const { data } = await supabase
      .from('confeitaria_membros')
      .select(`
        confeitaria_id,
        user_id,
        role,
        created_at,
        confeitaria:confeitarias (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any
      setConfeitaria(raw.confeitaria as Confeitaria)
      setMembro({
        confeitaria_id: raw.confeitaria_id,
        user_id:        raw.user_id,
        role:           raw.role,
        created_at:     raw.created_at,
      })
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const plano: PlanoTipo = confeitaria?.plano ?? 'free'
  const limites = getLimitesPlano(plano)

  const pedidosMax = limites.pedidos_mes
  const pedidosMes = confeitaria?.pedidos_mes_atual ?? 0
  const pedidosPct = pedidosMax === Infinity ? 0 : Math.min((pedidosMes / pedidosMax) * 100, 100)

  const cronogramasMax = limites.cronogramas_ia
  const cronogramasMes = confeitaria?.cronogramas_ia_mes_atual ?? 0
  const cronogramasPct = cronogramasMax === 0 ? 100 : Math.min((cronogramasMes / cronogramasMax) * 100, 100)

  return {
    confeitaria,
    membro,
    plano,
    limites,
    pedidosPct,
    cronogramasPct,
    loading,
    refresh: fetchData,
  }
}
