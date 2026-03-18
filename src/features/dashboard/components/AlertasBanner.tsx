'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  TrendingDown,
  TrendingUp,
  Package,
  Users,
  CreditCard,
  Sun,
  ChevronRight,
  X,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────

type AlertaTipo =
  | 'pedidos_hoje'
  | 'producao_pendente'
  | 'preco_desatualizado'
  | 'cliente_inativo'
  | 'limite_plano'
  | 'comparativo_mensal'
  | 'pico_sazonal'

type AlertaPrioridade = 'alta' | 'media' | 'baixa'

interface Alerta {
  tipo: AlertaTipo
  prioridade: AlertaPrioridade
  titulo: string
  mensagem: string
  acao_url?: string
  acao_label?: string
  meta?: Record<string, unknown>
}

// ─── Config visual por tipo ───────────────────────────────────

const ALERTA_CONFIG: Record<
  AlertaTipo,
  { icon: React.ElementType; gradient: string; iconBg: string; iconColor: string }
> = {
  pedidos_hoje:        { icon: CalendarClock,  gradient: 'from-orange-50 to-amber-50',  iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  producao_pendente:   { icon: Package,        gradient: 'from-red-50 to-rose-50',      iconBg: 'bg-red-100',    iconColor: 'text-red-600' },
  preco_desatualizado: { icon: AlertTriangle,  gradient: 'from-yellow-50 to-amber-50',  iconBg: 'bg-yellow-100', iconColor: 'text-yellow-700' },
  cliente_inativo:     { icon: Users,          gradient: 'from-blue-50 to-sky-50',      iconBg: 'bg-blue-100',   iconColor: 'text-blue-600' },
  limite_plano:        { icon: CreditCard,     gradient: 'from-purple-50 to-fuchsia-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
  comparativo_mensal:  { icon: TrendingUp,     gradient: 'from-emerald-50 to-green-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  pico_sazonal:        { icon: Sun,            gradient: 'from-pink-50 to-rose-50',     iconBg: 'bg-pink-100',   iconColor: 'text-pink-600' },
}

// ─── Prioridade -> borda ──────────────────────────────────────

const PRIORIDADE_BORDER: Record<AlertaPrioridade, string> = {
  alta:  'border-l-red-400',
  media: 'border-l-amber-400',
  baixa: 'border-l-blue-300',
}

// ─── Component ────────────────────────────────────────────────

export function AlertasBanner() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchAlertas() {
      try {
        const res = await fetch('/api/dashboard/alertas')
        const json = await res.json()
        if (json.data) setAlertas(json.data)
      } catch {
        // Silently fail — alertas are non-critical
      } finally {
        setLoading(false)
      }
    }
    fetchAlertas()
  }, [])

  const dismiss = (idx: number) => {
    setDismissed((prev) => new Set(prev).add(String(idx)))
  }

  const visibleAlertas = alertas.filter((_, i) => !dismissed.has(String(i)))

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-16 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (visibleAlertas.length === 0) return null

  // Use comparativo_mensal icon override when negative
  const getIcon = (alerta: Alerta) => {
    if (alerta.tipo === 'comparativo_mensal') {
      const variacao = (alerta.meta?.variacao as number) ?? 0
      return variacao >= 0 ? TrendingUp : TrendingDown
    }
    return ALERTA_CONFIG[alerta.tipo]?.icon ?? AlertTriangle
  }

  return (
    <div className="space-y-2">
      {visibleAlertas.map((alerta, idx) => {
        const config = ALERTA_CONFIG[alerta.tipo] ?? ALERTA_CONFIG.pedidos_hoje
        const Icon = getIcon(alerta)
        const realIdx = alertas.indexOf(alerta)

        return (
          <div
            key={`${alerta.tipo}-${idx}`}
            className={`relative bg-gradient-to-r ${config.gradient} rounded-xl border border-l-4 ${PRIORIDADE_BORDER[alerta.prioridade]} border-gray-200/60 px-4 py-3 flex items-start gap-3 group transition-all duration-200 hover:shadow-sm`}
          >
            {/* Icon */}
            <div className={`shrink-0 w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center mt-0.5`}>
              <Icon className={`w-4 h-4 ${config.iconColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{alerta.titulo}</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{alerta.mensagem}</p>
            </div>

            {/* Action */}
            {alerta.acao_url && (
              <Link
                href={alerta.acao_url}
                className="shrink-0 flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 bg-white/80 hover:bg-white px-3 py-1.5 rounded-lg transition-colors self-center"
              >
                {alerta.acao_label ?? 'Ver'}
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}

            {/* Dismiss */}
            <button
              onClick={() => dismiss(realIdx)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200/50 rounded-md self-start"
              aria-label="Dispensar alerta"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
