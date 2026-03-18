'use client'

import { useEffect, useState } from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface InsightData {
  texto: string
  acao_sugerida: string | null
  acao_url: string | null
  gerado_por: 'ia' | 'fallback'
}

interface Props {
  /** Texto estático (fallback para SSR, substituído pelo fetch client-side) */
  sugestao?: string
}

export function SugestaoIA({ sugestao }: Props) {
  const [insight, setInsight] = useState<InsightData | null>(
    sugestao ? { texto: sugestao, acao_sugerida: null, acao_url: null, gerado_por: 'fallback' } : null
  )
  const [loading, setLoading] = useState(!sugestao)

  useEffect(() => {
    async function fetchInsight() {
      try {
        const res = await fetch('/api/dashboard/insight')
        const json = await res.json()
        if (json.data) {
          setInsight(json.data)
        }
      } catch {
        // Keep the SSR fallback
      } finally {
        setLoading(false)
      }
    }
    // Fetch the cached insight (may come from IA or fallback)
    fetchInsight()
  }, [])

  if (loading && !insight) {
    return (
      <div className="bg-gradient-to-r from-primary-50 via-primary-50 to-purple-50 rounded-xl border border-primary-200 px-5 py-4 animate-pulse">
        <div className="flex gap-3">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-primary-100 rounded w-24" />
            <div className="h-3 bg-primary-100/60 rounded w-full" />
            <div className="h-3 bg-primary-100/40 rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (!insight) return null

  return (
    <div className="bg-gradient-to-r from-primary-50 via-primary-50 to-purple-50 rounded-xl border border-primary-200 px-5 py-4">
      <div className="flex gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center mt-0.5">
          <Sparkles className="w-4 h-4 text-primary-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-primary-700">
              Sugestão do dia • {insight.gerado_por === 'ia' ? 'IA' : 'Doceria Pro'}
            </p>
            {insight.gerado_por === 'ia' && (
              <span className="text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full font-medium">
                ✨ Personalizada
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{insight.texto}</p>

          {/* Ação sugerida */}
          {insight.acao_sugerida && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <p className="text-xs text-gray-500 italic">{insight.acao_sugerida}</p>
              {insight.acao_url && (
                <Link
                  href={insight.acao_url}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md transition-colors"
                >
                  Ir agora
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
