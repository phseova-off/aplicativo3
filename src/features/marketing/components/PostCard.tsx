'use client'

import { useState } from 'react'
import { Copy, Check, Clock, Clapperboard, MessageSquare, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { MarketingPostRico } from '../types/marketing.types'
import { FORMATO_COLORS, PLATAFORMA_COLORS } from '../types/marketing.types'

interface PostCardProps {
  post: MarketingPostRico
  isSpecial?: boolean
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      title={`Copiar ${label}`}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors px-2 py-1 rounded hover:bg-primary-50"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado!' : label}
    </button>
  )
}

export function PostCard({ post, isSpecial = false }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)

  const formatoStyle = FORMATO_COLORS[post.formato] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  const plataformaStyle = PLATAFORMA_COLORS[post.plataforma] ?? 'bg-gray-100 text-gray-700'

  const hashtagsText = post.hashtags.join(' ')
  const legendaComCta = `${post.legenda}\n\n${post.cta}`

  return (
    <div
      className={cn(
        'rounded-xl border bg-white transition-shadow hover:shadow-sm',
        isSpecial ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'
      )}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Day badge */}
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 text-xs font-bold',
            isSpecial ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600'
          )}
        >
          <span className="text-base leading-none">{post.dia}</span>
        </div>

        <div className="flex-1 min-w-0">
          {post.data_comemorativa && (
            <p className="text-xs font-semibold text-amber-600 mb-0.5">
              🎉 {post.data_comemorativa}
            </p>
          )}
          <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{post.tema}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', formatoStyle)}>
              {post.formato}
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', plataformaStyle)}>
              {post.plataforma}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {post.horario_sugerido}
            </span>
          </div>
        </div>

        <button className="shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {/* Ideia visual */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Clapperboard className="w-3.5 h-3.5" /> Ideia visual
              </span>
            </div>
            <p className="text-sm text-gray-700 italic">"{post.ideia_visual}"</p>
          </div>

          {/* Legenda */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Legenda
              </span>
              <CopyButton text={legendaComCta} label="Copiar legenda" />
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{post.legenda}</p>
            <p className="text-sm font-semibold text-primary-600 mt-2">{post.cta}</p>
          </div>

          {/* Hashtags */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Hashtags
              </span>
              <CopyButton text={hashtagsText} label="Copiar hashtags" />
            </div>
            <p className="text-xs text-primary-600 leading-relaxed">{hashtagsText}</p>
          </div>
        </div>
      )}
    </div>
  )
}
