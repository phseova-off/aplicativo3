'use client'

import { useState, useEffect, useRef } from 'react'
import { Target, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { PlanoGate } from '@/features/planos/components/PlanoGate'
import { useResumoMes } from '../hooks/useFinanceiro'

// ─── Storage helpers (localStorage per mes) ──────────────────

function getMeta(mes: string): number | null {
  try {
    const raw = localStorage.getItem(`meta_receita_${mes}`)
    const v = raw ? parseFloat(raw) : NaN
    return isNaN(v) ? null : v
  } catch {
    return null
  }
}

function setMeta(mes: string, valor: number) {
  try {
    localStorage.setItem(`meta_receita_${mes}`, String(valor))
  } catch { /* noop */ }
}

// ─── Inner component (no gate) ───────────────────────────────

function MetaMensalInner({ mes }: { mes: string }) {
  const { data } = useResumoMes(mes)
  const receitas = data?.receitas ?? 0

  const [meta, setMetaState] = useState<number | null>(null)
  const [editando, setEditando] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Track notification state for this session
  const notified80 = useRef(false)
  const notified100 = useRef(false)

  useEffect(() => {
    setMetaState(getMeta(mes))
    notified80.current = false
    notified100.current = false
  }, [mes])

  useEffect(() => {
    if (!meta || meta <= 0 || !data) return
    const pct = (receitas / meta) * 100

    if (pct >= 100 && !notified100.current) {
      notified100.current = true
      toast.success(`Meta atingida! Você faturou ${formatCurrency(receitas)} este mês.`, {
        duration: 6000,
        icon: '🎉',
      })
    } else if (pct >= 80 && !notified80.current) {
      notified80.current = true
      toast(`Você está a 80% da sua meta! Falta ${formatCurrency(meta - receitas)}.`, {
        icon: '🔥',
        duration: 5000,
      })
    }
  }, [receitas, meta, data])

  function handleSave() {
    const v = parseFloat(inputVal.replace(',', '.'))
    if (isNaN(v) || v <= 0) {
      toast.error('Digite um valor válido')
      return
    }
    setMeta(mes, v)
    setMetaState(v)
    setEditando(false)
    toast.success('Meta atualizada!')
  }

  function handleEdit() {
    setInputVal(meta ? String(meta) : '')
    setEditando(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const pct = meta && meta > 0 ? Math.min((receitas / meta) * 100, 100) : 0
  const corBarra =
    pct >= 100 ? 'bg-green-500' :
    pct >= 80  ? 'bg-amber-400' :
    'bg-primary-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-700">Meta de receita</h3>
        </div>
        {meta && !editando && (
          <button
            onClick={handleEdit}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editando ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="number"
              min="1"
              step="0.01"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ex: 3000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            />
          </div>
          <button
            onClick={handleSave}
            className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditando(false)}
            className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : meta ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatCurrency(receitas)}</span>
            <span>{formatCurrency(meta)}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', corBarra)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={cn(
            'text-xs font-semibold text-center',
            pct >= 100 ? 'text-green-600' :
            pct >= 80  ? 'text-amber-600' :
            'text-gray-500',
          )}>
            {pct >= 100
              ? `Meta atingida! 🎉`
              : `${pct.toFixed(0)}% — faltam ${formatCurrency(meta - receitas)}`}
          </p>
        </div>
      ) : (
        <button
          onClick={handleEdit}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-primary-300 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
        >
          <Target className="w-4 h-4" />
          Definir meta do mês
        </button>
      )}
    </div>
  )
}

// ─── Exported component (wrapped in PlanoGate) ────────────────

export function MetaMensal({ mes }: { mes: string }) {
  return (
    <PlanoGate planoMinimo="starter" feature="meta_mensal">
      <MetaMensalInner mes={mes} />
    </PlanoGate>
  )
}
