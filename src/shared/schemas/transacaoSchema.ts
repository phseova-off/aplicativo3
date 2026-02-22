// ============================================================
// Doceria Pro — Schema de Transação Financeira (Zod)
// ============================================================

import { z } from 'zod'

// ─── Categorias pré-definidas ─────────────────────────────────

export const CATEGORIAS_RECEITA = [
  'venda_pedido',
  'venda_avulsa',
  'outros_receita',
] as const

export const CATEGORIAS_DESPESA = [
  'ingredientes',
  'embalagens',
  'equipamentos',
  'marketing',
  'delivery',
  'aluguel',
  'outros_despesa',
] as const

export const TODAS_CATEGORIAS = [
  ...CATEGORIAS_RECEITA,
  ...CATEGORIAS_DESPESA,
] as const

export type CategoriaReceita = (typeof CATEGORIAS_RECEITA)[number]
export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number]
export type CategoriaTransacao = (typeof TODAS_CATEGORIAS)[number]

// ─── Schema base ──────────────────────────────────────────────

const baseTransacaoSchema = z.object({
  tipo: z.enum(['receita', 'despesa'], {
    errorMap: () => ({ message: 'Tipo deve ser: receita ou despesa' }),
  }),

  categoria: z
    .string()
    .min(1, 'Categoria é obrigatória')
    .max(60, 'Categoria deve ter no máximo 60 caracteres')
    .trim(),

  descricao: z
    .string()
    .max(200, 'Descrição deve ter no máximo 200 caracteres')
    .trim()
    .nullable()
    .optional(),

  valor: z
    .number({ invalid_type_error: 'Valor deve ser um número' })
    .positive('Valor deve ser maior que zero')
    .multipleOf(0.01, 'Valor deve ter no máximo 2 casas decimais'),

  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .refine((d) => !isNaN(Date.parse(d)), { message: 'Data inválida' }),

  pedido_id: z
    .string()
    .uuid('pedido_id deve ser um UUID válido')
    .nullable()
    .optional(),
})

// ─── Validação cruzada tipo ↔ categoria ──────────────────────

export const criarTransacaoSchema = baseTransacaoSchema.superRefine((data, ctx) => {
  if (data.tipo === 'receita' && !(CATEGORIAS_RECEITA as readonly string[]).includes(data.categoria)) {
    // Categorias customizadas são permitidas — apenas alertamos para as canônicas
    // Não bloqueamos para flexibilidade: confeiteiras podem ter categorias próprias
  }
  if (data.tipo === 'despesa' && data.pedido_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['pedido_id'],
      message: 'Despesas não podem ser vinculadas a pedidos',
    })
  }
})

export type CriarTransacaoInput = z.infer<typeof criarTransacaoSchema>

// ─── Atualização parcial ──────────────────────────────────────

export const atualizarTransacaoSchema = baseTransacaoSchema.partial().superRefine((data, ctx) => {
  if (data.tipo === 'despesa' && data.pedido_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['pedido_id'],
      message: 'Despesas não podem ser vinculadas a pedidos',
    })
  }
})

export type AtualizarTransacaoInput = z.infer<typeof atualizarTransacaoSchema>

// ─── Filtros de listagem ──────────────────────────────────────

export const filtrosTransacaoSchema = z.object({
  tipo:      z.enum(['receita', 'despesa']).optional(),
  categoria: z.string().optional(),
  data_de:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_ate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page:      z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
})

export type FiltrosTransacaoInput = z.infer<typeof filtrosTransacaoSchema>
