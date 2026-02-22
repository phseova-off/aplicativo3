// ============================================================
// Doceria Pro — Shared Domain Types
// Tipos de domínio agnósticos de banco de dados.
// Os tipos de Row do Supabase vivem em src/server/db/types.ts.
// ============================================================

import type { PlanoTipo, PedidoStatus, PedidoCanal, TransacaoTipo } from '@/server/db/types'

// ─── Tenant / Auth ────────────────────────────────────────────

/**
 * Representa uma confeitaria (tenant) no sistema multi-tenant futuro.
 * Mapeada a partir de `confeiteiros` enquanto o schema é single-user.
 */
export interface Confeitaria {
  id: string
  nome: string
  plano: PlanoTipo
  stripe_customer_id: string | null
  created_at: string
}

/**
 * Associação de um usuário a uma confeitaria com papel definido.
 * Preparado para evolução multi-usuário por confeitaria.
 */
export interface MembroConfeitaria {
  confeitaria_id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
}

// ─── Clientes ─────────────────────────────────────────────────

/**
 * Cliente consolidado — agregação dos dados de `pedidos.cliente_*`.
 * Não existe como tabela própria ainda; é derivado em query.
 */
export interface Cliente {
  id: string            // hash determinístico do telefone ou uuid sintético
  confeitaria_id: string
  nome: string
  telefone: string | null
  canal_preferido: PedidoCanal | null
  total_pedidos: number
  ultima_compra: string | null   // ISO 8601 timestamp
}

// ─── Catálogo ─────────────────────────────────────────────────

/**
 * Produto com nomenclatura de domínio (preco_venda / custo_calculado)
 * em vez dos nomes de coluna brutos (preco / custo).
 */
export interface Produto {
  id: string
  confeitaria_id: string
  nome: string
  preco_venda: number
  custo_calculado: number
  ativo: boolean
}

/**
 * Ingrediente do catálogo com histórico de preço.
 * Suporta auditoria de variação de custo ao longo do tempo.
 */
export interface IngredienteCatalogo {
  id: string
  confeitaria_id: string
  nome: string
  preco_atual: number
  preco_anterior: number | null
  updated_at: string
}

// ─── Pedidos ──────────────────────────────────────────────────

export interface Pedido {
  id: string
  confeitaria_id: string
  cliente_id: string | null      // null enquanto tabela clientes não existir
  status: PedidoStatus
  canal: PedidoCanal
  data_entrega: string | null    // ISO 8601 timestamp
  valor_total: number
}

export interface ItensPedido {
  pedido_id: string
  produto_id: string | null
  quantidade: number
  preco_unitario: number
}

// ─── Financeiro ───────────────────────────────────────────────

export interface Transacao {
  id: string
  confeitaria_id: string
  tipo: TransacaoTipo
  categoria: string
  valor: number
  data: string                   // DATE: YYYY-MM-DD
  pedido_id?: string | null
}

// ─── HTTP / API ───────────────────────────────────────────────

/**
 * Envelope padrão para todas as respostas de Route Handlers.
 * Garante que o cliente sempre sabe o que esperar.
 *
 * @example
 * // sucesso
 * { data: pedido, error: null, status: 200 }
 * // erro
 * { data: null, error: 'NOT_FOUND', status: 404 }
 */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

// ─── Paginação ────────────────────────────────────────────────

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

// ─── Re-exports convenientes ──────────────────────────────────

export type { PlanoTipo, PedidoStatus, PedidoCanal, TransacaoTipo }
