'use client'

import { useState } from 'react'
import { Check, ExternalLink, Sparkles, Zap, Crown } from 'lucide-react'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { usePlano } from '@/features/planos/hooks/usePlano'
import { PLANO_CONFIG } from '@/features/planos/lib/planFeatures'
import { useConfeiteiro } from '@/features/auth/hooks/useConfeiteiro'
import { formatCurrency } from '@/shared/lib/utils'
import type { PlanoTipo } from '@/server/db/types'

// ─── Usage stats ──────────────────────────────────────────────

function UsageBar({ label, used, max }: { label: string; used: number; max: number | null }) {
  const pct = max === null ? 0 : Math.min((used / max) * 100, 100)
  const unlimited = max === null
  const warning = !unlimited && pct >= 80

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className={`font-medium ${warning ? 'text-amber-600' : 'text-gray-900'}`}>
          {unlimited ? `${used} / ∞` : `${used} / ${max}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-primary-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {unlimited && (
        <p className="text-xs text-green-600 font-medium">Ilimitado no seu plano</p>
      )}
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────

const PLAN_ICONS: Record<PlanoTipo, typeof Sparkles> = {
  free:    Sparkles,
  starter: Zap,
  pro:     Crown,
}

const PLAN_COLORS: Record<PlanoTipo, { badge: 'default' | 'info' | 'purple'; ring: string; icon: string }> = {
  free:    { badge: 'default', ring: 'ring-gray-200',   icon: 'text-gray-500'  },
  starter: { badge: 'info',    ring: 'ring-primary-300', icon: 'text-primary-600' },
  pro:     { badge: 'purple',  ring: 'ring-purple-300',  icon: 'text-purple-600' },
}

const PLAN_FEATURES: Record<PlanoTipo, string[]> = {
  free: [
    'Até 10 pedidos/mês',
    'Gestão de produtos e cardápio',
    'Controle de produção e lotes',
    'Financeiro básico',
  ],
  starter: [
    'Tudo do Free',
    'Pedidos ilimitados',
    '1 cronograma de IA por mês',
    'Suporte prioritário via e-mail',
  ],
  pro: [
    'Tudo do Starter',
    '3 cronogramas de IA por mês',
    'Relatórios avançados',
    'Dashboard de métricas exclusivo',
    'Suporte prioritário via WhatsApp',
  ],
}

interface PlanCardProps {
  planoKey: PlanoTipo
  planoAtual: PlanoTipo
  onUpgrade: (plano: PlanoTipo) => void
  loading: boolean
}

function PlanCard({ planoKey, planoAtual, onUpgrade, loading }: PlanCardProps) {
  const cfg = PLANO_CONFIG[planoKey]
  const isAtual = planoKey === planoAtual
  const colors = PLAN_COLORS[planoKey]
  const Icon = PLAN_ICONS[planoKey]
  const canUpgrade = planoKey !== 'free' && !isAtual
  const isDowngrade =
    (planoAtual === 'pro' && planoKey === 'starter') ||
    (planoAtual !== 'free' && planoKey === 'free')

  return (
    <div
      className={`rounded-xl border-2 p-5 transition-all ${
        isAtual
          ? `ring-2 ${colors.ring} border-transparent`
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-gray-50`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{cfg.label}</span>
              {isAtual && <Badge variant={colors.badge}>Plano atual</Badge>}
            </div>
            <p className="text-sm font-semibold text-primary-700 mt-0.5">{cfg.precoLabel}</p>
          </div>
        </div>
      </div>

      <ul className="space-y-2 mb-5">
        {PLAN_FEATURES[planoKey].map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-green-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {canUpgrade ? (
        <Button
          className="w-full"
          variant="primary"
          onClick={() => onUpgrade(planoKey)}
          loading={loading}
        >
          Assinar {cfg.label}
        </Button>
      ) : isDowngrade ? (
        <p className="text-xs text-gray-400 text-center">
          Para fazer downgrade, acesse o{' '}
          <button
            className="underline text-primary-600"
            onClick={() => onUpgrade('portal' as PlanoTipo)}
          >
            portal de faturamento
          </button>
          .
        </p>
      ) : isAtual && planoKey !== 'free' ? (
        <Button variant="outline" className="w-full" onClick={() => onUpgrade('portal' as PlanoTipo)}>
          <ExternalLink className="w-4 h-4" />
          Gerenciar assinatura
        </Button>
      ) : null}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function PlanoPage() {
  const { plano, config, loading: planoLoading } = usePlano()
  const { confeiteiro } = useConfeiteiro()
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)

  // Mock usage — in production fetch from API
  const pedidosMes = 0

  async function handleUpgrade(planoKey: PlanoTipo | 'portal') {
    setUpgradeLoading(planoKey)

    if (planoKey === 'portal') {
      // Redirect to Stripe billing portal
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      }
      setUpgradeLoading(null)
      return
    }

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planKey: planoKey }),
    })

    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      setUpgradeLoading(null)
      alert('Erro ao criar sessão de pagamento. Tente novamente.')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plano e faturamento</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie sua assinatura e veja o uso do seu plano atual.
        </p>
      </div>

      {/* Current usage */}
      <Card>
        <CardHeader>
          <CardTitle>Uso do mês atual</CardTitle>
          <Badge variant={PLAN_COLORS[plano].badge}>{config.label}</Badge>
        </CardHeader>
        <div className="space-y-4">
          <UsageBar
            label="Pedidos criados"
            used={pedidosMes}
            max={config.maxPedidosMes === Infinity ? null : config.maxPedidosMes}
          />
          <UsageBar
            label="Cronogramas de IA"
            used={0}
            max={config.cronogramasIAMes === 0 ? 0 : config.cronogramasIAMes}
          />
        </div>
      </Card>

      {/* All plans */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Todos os planos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['free', 'starter', 'pro'] as PlanoTipo[]).map((p) => (
            <PlanCard
              key={p}
              planoKey={p}
              planoAtual={plano}
              onUpgrade={handleUpgrade}
              loading={upgradeLoading === p}
            />
          ))}
        </div>
      </div>

      {/* Billing info */}
      {plano !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle>Faturamento</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-700">
                Próxima cobrança: <strong>{formatCurrency(config.preco ?? 0)}</strong>
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                Para ver faturas e histórico, acesse o portal de faturamento.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpgrade('portal')}
              loading={upgradeLoading === 'portal'}
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Portal de faturamento
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
