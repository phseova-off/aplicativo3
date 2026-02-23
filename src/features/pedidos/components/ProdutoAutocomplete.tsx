'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Package, Search } from 'lucide-react'
import { useDebounce } from '@/shared/lib/hooks/useDebounce'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/lib/utils'

interface ProdutoSugestao {
  id: string
  nome: string
  preco: number
  categoria: string
  descricao: string | null
}

interface ProdutoAutocompleteProps {
  value: string
  onChange: (nome: string, preco?: number, produtoId?: string | null) => void
  error?: string
  placeholder?: string
}

export function ProdutoAutocomplete({
  value,
  onChange,
  error,
  placeholder = 'Nome do produto',
}: ProdutoAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [sugestoes, setSugestoes] = useState<ProdutoSugestao[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 250)
  const containerRef = useRef<HTMLDivElement>(null)

  const buscarProdutos = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/produtos?q=${encodeURIComponent(q)}&limit=8`)
      if (res.ok) setSugestoes(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { buscarProdutos(debouncedQuery) }, [debouncedQuery, buscarProdutos])

  // Sync external value
  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInputChange(val: string) {
    setQuery(val)
    onChange(val, undefined, null)
    setOpen(true)
  }

  function handleSelect(p: ProdutoSugestao) {
    setQuery(p.nome)
    onChange(p.nome, p.preco, p.id)
    setOpen(false)
    setSugestoes([])
  }

  const showDropdown = open && (sugestoes.length > 0 || loading)

  return (
    <div className="relative flex-1" ref={containerRef}>
      <div className="relative">
        <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full h-10 pl-8 pr-3 rounded-lg border text-sm bg-white text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            error ? 'border-red-400 bg-red-50' : 'border-gray-300'
          )}
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 animate-spin" /> Buscando...
            </div>
          ) : (
            sugestoes.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
                className="w-full text-left px-3 py-2 hover:bg-primary-50 border-b last:border-0 border-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.nome}</p>
                  <span className="text-xs font-semibold text-primary-700 whitespace-nowrap">
                    {formatCurrency(p.preco)}
                  </span>
                </div>
                {p.descricao && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{p.descricao}</p>
                )}
              </button>
            ))
          )}
          {!loading && sugestoes.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">
              Digite para buscar ou use um nome personalizado
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
