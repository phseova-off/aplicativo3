'use client'

import { useState } from 'react'
import { Sparkles, Check, ArrowRight } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { PLANO_CONFIG, FEATURE_GATE_INFO, type FeatureGate } from '../lib/planFeatures'
import type { PlanoTipo } from '@/server/db/types'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature: FeatureGate
  planoAtual: PlanoTipo
}

const UPGRADE_PLANS: PlanoTipo[] = ['starter', 'pro']

export function UpgradeModal({ isOpen, onClose, feature, planoAtual }: UpgradeModalProps) {
  const [loading, setLoading] = useState<PlanoTipo | null>(null)
  const gateInfo = FEATURE_GATE_INFO[feature]

  async function handleUpgrade(plano: PlanoTipo) {
    setLoading(plano)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: plano }),
      })

      if (!res.ok) throw new Error('checkout_failed')
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setLoading(null)
      // show generic error — toast is not available here without extra setup
      alert('Erro ao criar sessão de pagamento. Tente novamente.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="md">
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{gateInfo.titulo}</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{gateInfo.descricao}</p>
        </div>

        {/* Plan cards */}
        <div className="space-y-3">
          {UPGRADE_PLANS.map((planoKey) => {
            const cfg = PLANO_CONFIG[planoKey]
            const isRecomendado = planoKey === gateInfo.planoMinimo
            const jaTem = planoAtual === planoKey

            return (
              <div
                key={planoKey}
                className={`rounded-xl border-2 p-4 ${
                  isRecomendado
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{cfg.label}</span>
                      {isRecomendado && (
                        <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-primary-700">{cfg.precoLabel}</p>
                  </div>
                  {jaTem ? (
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-lg">
                      Plano atual
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={isRecomendado ? 'primary' : 'outline'}
                      loading={loading === planoKey}
                      onClick={() => handleUpgrade(planoKey)}
                      rightIcon={<ArrowRight className="w-3 h-3" />}
                    >
                      Assinar
                    </Button>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-1">
                  {[
                    cfg.maxPedidosMes === Infinity ? 'Pedidos ilimitados' : `Até ${cfg.maxPedidosMes} pedidos/mês`,
                    cfg.cronogramasIAMes > 0
                      ? `${cfg.cronogramasIAMes} cronograma${cfg.cronogramasIAMes > 1 ? 's' : ''} de IA/mês`
                      : null,
                    cfg.relatoriosAvancados ? 'Relatórios avançados' : null,
                    'Suporte prioritário',
                  ]
                    .filter(Boolean)
                    .map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Check className="w-3 h-3 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                </ul>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Continuar com plano {PLANO_CONFIG[planoAtual].label}
        </button>
      </div>
    </Modal>
  )
}
