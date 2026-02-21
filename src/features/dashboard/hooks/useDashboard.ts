'use client'

import { useQuery } from '@tanstack/react-query'
import type { DashboardMetricas } from '../types/dashboard.types'

async function fetchMetricas(): Promise<DashboardMetricas> {
  const res = await fetch('/api/dashboard/metricas')
  if (!res.ok) throw new Error('Erro ao carregar métricas')
  return res.json()
}

export function useDashboardMetricas() {
  return useQuery({
    queryKey: ['dashboard_metricas'],
    queryFn: fetchMetricas,
    staleTime: 5 * 60 * 1000,   // 5 minutes — matches server revalidate
  })
}
