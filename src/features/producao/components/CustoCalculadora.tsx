'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/utils'
import { Input } from '@/shared/components/ui/Input'
import type { IngredienteValues } from '../schemas/producao.schema'

interface CustoCalculadoraProps {
  ingredientes: IngredienteValues[]
  /** Preço de venda atual (controlado externamente) */
  preco: number
  onPrecoChange: (preco: number) => void
}

export function CustoCalculadora({ ingredientes, preco, onPrecoChange }: CustoCalculadoraProps) {
  const [markup, setMarkup] = useState(2.5)

  const custoCalculado = ingredientes.reduce(
    (sum, ing) => sum + (Number(ing.quantidade) || 0) * (Number(ing.custo_unitario) || 0),
    0
  )
  const precoSugerido = custoCalculado * markup
  const margem = preco > 0 ? ((preco - custoCalculado) / preco) * 100 : 0
  const lucro = preco - custoCalculado

  // When markup changes, suggest a new price
  function applyMarkup() {
    if (custoCalculado > 0) {
      onPrecoChange(parseFloat(precoSugerido.toFixed(2)))
    }
  }

  return (
    <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-100 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-primary-800">Calculadora de Custo</h3>
      </div>

      {/* Cost breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Custo dos ingredientes</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(custoCalculado)}</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Lucro estimado</p>
          <p className={['text-lg font-bold', lucro >= 0 ? 'text-green-600' : 'text-red-600'].join(' ')}>
            {formatCurrency(lucro)}
          </p>
        </div>
      </div>

      {/* Margin bar */}
      {preco > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Margem</span>
            <span className={margem >= 40 ? 'text-green-600 font-bold' : margem >= 20 ? 'text-yellow-600' : 'text-red-600'}>
              {margem.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={[
                'h-2 rounded-full transition-all',
                margem >= 40 ? 'bg-green-500' : margem >= 20 ? 'bg-yellow-500' : 'bg-red-500',
              ].join(' ')}
              style={{ width: `${Math.min(margem, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Markup calculator */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Markup (multiplicador)
          </label>
          <Input
            type="number"
            min="1"
            step="0.1"
            value={markup}
            onChange={(e) => setMarkup(Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applyMarkup}
          className="h-8 px-3 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1 flex-shrink-0"
        >
          <TrendingUp className="w-3 h-3" />
          {formatCurrency(precoSugerido)}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Clique no botão para aplicar o preço sugerido baseado no markup.
      </p>
    </div>
  )
}
