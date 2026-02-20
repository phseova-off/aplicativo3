// Database types generated from the Supabase schema.
// Re-run `npx supabase gen types typescript --local` to regenerate after schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nome_negocio: string | null
          telefone: string | null
          cidade: string | null
          onboarding_completo: boolean
          plano: 'gratuito' | 'basico' | 'pro'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome_negocio?: string | null
          telefone?: string | null
          cidade?: string | null
          onboarding_completo?: boolean
          plano?: 'gratuito' | 'basico' | 'pro'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome_negocio?: string | null
          telefone?: string | null
          cidade?: string | null
          onboarding_completo?: boolean
          plano?: 'gratuito' | 'basico' | 'pro'
          updated_at?: string
        }
      }
      pedidos: {
        Row: {
          id: string
          user_id: string
          cliente_nome: string
          cliente_telefone: string | null
          descricao: string | null
          valor: number
          status: 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado'
          data_entrega: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cliente_nome: string
          cliente_telefone?: string | null
          descricao?: string | null
          valor: number
          status?: 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado'
          data_entrega?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          cliente_nome?: string
          cliente_telefone?: string | null
          descricao?: string | null
          valor?: number
          status?: 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado'
          data_entrega?: string | null
          observacoes?: string | null
          updated_at?: string
        }
      }
      itens_pedido: {
        Row: {
          id: string
          pedido_id: string
          produto: string
          quantidade: number
          preco_unitario: number
          created_at: string
        }
        Insert: {
          id?: string
          pedido_id: string
          produto: string
          quantidade: number
          preco_unitario: number
          created_at?: string
        }
        Update: {
          produto?: string
          quantidade?: number
          preco_unitario?: number
        }
      }
      producao: {
        Row: {
          id: string
          pedido_id: string
          user_id: string
          etapa: 'preparo' | 'assar' | 'decorar' | 'embalar' | 'pronto'
          status: 'pendente' | 'em_andamento' | 'concluido'
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pedido_id: string
          user_id: string
          etapa: 'preparo' | 'assar' | 'decorar' | 'embalar' | 'pronto'
          status?: 'pendente' | 'em_andamento' | 'concluido'
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          etapa?: 'preparo' | 'assar' | 'decorar' | 'embalar' | 'pronto'
          status?: 'pendente' | 'em_andamento' | 'concluido'
          observacoes?: string | null
          updated_at?: string
        }
      }
      transacoes: {
        Row: {
          id: string
          user_id: string
          tipo: 'receita' | 'despesa'
          categoria: string
          valor: number
          descricao: string | null
          data: string
          pedido_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tipo: 'receita' | 'despesa'
          categoria: string
          valor: number
          descricao?: string | null
          data: string
          pedido_id?: string | null
          created_at?: string
        }
        Update: {
          tipo?: 'receita' | 'despesa'
          categoria?: string
          valor?: number
          descricao?: string | null
          data?: string
        }
      }
      marketing_cronogramas: {
        Row: {
          id: string
          user_id: string
          titulo: string
          conteudo: Json
          gerado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          titulo: string
          conteudo: Json
          gerado_em?: string
        }
        Update: {
          titulo?: string
          conteudo?: Json
        }
      }
      assinaturas: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plano: 'basico' | 'pro'
          status: string
          periodo_inicio: string | null
          periodo_fim: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plano: 'basico' | 'pro'
          status: string
          periodo_inicio?: string | null
          periodo_fim?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plano?: 'basico' | 'pro'
          status?: string
          periodo_inicio?: string | null
          periodo_fim?: string | null
          cancel_at_period_end?: boolean
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Pedido = Database['public']['Tables']['pedidos']['Row']
export type ItemPedido = Database['public']['Tables']['itens_pedido']['Row']
export type Producao = Database['public']['Tables']['producao']['Row']
export type Transacao = Database['public']['Tables']['transacoes']['Row']
export type MarketingCronograma = Database['public']['Tables']['marketing_cronogramas']['Row']
export type Assinatura = Database['public']['Tables']['assinaturas']['Row']
