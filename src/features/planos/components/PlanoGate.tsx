'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { UpgradeModal } from './UpgradeModal'
import { usePlano } from '../hooks/usePlano'
import type { FeatureGate } from '../lib/planFeatures'
import type { PlanoTipo } from '@/server/db/types'
import { cn } from '@/shared/lib/utils'

const PLAN_ORDER: PlanoTipo[] = ['free', 'starter', 'pro']

interface PlanoGateProps {
  /** Plano mínimo necessário para acessar o conteúdo */
  planoMinimo: Exclude<PlanoTipo, 'free'>
  /** Qual feature gate será mostrada no UpgradeModal */
  feature: FeatureGate
  /** Conteúdo a ser exibido quando o usuário tem acesso */
  children: React.ReactNode
  /**
   * Conteúdo alternativo quando o usuário NÃO tem acesso.
   * Se omitido, exibe children com overlay de bloqueio.
   */
  fallback?: React.ReactNode
}

/**
 * Wrapper que bloqueia acesso a features fora do plano.
 *
 * — Se o plano atual atende ao mínimo: renderiza `children` normalmente.
 * — Caso contrário: renderiza `fallback` (ou children com overlay de cadeado)
 *   e abre o UpgradeModal ao clicar.
 *
 * @example
 * <PlanoGate planoMinimo="starter" feature="cronograma_ia">
 *   <CronogramaButton />
 * </PlanoGate>
 */
export function PlanoGate({ planoMinimo, feature, children, fallback }: PlanoGateProps) {
  const [showModal, setShowModal] = useState(false)
  const { plano, loading } = usePlano()

  // While loading, render children to avoid layout shift
  if (loading) return <>{children}</>

  const hasAccess = PLAN_ORDER.indexOf(plano) >= PLAN_ORDER.indexOf(planoMinimo)

  if (hasAccess) return <>{children}</>

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowModal(true)}
        onKeyDown={(e) => e.key === 'Enter' && setShowModal(true)}
        className="cursor-pointer focus:outline-none"
        aria-label="Recurso disponível apenas em planos superiores"
      >
        {fallback ?? (
          <div className={cn('relative select-none')}>
            {/* Blurred overlay */}
            <div className="pointer-events-none select-none opacity-40 blur-[2px]">
              {children}
            </div>
            {/* Lock badge */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                <Lock className="w-3 h-3" />
                Disponível no plano {planoMinimo === 'starter' ? 'Starter' : 'Pro'}
              </div>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
        planoAtual={plano}
      />
    </>
  )
}
