'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { PedidoWithItens } from '../types/pedido.types'
import type { PedidoFormValues, PedidoUpdateValues } from '../schemas/pedido.schema'

async function fetchPedidos(): Promise<PedidoWithItens[]> {
  const res = await fetch('/api/pedidos')
  if (!res.ok) throw new Error('Erro ao buscar pedidos')
  return res.json()
}

async function fetchPedido(id: string): Promise<PedidoWithItens> {
  const res = await fetch(`/api/pedidos/${id}`)
  if (!res.ok) throw new Error('Pedido não encontrado')
  return res.json()
}

async function createPedido(data: PedidoFormValues): Promise<PedidoWithItens> {
  const res = await fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao criar pedido')
  }
  return res.json()
}

async function updatePedido({ id, data }: { id: string; data: PedidoUpdateValues }): Promise<PedidoWithItens> {
  const res = await fetch(`/api/pedidos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erro ao atualizar pedido')
  return res.json()
}

async function deletePedido(id: string): Promise<void> {
  const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao excluir pedido')
}

export function usePedidos() {
  return useQuery({
    queryKey: ['pedidos'],
    queryFn: fetchPedidos,
  })
}

export function usePedido(id: string) {
  return useQuery({
    queryKey: ['pedidos', id],
    queryFn: () => fetchPedido(id),
    enabled: !!id,
  })
}

export function useCreatePedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPedido,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      toast.success('Pedido criado com sucesso!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdatePedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updatePedido,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      qc.setQueryData(['pedidos', data.id], data)
      toast.success('Pedido atualizado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeletePedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePedido,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      toast.success('Pedido excluído.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
