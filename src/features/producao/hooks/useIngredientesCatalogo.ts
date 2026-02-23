'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────

export interface IngredienteCatalogoItem {
  id: string
  nome: string
  unidade: string
  preco_atual: number
  preco_anterior: number | null
  preco_updated_at: string | null
  fornecedor: string | null
  observacoes: string | null
  created_at: string
  produtos_count: number
}

export interface AtualizarPrecoPayload {
  preco_atual: number
  fornecedor?: string | null
  observacoes?: string | null
}

export interface AtualizarPrecoResult {
  _meta: { mudou_preco: boolean; produtos_afetados: number }
}

export interface ImportarPreviewItem {
  linha: number
  nome: string
  preco_atual: number
  unidade: string
  fornecedor: string | null
  status: 'novo' | 'atualizar' | 'erro'
  erro?: string
}

export interface ImportarResult {
  inseridos: number
  atualizados: number
  erros: number
  linhas: ImportarPreviewItem[]
}

// ─── API Fetchers ─────────────────────────────────────────────

async function fetchCatalogo(q: string): Promise<IngredienteCatalogoItem[]> {
  const params = new URLSearchParams({ modo: 'catalogo', limit: '500' })
  if (q) params.set('q', q)
  const res = await fetch(`/api/ingredientes-catalogo?${params}`)
  if (!res.ok) throw new Error('Erro ao carregar catálogo')
  return res.json()
}

async function atualizarPreco(id: string, payload: AtualizarPrecoPayload): Promise<AtualizarPrecoResult> {
  const res = await fetch(`/api/ingredientes-catalogo/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao atualizar preço')
  }
  return res.json()
}

async function criarIngrediente(payload: {
  nome: string; preco_atual: number; unidade: string; fornecedor?: string | null
}): Promise<Record<string, unknown>> {
  const res = await fetch('/api/ingredientes-catalogo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao criar ingrediente')
  }
  return res.json()
}

async function deletarIngrediente(id: string): Promise<void> {
  const res = await fetch(`/api/ingredientes-catalogo/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao excluir ingrediente')
}

async function importarPreview(csv: string): Promise<ImportarResult> {
  const res = await fetch('/api/ingredientes-catalogo/importar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv, confirmar: false }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao processar CSV')
  }
  return res.json()
}

async function importarConfirmar(csv: string): Promise<ImportarResult> {
  const res = await fetch('/api/ingredientes-catalogo/importar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv, confirmar: true }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao importar')
  }
  return res.json()
}

// ─── Hooks ────────────────────────────────────────────────────

export function useIngredientesCatalogo(q = '') {
  return useQuery({
    queryKey: ['ingredientes-catalogo', q],
    queryFn: () => fetchCatalogo(q),
    staleTime: 60_000,
  })
}

export function useAtualizarPreco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AtualizarPrecoPayload }) =>
      atualizarPreco(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ingredientes-catalogo'] })
      qc.invalidateQueries({ queryKey: ['producao'] })
      const n = data._meta.produtos_afetados
      if (n > 0) {
        toast.success(`Preço atualizado! ${n} produto${n > 1 ? 's' : ''} recalculado${n > 1 ? 's' : ''}.`)
      } else {
        toast.success('Preço atualizado!')
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCriarIngrediente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: criarIngrediente,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredientes-catalogo'] })
      toast.success('Ingrediente adicionado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeletarIngrediente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletarIngrediente,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredientes-catalogo'] })
      toast.success('Ingrediente excluído.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useImportarPreview() {
  return useMutation({
    mutationFn: importarPreview,
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useImportarConfirmar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: importarConfirmar,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ingredientes-catalogo'] })
      toast.success(`Importação concluída: ${data.inseridos} inseridos, ${data.atualizados} atualizados.`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
