'use client'

import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useDeleteCronograma } from '../hooks/useMarketing'
import { MESES_PT } from '../types/marketing.types'
import type { CronogramaMarketing } from '@/server/db/types'

interface CronogramaViewerProps {
  cronograma: CronogramaMarketing
}

// Legacy basic post shape (from the old /api/marketing/gerar endpoint)
interface PostLegacy {
  dia: number
  plataforma: string
  tema: string
  legenda: string
  hashtags: string[]
  horario_sugerido: string
}

const plataformaBadge: Record<string, 'purple' | 'success' | 'info'> = {
  Instagram: 'purple',
  WhatsApp: 'success',
  TikTok: 'info',
}

export function CronogramaViewer({ cronograma }: CronogramaViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const { mutate: deleteCronograma, isPending } = useDeleteCronograma()

  const posts = (Array.isArray(cronograma.conteudo) ? cronograma.conteudo : []) as PostLegacy[]
  const nomeMes = MESES_PT[(cronograma.mes ?? 1) - 1] ?? `Mês ${cronograma.mes}`
  const titulo = `${nomeMes} / ${cronograma.ano}`
  const dataGerado = new Date(cronograma.created_at).toLocaleDateString('pt-BR')

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-4">
        <CardHeader className="mb-0">
          <div>
            <CardTitle>{titulo}</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              {posts.length} posts · Gerado em {dataGerado}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((e) => !e)}
              aria-label="Expandir cronograma"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteCronograma(cronograma.id)}
              disabled={isPending}
              aria-label="Excluir cronograma"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        </CardHeader>
      </div>

      {expanded && posts.length > 0 && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {posts.map((post, idx) => {
            const variant = plataformaBadge[post.plataforma] ?? 'info'
            return (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {post.dia}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={variant}>{post.plataforma}</Badge>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {post.horario_sugerido}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-1">{post.tema}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{post.legenda}</p>
                    {post.hashtags.length > 0 && (
                      <p className="text-xs text-primary-600 mt-1">{post.hashtags.join(' ')}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
