// ============================================================
// Doceria Pro — Database Types
// Espelha o schema do Supabase (migrations 001–006).
// Para regenerar via CLI: npx supabase gen types typescript --local
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Enums ───────────────────────────────────────────────────
export type PlanoTipo        = 'free' | 'starter' | 'pro'
export type PedidoStatus     = 'novo' | 'confirmado' | 'producao' | 'pronto' | 'entregue' | 'cancelado'
export type PedidoCanal      = 'whatsapp' | 'instagram' | 'presencial' | 'cardapio_publico'
export type ProdutoCategoria = 'trufa' | 'bombom' | 'kit' | 'outro'
export type TransacaoTipo    = 'receita' | 'despesa'
export type MembroRole       = 'owner' | 'editor' | 'viewer'
export type UnidadeMedida    = 'kg' | 'g' | 'l' | 'ml' | 'un' | 'cx' | 'pct'

// ─── JSONB Schemas ────────────────────────────────────────────

/** Ingrediente individual dentro do array produtos.ingredientes (legado JSONB) */
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
  data: string   // ISO 8601: YYYY-MM-DD
  nome: string
}

// ─── Tables — Schema v2 (multi-usuário) ──────────────────────

/**
 * Entidade de negócio (tenant real).
 * Um usuário pode pertencer a múltiplas confeitarias via ConfeitariaMembro.
 */
export interface Confeitaria {
  id: string
  nome: string
  cidade: string | null
  telefone: string | null
  logo_url: string | null
  descricao: string | null

  plano: PlanoTipo
  stripe_customer_id: string | null
  stripe_subscription_id: string | null

  /** Contador de pedidos criados no mês de referência */
  pedidos_mes_atual: number
  /** Contador de cronogramas IA gerados no mês de referência */
  cronogramas_ia_mes_atual: number
  /** Primeiro dia do mês corrente dos contadores (YYYY-MM-DD) */
  mes_referencia: string

  // ── Campos adicionados na migration 007 ──
  /** Slug único para URL pública do cardápio (ex: "doceria-da-maria") */
  slug: string | null
  /** Se o onboarding de 5 passos foi concluído */
  onboarding_completo: boolean
  /** Área de entrega (texto livre) */
  area_entrega: string | null
  /** Prazo padrão de entrega em dias */
  prazo_padrao_dias: number | null
  /** Horários de atendimento (texto livre) */
  horarios_atendimento: string | null
  /** Se o cardápio público está ativo */
  menu_publico_ativo: boolean

  created_at: string
  updated_at: string
}

/**
 * Associação M2M entre auth.users e confeitarias.
 * owner: acesso total | editor: criar/editar | viewer: somente leitura
 */
export interface ConfeitariaMembro {
  confeitaria_id: string
  user_id: string
  role: MembroRole
  created_at: string
}

/**
 * Cliente com stats desnormalizados (atualizados por trigger).
 */
export interface Cliente {
  id: string
  confeitaria_id: string
  nome: string
  telefone: string | null
  email: string | null
  canal_preferido: PedidoCanal | null
  total_pedidos: number
  valor_total_compras: number
  ultima_compra: string | null   // DATE: YYYY-MM-DD
  observacoes: string | null
  created_at: string
  updated_at: string
}

/**
 * Ingrediente do catálogo com histórico de preço.
 * preco_anterior e preco_updated_at são preenchidos automaticamente
 * por trigger quando preco_atual é alterado.
 */
export interface IngredienteCatalogo {
  id: string
  confeitaria_id: string
  nome: string
  unidade: UnidadeMedida
  preco_atual: number
  preco_anterior: number | null
  preco_updated_at: string | null   // ISO 8601 timestamp
  fornecedor: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

/**
 * Linha da tabela N:M produtos × ingredientes_catalogo.
 * quantidade: em unidade do ingrediente (ex: 200 = 200g se unidade='g')
 */
export interface ProdutoIngrediente {
  id: string
  produto_id: string
  ingrediente_id: string
  quantidade: number
  created_at: string
}

// ─── Tables — Schema v1 (legado — mantido para compatibilidade) ─

/**
 * Perfil do usuário, diretamente vinculado a auth.users.
 * Mantido para compatibilidade. Novo código deve usar Confeitaria + ConfeitariaMembro.
 */
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
  confeitaria_id: string | null   // v2: FK para confeitarias
  nome: string
  descricao: string | null
  preco: number                   // legado — use preco_venda para novo código
  preco_venda: number             // v2: preço de venda
  custo: number                   // legado — use custo_calculado para novo código
  custo_calculado: number         // v2: calculado automaticamente via trigger
  rendimento: number | null       // v2: unidades que a receita rende
  tempo_producao_minutos: number | null  // v2
  categoria: ProdutoCategoria
  ativo: boolean
  foto_url: string | null
  ingredientes: Ingrediente[]     // legado JSONB — use ProdutoIngrediente para novo código
  created_at: string
  updated_at: string
}

export interface Pedido {
  id: string
  confeiteiro_id: string
  confeitaria_id: string | null   // v2
  cliente_id: string | null       // v2: FK para clientes
  cliente_nome: string
  cliente_telefone: string | null
  status: PedidoStatus
  canal: PedidoCanal
  data_entrega: string | null     // ISO 8601 timestamp
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
  subtotal: number                // coluna GENERATED — sempre calculada
  created_at: string
}

export interface ProducaoLote {
  id: string
  confeiteiro_id: string
  confeitaria_id: string | null   // v2
  produto_id: string | null
  nome_produto: string
  quantidade_planejada: number
  quantidade_produzida: number
  data_producao: string           // DATE: YYYY-MM-DD
  custo_total: number
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface Transacao {
  id: string
  confeiteiro_id: string
  confeitaria_id: string | null   // v2
  tipo: TransacaoTipo
  categoria: string
  descricao: string | null
  valor: number
  data: string                    // DATE: YYYY-MM-DD
  pedido_id: string | null
  created_at: string
}

export interface CronogramaMarketing {
  id: string
  confeiteiro_id: string
  confeitaria_id: string | null   // v2
  mes: number
  ano: number
  conteudo: MarketingPost[]
  datas_comemorativas: DataComemorativa[]
  created_at: string
}

// ─── Insert Types ─────────────────────────────────────────────

export type ConfeitariaInsert = Pick<Confeitaria, 'nome'> &
  Partial<Omit<Confeitaria, 'id' | 'nome' | 'pedidos_mes_atual' | 'cronogramas_ia_mes_atual' | 'mes_referencia' | 'created_at' | 'updated_at'>>

export type ConfeitariaMembroInsert = Pick<ConfeitariaMembro, 'confeitaria_id' | 'user_id' | 'role'>

export type ClienteInsert = Pick<Cliente, 'confeitaria_id' | 'nome'> &
  Partial<Omit<Cliente, 'id' | 'confeitaria_id' | 'nome' | 'total_pedidos' | 'valor_total_compras' | 'created_at' | 'updated_at'>>

export type IngredienteCatalogoInsert = Pick<IngredienteCatalogo, 'confeitaria_id' | 'nome' | 'preco_atual'> &
  Partial<Omit<IngredienteCatalogo, 'id' | 'confeitaria_id' | 'nome' | 'preco_atual' | 'preco_anterior' | 'preco_updated_at' | 'created_at' | 'updated_at'>>

export type ProdutoIngredienteInsert = Pick<ProdutoIngrediente, 'produto_id' | 'ingrediente_id' | 'quantidade'>

export type ConfeteiroInsert = Pick<Confeiteiro, 'id' | 'nome' | 'email'> &
  Partial<Omit<Confeiteiro, 'id' | 'nome' | 'email' | 'created_at' | 'updated_at'>>

export type ProdutoInsert = Pick<Produto, 'confeiteiro_id' | 'nome'> &
  Partial<Omit<Produto, 'id' | 'confeiteiro_id' | 'nome' | 'created_at' | 'updated_at'>>

export type PedidoInsert = Pick<Pedido, 'confeiteiro_id' | 'cliente_nome'> &
  Partial<Omit<Pedido, 'id' | 'confeiteiro_id' | 'cliente_nome' | 'created_at' | 'updated_at'>>

export type ItemPedidoInsert = Pick<ItemPedido, 'pedido_id' | 'nome_produto' | 'quantidade' | 'preco_unitario'> &
  Partial<Pick<ItemPedido, 'produto_id'>>

export type ProducaoLoteInsert =
  Pick<ProducaoLote, 'confeiteiro_id' | 'nome_produto' | 'quantidade_planejada' | 'data_producao'> &
  Partial<Omit<ProducaoLote, 'id' | 'confeiteiro_id' | 'nome_produto' | 'quantidade_planejada' | 'data_producao' | 'created_at' | 'updated_at'>>

export type TransacaoInsert = Pick<Transacao, 'confeiteiro_id' | 'tipo' | 'categoria' | 'valor'> &
  Partial<Omit<Transacao, 'id' | 'confeiteiro_id' | 'tipo' | 'categoria' | 'valor' | 'created_at'>>

export type CronogramaMarketingInsert = Pick<CronogramaMarketing, 'confeiteiro_id' | 'mes' | 'ano'> &
  Partial<Omit<CronogramaMarketing, 'id' | 'confeiteiro_id' | 'mes' | 'ano' | 'created_at'>>

// ─── Update Types ─────────────────────────────────────────────

export type ConfeitariaUpdate         = Partial<Omit<Confeitaria, 'id' | 'pedidos_mes_atual' | 'cronogramas_ia_mes_atual' | 'mes_referencia' | 'created_at' | 'updated_at'>>
export type ClienteUpdate             = Partial<Omit<Cliente, 'id' | 'confeitaria_id' | 'created_at' | 'updated_at'>>
export type IngredienteCatalogoUpdate = Partial<Omit<IngredienteCatalogo, 'id' | 'confeitaria_id' | 'preco_anterior' | 'preco_updated_at' | 'created_at' | 'updated_at'>>
export type ProdutoIngredienteUpdate  = Pick<ProdutoIngrediente, 'quantidade'>
export type ConfeteiroUpdate          = Partial<Omit<Confeiteiro, 'id' | 'created_at' | 'updated_at'>>
export type ProdutoUpdate             = Partial<Omit<Produto, 'id' | 'confeiteiro_id' | 'created_at' | 'updated_at'>>
export type PedidoUpdate              = Partial<Omit<Pedido, 'id' | 'confeiteiro_id' | 'created_at' | 'updated_at'>>
export type ProducaoLoteUpdate        = Partial<Omit<ProducaoLote, 'id' | 'confeiteiro_id' | 'created_at' | 'updated_at'>>
export type TransacaoUpdate           = Partial<Omit<Transacao, 'id' | 'confeiteiro_id' | 'created_at'>>
export type CronogramaUpdate          = Partial<Pick<CronogramaMarketing, 'conteudo' | 'datas_comemorativas'>>

// ─── Joined / Extended Types ──────────────────────────────────

/** Pedido com seus itens */
export interface PedidoComItens extends Pedido {
  itens_pedido: ItemPedido[]
}

/** Pedido com dados do cliente (join clientes) */
export interface PedidoComCliente extends Pedido {
  cliente: Cliente | null
}

/** Produto com margem de lucro calculada */
export interface ProdutoComMargem extends Produto {
  margem_percentual: number   // (preco_venda - custo_calculado) / preco_venda * 100
}

/** Produto com lista de ingredientes expandida (join produtos_ingredientes + ingredientes_catalogo) */
export interface ProdutoComIngredientes extends Produto {
  produtos_ingredientes: Array<ProdutoIngrediente & { ingrediente: IngredienteCatalogo }>
}

/** Resumo financeiro de um período */
export interface ResumoFinanceiro {
  total_receitas: number
  total_despesas: number
  lucro_liquido: number
  ticket_medio: number
  total_pedidos_pagos: number
}

/** Pedido resumido para listas */
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

/** Membro com dados básicos do perfil */
export interface MembroComPerfil extends ConfeitariaMembro {
  email: string
  nome: string
}

// ─── Database object (para tipagem do Supabase client) ────────

export interface Database {
  public: {
    Tables: {
      // ── v2 ───────────────────────────────────────────────
      confeitarias: {
        Row:           Confeitaria
        Insert:        ConfeitariaInsert
        Update:        ConfeitariaUpdate
        Relationships: []
      }
      confeitaria_membros: {
        Row:           ConfeitariaMembro
        Insert:        ConfeitariaMembroInsert
        Update:        Pick<ConfeitariaMembro, 'role'>
        Relationships: []
      }
      clientes: {
        Row:           Cliente
        Insert:        ClienteInsert
        Update:        ClienteUpdate
        Relationships: []
      }
      ingredientes_catalogo: {
        Row:           IngredienteCatalogo
        Insert:        IngredienteCatalogoInsert
        Update:        IngredienteCatalogoUpdate
        Relationships: []
      }
      produtos_ingredientes: {
        Row:           ProdutoIngrediente
        Insert:        ProdutoIngredienteInsert
        Update:        ProdutoIngredienteUpdate
        Relationships: []
      }
      // ── Idempotência Stripe (migration 007) ──────────────
      stripe_events_processados: {
        Row: {
          stripe_event_id: string
          tipo: string
          payload_resumo: Json | null
          processado_em: string
        }
        Insert: {
          stripe_event_id: string
          tipo: string
          payload_resumo?: Json | null
          processado_em?: string
        }
        Update: {
          tipo?: string
          payload_resumo?: Json | null
        }
        Relationships: []
      }
      // ── v1 (legado) ───────────────────────────────────────
      confeiteiros: {
        Row:           Confeiteiro
        Insert:        ConfeteiroInsert
        Update:        ConfeteiroUpdate
        Relationships: []
      }
      produtos: {
        Row:           Produto
        Insert:        ProdutoInsert
        Update:        ProdutoUpdate
        Relationships: []
      }
      pedidos: {
        Row:           Pedido
        Insert:        PedidoInsert
        Update:        PedidoUpdate
        Relationships: []
      }
      itens_pedido: {
        Row:           ItemPedido
        Insert:        ItemPedidoInsert
        Update:        Partial<Pick<ItemPedido, 'quantidade' | 'preco_unitario' | 'nome_produto'>>
        Relationships: []
      }
      producao_lotes: {
        Row:           ProducaoLote
        Insert:        ProducaoLoteInsert
        Update:        ProducaoLoteUpdate
        Relationships: []
      }
      transacoes: {
        Row:           Transacao
        Insert:        TransacaoInsert
        Update:        TransacaoUpdate
        Relationships: []
      }
      cronogramas_marketing: {
        Row:           CronogramaMarketing
        Insert:        CronogramaMarketingInsert
        Update:        CronogramaUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_member:  { Args: { p_confeitaria_id: string }; Returns: boolean }
      is_editor:  { Args: { p_confeitaria_id: string }; Returns: boolean }
      is_owner:   { Args: { p_confeitaria_id: string }; Returns: boolean }
      resetar_contadores_mensais: { Args: { p_confeitaria_id: string }; Returns: void }
    }
    Enums: {
      plano_tipo:        PlanoTipo
      pedido_status:     PedidoStatus
      pedido_canal:      PedidoCanal
      produto_categoria: ProdutoCategoria
      transacao_tipo:    TransacaoTipo
      membro_role:       MembroRole
      unidade_medida:    UnidadeMedida
    }
  }
}
