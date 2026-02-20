// ============================================================
// Doceria Pro — Database Types
// Gerado manualmente a partir do schema em supabase/migrations/
// Para regenerar via CLI: npx supabase gen types typescript --local
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Enums ───────────────────────────────────────────────────
export type PlanoTipo        = 'free' | 'starter' | 'pro'
export type PedidoStatus     = 'novo' | 'confirmado' | 'producao' | 'pronto' | 'entregue' | 'cancelado'
export type PedidoCanal      = 'whatsapp' | 'instagram' | 'presencial'
export type ProdutoCategoria = 'trufa' | 'bombom' | 'kit' | 'outro'
export type TransacaoTipo    = 'receita' | 'despesa'

// ─── JSONB Schemas ────────────────────────────────────────────

/** Ingrediente individual dentro do array produtos.ingredientes */
export interface Ingrediente {
  nome: string
  quantidade: number
  unidade: string
  custo_unitario: number
}

/** Post individual dentro do array cronogramas_marketing.conteudo */
export interface MarketingPost {
  dia: number
  plataforma: 'Instagram' | 'WhatsApp' | 'TikTok'
  tema: string
  legenda: string
  hashtags: string[]
  horario_sugerido: string
}

/** Item dentro do array cronogramas_marketing.datas_comemorativas */
export interface DataComemorativa {
  data: string     // ISO 8601: YYYY-MM-DD
  nome: string
}

// ─── Row Types (espelham exatamente as colunas do banco) ──────

export interface Confeiteiro {
  id: string
  nome: string
  email: string
  telefone: string | null
  cidade: string | null
  logo_url: string | null
  plano: PlanoTipo
  stripe_customer_id: string | null
  onboarding_completo: boolean
  created_at: string
  updated_at: string
}

export interface Produto {
  id: string
  confeiteiro_id: string
  nome: string
  descricao: string | null
  preco: number
  custo: number
  categoria: ProdutoCategoria
  ativo: boolean
  foto_url: string | null
  ingredientes: Ingrediente[]
  created_at: string
  updated_at: string
}

export interface Pedido {
  id: string
  confeiteiro_id: string
  cliente_nome: string
  cliente_telefone: string | null
  status: PedidoStatus
  canal: PedidoCanal
  data_entrega: string | null   // ISO 8601 timestamp
  valor_total: number
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface ItemPedido {
  id: string
  pedido_id: string
  produto_id: string | null
  nome_produto: string
  quantidade: number
  preco_unitario: number
  subtotal: number              // coluna GENERATED — sempre calculada
  created_at: string
}

export interface ProducaoLote {
  id: string
  confeiteiro_id: string
  produto_id: string | null
  nome_produto: string
  quantidade_planejada: number
  quantidade_produzida: number
  data_producao: string         // DATE: YYYY-MM-DD
  custo_total: number
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface Transacao {
  id: string
  confeiteiro_id: string
  tipo: TransacaoTipo
  categoria: string
  descricao: string | null
  valor: number
  data: string                  // DATE: YYYY-MM-DD
  pedido_id: string | null
  created_at: string
}

export interface CronogramaMarketing {
  id: string
  confeiteiro_id: string
  mes: number
  ano: number
  conteudo: MarketingPost[]
  datas_comemorativas: DataComemorativa[]
  created_at: string
}

// ─── Insert Types ─────────────────────────────────────────────

export type ConfeteiroInsert = Pick<Confeiteiro, 'id' | 'nome' | 'email'> &
  Partial<Omit<Confeiteiro, 'id' | 'nome' | 'email' | 'created_at' | 'updated_at'>>

export type ProdutoInsert = Pick<Produto, 'confeiteiro_id' | 'nome'> &
  Partial<Omit<Produto, 'id' | 'confeiteiro_id' | 'nome' | 'created_at' | 'updated_at'>>

export type PedidoInsert = Pick<Pedido, 'confeiteiro_id' | 'cliente_nome'> &
  Partial<Omit<Pedido, 'id' | 'confeiteiro_id' | 'cliente_nome' | 'created_at' | 'updated_at'>>

export type ItemPedidoInsert = Pick<ItemPedido, 'pedido_id' | 'nome_produto' | 'quantidade' | 'preco_unitario'> &
  Partial<Pick<ItemPedido, 'produto_id'>>
  // subtotal é GENERATED — nunca inserir manualmente

export type ProducaoLoteInsert =
  Pick<ProducaoLote, 'confeiteiro_id' | 'nome_produto' | 'quantidade_planejada' | 'data_producao'> &
  Partial<Omit<ProducaoLote, 'id' | 'confeiteiro_id' | 'nome_produto' | 'quantidade_planejada' | 'data_producao' | 'created_at' | 'updated_at'>>

export type TransacaoInsert = Pick<Transacao, 'confeiteiro_id' | 'tipo' | 'categoria' | 'valor'> &
  Partial<Omit<Transacao, 'id' | 'confeiteiro_id' | 'tipo' | 'categoria' | 'valor' | 'created_at'>>

export type CronogramaMarketingInsert = Pick<CronogramaMarketing, 'confeiteiro_id' | 'mes' | 'ano'> &
  Partial<Omit<CronogramaMarketing, 'id' | 'confeiteiro_id' | 'mes' | 'ano' | 'created_at'>>

// ─── Update Types ─────────────────────────────────────────────

export type ConfeteiroUpdate     = Partial<Omit<Confeiteiro, 'id' | 'created_at' | 'updated_at'>>
export type ProdutoUpdate        = Partial<Omit<Produto,     'id' | 'confeiteiro_id' | 'created_at' | 'updated_at'>>
export type PedidoUpdate         = Partial<Omit<Pedido,      'id' | 'confeiteiro_id' | 'created_at' | 'updated_at'>>
export type ProducaoLoteUpdate   = Partial<Omit<ProducaoLote,'id' | 'confeiteiro_id' | 'created_at' | 'updated_at'>>
export type TransacaoUpdate      = Partial<Omit<Transacao,   'id' | 'confeiteiro_id' | 'created_at'>>
export type CronogramaUpdate     = Partial<Pick<CronogramaMarketing, 'conteudo' | 'datas_comemorativas'>>

// ─── Joined / Extended Types ──────────────────────────────────

/** Pedido com seus itens (query: pedidos + itens_pedido) */
export interface PedidoComItens extends Pedido {
  itens_pedido: ItemPedido[]
}

/** Produto com margem de lucro calculada no cliente */
export interface ProdutoComMargem extends Produto {
  margem_percentual: number   // (preco - custo) / preco * 100
}

/** Resumo financeiro de um período */
export interface ResumoFinanceiro {
  total_receitas: number
  total_despesas: number
  lucro_liquido: number
  ticket_medio: number
  total_pedidos_pagos: number
}

/** Pedido resumido para listas (sem todos os campos) */
export interface PedidoRecente {
  id: string
  cliente_nome: string
  valor_total: number
  status: PedidoStatus
  canal: PedidoCanal
  data_entrega: string | null
  created_at: string
}

/** Métricas para o dashboard */
export interface DashboardMetricas {
  total_pedidos: number
  pedidos_pendentes: number
  pedidos_em_producao: number
  receita_mes: number
  despesa_mes: number
  lucro_mes: number
  pedidos_recentes: PedidoRecente[]
}

// ─── Database object (para tipagem do Supabase client) ────────

export interface Database {
  public: {
    Tables: {
      confeiteiros: {
        Row:    Confeiteiro
        Insert: ConfeteiroInsert
        Update: ConfeteiroUpdate
      }
      produtos: {
        Row:    Produto
        Insert: ProdutoInsert
        Update: ProdutoUpdate
      }
      pedidos: {
        Row:    Pedido
        Insert: PedidoInsert
        Update: PedidoUpdate
      }
      itens_pedido: {
        Row:    ItemPedido
        Insert: ItemPedidoInsert
        Update: Partial<Pick<ItemPedido, 'quantidade' | 'preco_unitario' | 'nome_produto'>>
      }
      producao_lotes: {
        Row:    ProducaoLote
        Insert: ProducaoLoteInsert
        Update: ProducaoLoteUpdate
      }
      transacoes: {
        Row:    Transacao
        Insert: TransacaoInsert
        Update: TransacaoUpdate
      }
      cronogramas_marketing: {
        Row:    CronogramaMarketing
        Insert: CronogramaMarketingInsert
        Update: CronogramaUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      plano_tipo:        PlanoTipo
      pedido_status:     PedidoStatus
      pedido_canal:      PedidoCanal
      produto_categoria: ProdutoCategoria
      transacao_tipo:    TransacaoTipo
    }
  }
}
