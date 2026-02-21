'use client'

import { Star, Calendar } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DataComemorativaBr } from '../types/marketing.types'

interface DatePickerDatasProps {
  datasDisponiveis: DataComemorativaBr[]
  selecionadas: DataComemorativaBr[]
  onToggle: (data: DataComemorativaBr) => void
}

const relevanciaConfig = {
  alta:  { label: '★★★', cls: 'text-amber-500' },
  media: { label: '★★',  cls: 'text-amber-400' },
  baixa: { label: '★',   cls: 'text-gray-300'  },
}

function formatDate(iso: string): string {
  const [, , day] = iso.split('-')
  return `Dia ${parseInt(day, 10)}`
}

export function DatePickerDatas({ datasDisponiveis, selecionadas, onToggle }: DatePickerDatasProps) {
  const isSelecionada = (d: DataComemorativaBr) =>
    selecionadas.some((s) => s.data === d.data)

  if (datasDisponiveis.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-3 px-4 bg-gray-50 rounded-lg">
        <Calendar className="w-4 h-4 shrink-0" />
        <span>Nenhuma data comemorativa neste mês.</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {datasDisponiveis.map((d) => {
        const checked = isSelecionada(d)
        const rel = relevanciaConfig[d.relevancia]
        return (
          <label
            key={d.data}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none',
              checked
                ? 'bg-primary-50 border-primary-300'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(d)}
              className="w-4 h-4 accent-primary-600 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', checked ? 'text-primary-800' : 'text-gray-800')}>
                {d.nome}
              </p>
              <p className="text-xs text-gray-500">{formatDate(d.data)}</p>
            </div>
            <span className={cn('text-xs shrink-0', rel.cls)} title={`Relevância: ${d.relevancia}`}>
              <Star className="w-3.5 h-3.5 inline" />
              {d.relevancia}
            </span>
          </label>
        )
      })}
      {selecionadas.length > 0 && (
        <p className="text-xs text-primary-600 font-medium pt-1">
          {selecionadas.length} {selecionadas.length === 1 ? 'data selecionada' : 'datas selecionadas'} — posts especiais serão gerados para cada uma.
        </p>
      )}
    </div>
  )
}
