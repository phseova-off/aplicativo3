// ============================================================
// Doceria Pro — Limites e Feature Flags por Plano (server-side)
//
// Este módulo é usado em Route Handlers e Server Actions para
// enforce de limites ANTES de consumir recursos (DB, OpenAI, etc).
//
// Para lógica de UI/cliente, use src/features/planos/lib/planFeatures.ts
// ============================================================

import type { PlanoTipo } from '@/server/db/types'
import { AppError } from '@/server/middleware/errorHandler'

// ─── Mapa de limites ──────────────────────────────────────────

export interface LimitesPlano {
  /** Máximo de pedidos criados por mês calendário. Infinity = ilimitado */
  pedidos_mes: number
  /** Máximo de cronogramas de marketing IA por mês */
  cronogramas_ia: number
  /** Acesso a relatórios avançados */
  relatorios_avancados: boolean
  /** Acesso a exportação CSV/XLSX */
  exportacao_dados: boolean
  /** Máximo de produtos cadastrados. Infinity = ilimitado */
  produtos_max: number
  /** Webhooks de integração habilitados */
  webhooks: boolean
}

export const LIMITES_PLANO: Record<PlanoTipo, LimitesPlano> = {
  free: {
    pedidos_mes:          10,
    cronogramas_ia:        0,
    relatorios_avancados: false,
    exportacao_dados:     false,
    produtos_max:         20,
    webhooks:             false,
  },
  starter: {
    pedidos_mes:          Infinity,
    cronogramas_ia:        1,
    relatorios_avancados: false,
    exportacao_dados:     true,
    produtos_max:         Infinity,
    webhooks:             false,
  },
  pro: {
    pedidos_mes:          Infinity,
    cronogramas_ia:        3,
    relatorios_avancados: true,
    exportacao_dados:     true,
    produtos_max:         Infinity,
    webhooks:             true,
  },
} as const

// ─── Getters seguros ──────────────────────────────────────────

export function getLimitesPlano(plano: PlanoTipo): LimitesPlano {
  return LIMITES_PLANO[plano]
}

// ─── Checks individuais ───────────────────────────────────────

/**
 * Verifica se o plano permite criar mais pedidos no mês.
 *
 * @param plano       - Plano atual do usuário
 * @param pedidosMes  - Quantidade de pedidos já criados no mês corrente
 */
export function podeCriarPedido(plano: PlanoTipo, pedidosMes: number): boolean {
  const limite = LIMITES_PLANO[plano].pedidos_mes
  return limite === Infinity || pedidosMes < limite
}

/**
 * Verifica se o plano pode gerar mais cronogramas de IA no mês.
 *
 * @param plano         - Plano atual
 * @param cronogramasMes - Cronogramas já gerados no mês
 */
export function podeCronogramaIA(plano: PlanoTipo, cronogramasMes: number): boolean {
  const limite = LIMITES_PLANO[plano].cronogramas_ia
  return cronogramasMes < limite
}

export function podeRelatoriosAvancados(plano: PlanoTipo): boolean {
  return LIMITES_PLANO[plano].relatorios_avancados
}

export function podeExportarDados(plano: PlanoTipo): boolean {
  return LIMITES_PLANO[plano].exportacao_dados
}

export function podeCadastrarProduto(plano: PlanoTipo, totalProdutos: number): boolean {
  const limite = LIMITES_PLANO[plano].produtos_max
  return limite === Infinity || totalProdutos < limite
}

// ─── Assertions (lançam AppError) ────────────────────────────
// Use em Route Handlers para bloquear a request antes de processar.

/**
 * @throws AppError PLAN_LIMIT_EXCEEDED se o plano não permite mais pedidos
 */
export function assertPodeCriarPedido(plano: PlanoTipo, pedidosMes: number): void {
  if (!podeCriarPedido(plano, pedidosMes)) {
    throw AppError.planLimit(
      `pedidos_mes (limite: ${LIMITES_PLANO[plano].pedidos_mes}, atual: ${pedidosMes})`
    )
  }
}

/**
 * @throws AppError PLAN_LIMIT_EXCEEDED se o plano não permite mais cronogramas IA
 */
export function assertPodeCronogramaIA(plano: PlanoTipo, cronogramasMes: number): void {
  if (!podeCronogramaIA(plano, cronogramasMes)) {
    throw AppError.planLimit(
      `cronogramas_ia (limite: ${LIMITES_PLANO[plano].cronogramas_ia}/mês)`
    )
  }
}

/**
 * @throws AppError FORBIDDEN se o plano não tem relatórios avançados
 */
export function assertPodeRelatoriosAvancados(plano: PlanoTipo): void {
  if (!podeRelatoriosAvancados(plano)) {
    throw AppError.planLimit('relatorios_avancados (requer plano Pro)')
  }
}

/**
 * @throws AppError PLAN_LIMIT_EXCEEDED se o plano atingiu o limite de produtos
 */
export function assertPodeCadastrarProduto(plano: PlanoTipo, totalProdutos: number): void {
  if (!podeCadastrarProduto(plano, totalProdutos)) {
    throw AppError.planLimit(
      `produtos_max (limite: ${LIMITES_PLANO[plano].produtos_max}, atual: ${totalProdutos})`
    )
  }
}

// ─── Utilitários ──────────────────────────────────────────────

/**
 * Retorna o plano mínimo que suporta uma determinada feature.
 * Útil para exibir mensagens de upgrade no UpgradeModal.
 */
export function planoMinimoParaFeature(
  feature: keyof LimitesPlano
): PlanoTipo {
  const ordem: PlanoTipo[] = ['free', 'starter', 'pro']
  for (const plano of ordem) {
    const val = LIMITES_PLANO[plano][feature]
    if (val === true || (typeof val === 'number' && val > 0 && val !== Infinity) || val === Infinity) {
      return plano
    }
  }
  return 'pro'
}
