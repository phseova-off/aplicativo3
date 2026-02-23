'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, User, X } from 'lucide-react'
import { useDebounce } from '@/shared/lib/hooks/useDebounce'
import { cn } from '@/shared/lib/utils'

interface ClienteSugestao {
  nome: string
  telefone: string | null
}

interface ClienteAutocompleteProps {
  nomeValue: string
  telefoneValue: string
  onNomeChange: (nome: string) => void
  onTelefoneChange: (telefone: string) => void
  nomeError?: string
  telefoneError?: string
}

export function ClienteAutocomplete({
  nomeValue,
  telefoneValue,
  onNomeChange,
  onTelefoneChange,
  nomeError,
  telefoneError,
}: ClienteAutocompleteProps) {
  const [query, setQuery] = useState(nomeValue)
  const [sugestoes, setSugestoes] = useState<ClienteSugestao[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 250)
  const containerRef = useRef<HTMLDivElement>(null)

  const buscarClientes = useCallback(async (q: string) => {
    if (q.length < 2) { setSugestoes([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/clientes/buscar?q=${encodeURIComponent(q)}`)
      if (res.ok) setSugestoes(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { buscarClientes(debouncedQuery) }, [debouncedQuery, buscarClientes])

  // Sync external value → local query when parent resets
  useEffect(() => { setQuery(nomeValue) }, [nomeValue])

  // Close dropdown on outside click
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
    onNomeChange(val)
    setOpen(true)
  }

  function handleSelect(s: ClienteSugestao) {
    setQuery(s.nome)
    onNomeChange(s.nome)
    if (s.telefone) onTelefoneChange(s.telefone)
    setOpen(false)
    setSugestoes([])
  }

  function handleClear() {
    setQuery('')
    onNomeChange('')
    onTelefoneChange('')
    setSugestoes([])
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Nome do cliente com autocomplete */}
      <div className="flex flex-col gap-1.5" ref={containerRef}>
        <label className="text-sm font-medium text-gray-700">
          Nome do cliente <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="relative flex items-center">
            <User className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => query.length >= 2 && setOpen(true)}
              placeholder="Maria Silva"
              className={cn(
                'w-full h-10 pl-9 pr-8 rounded-lg border text-sm bg-white text-gray-900 placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                nomeError ? 'border-red-400 bg-red-50' : 'border-gray-300'
              )}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {open && (sugestoes.length > 0 || loading) && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {loading ? (
                <div className="px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 animate-spin" /> Buscando...
                </div>
              ) : (
                sugestoes.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
                    className="w-full text-left px-3 py-2.5 hover:bg-primary-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">{s.nome}</p>
                    {s.telefone && (
                      <p className="text-xs text-gray-400">{s.telefone}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {nomeError && <p className="text-xs text-red-600">{nomeError}</p>}
      </div>

      {/* Telefone */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">WhatsApp / Telefone</label>
        <input
          type="tel"
          value={telefoneValue}
          onChange={(e) => onTelefoneChange(e.target.value)}
          placeholder="(11) 99999-9999"
          className={cn(
            'w-full h-10 px-3 rounded-lg border text-sm bg-white text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            telefoneError ? 'border-red-400 bg-red-50' : 'border-gray-300'
          )}
        />
        {telefoneError && <p className="text-xs text-red-600">{telefoneError}</p>}
      </div>
    </div>
  )
}
