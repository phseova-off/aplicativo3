import type { PlanoTipo } from '@/server/db/types'

// ─── Plan configuration ───────────────────────────────────────

export const PLANO_CONFIG = {
  free: {
    label: 'Free',
    preco: null as number | null,
    precoLabel: 'Grátis',
    stripeKey: null as string | null,
    maxPedidosMes: 10,
    cronogramasIAMes: 0,
    relatoriosAvancados: false,
    descricao: 'Para quem está começando',
  },
  starter: {
    label: 'Starter',
    preco: 49.9,
    precoLabel: 'R$49,90/mês',
    stripeKey: 'starter',
    maxPedidosMes: Infinity,
    cronogramasIAMes: 1,
    relatoriosAvancados: false,
    descricao: 'Para confeiteiras em crescimento',
  },
  pro: {
    label: 'Pro',
    preco: 97,
    precoLabel: 'R$97/mês',
    stripeKey: 'pro',
    maxPedidosMes: Infinity,
    cronogramasIAMes: 3,
    relatoriosAvancados: true,
    descricao: 'Para negócios estabelecidos',
  },
} as const

export type PlanoConfig = (typeof PLANO_CONFIG)[PlanoTipo]

export function getPlanoConfig(plano: PlanoTipo): PlanoConfig {
  return PLANO_CONFIG[plano]
}

// ─── Feature checks ───────────────────────────────────────────

/** Returns true if the plan can create more orders this month. */
export function canCreatePedido(plano: PlanoTipo, pedidosMes: number): boolean {
  const cfg = PLANO_CONFIG[plano]
  return cfg.maxPedidosMes === Infinity || pedidosMes < cfg.maxPedidosMes
}

/** Returns true if the plan has access to AI marketing cronogramas. */
export function canUseCronogramaIA(plano: PlanoTipo): boolean {
  return PLANO_CONFIG[plano].cronogramasIAMes > 0
}

/** Returns true if the plan has access to advanced reports. */
export function canUseRelatoriosAvancados(plano: PlanoTipo): boolean {
  return PLANO_CONFIG[plano].relatoriosAvancados
}

// ─── Feature gate metadata for UpgradeModal ──────────────────

export type FeatureGate =
  | 'pedidos_ilimitados'
  | 'cronograma_ia'
  | 'relatorios_avancados'

export const FEATURE_GATE_INFO: Record<
  FeatureGate,
  {
    titulo: string
    descricao: string
    planoMinimo: PlanoTipo
  }
> = {
  pedidos_ilimitados: {
    titulo: 'Pedidos ilimitados',
    descricao:
      'No plano Free você pode criar até 10 pedidos por mês. Faça upgrade para Starter e tenha pedidos ilimitados.',
    planoMinimo: 'starter',
  },
  cronograma_ia: {
    titulo: 'Cronograma de marketing com IA',
    descricao:
      'Gere cronogramas de conteúdo personalizados para Instagram, WhatsApp e TikTok com inteligência artificial.',
    planoMinimo: 'starter',
  },
  relatorios_avancados: {
    titulo: 'Relatórios avançados',
    descricao:
      'Acesse relatórios detalhados de vendas, margens por produto, sazonalidade e projeções de receita.',
    planoMinimo: 'pro',
  },
}
