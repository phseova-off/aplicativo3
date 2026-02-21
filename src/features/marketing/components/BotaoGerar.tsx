'use client'

import { Sparkles, Coins } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'

interface BotaoGerarProps {
  onClick: () => void
  loading: boolean
  postCount: number    // estimated number of posts to generate
  disabled?: boolean
}

// gpt-4o-mini: ~$0.00015 / 1k input tokens, ~$0.0006 / 1k output tokens
// Avg prompt: ~800 tokens in, ~1800 tokens out per post
function estimateCost(postCount: number): string {
  const inputTokens  = 800 + postCount * 200
  const outputTokens = postCount * 450
  const cost = (inputTokens / 1000) * 0.00015 + (outputTokens / 1000) * 0.0006
  return cost < 0.01 ? '< R$ 0,05' : `~ R$ ${(cost * 5.5).toFixed(2)}`
}

export function BotaoGerar({ onClick, loading, postCount, disabled }: BotaoGerarProps) {
  const estimativa = estimateCost(postCount)

  return (
    <div className="space-y-2">
      <Button
        onClick={onClick}
        loading={loading}
        disabled={disabled || loading}
        className="w-full"
        size="lg"
        leftIcon={<Sparkles className="w-5 h-5" />}
      >
        {loading ? 'Gerando com IA…' : 'Gerar Cronograma com IA'}
      </Button>

      {!loading && (
        <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
          <Coins className="w-3.5 h-3.5" />
          <span>
            ~{postCount} posts · custo estimado {estimativa} · modelo gpt-4o-mini
          </span>
        </div>
      )}

      {loading && (
        <p className="text-xs text-center text-gray-400 animate-pulse">
          Criando conteúdo personalizado… pode levar alguns segundos.
        </p>
      )}
    </div>
  )
}
