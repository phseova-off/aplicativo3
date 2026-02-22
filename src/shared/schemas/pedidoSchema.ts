// ============================================================
// Doceria Pro — Schema de Pedido (Zod)
// ============================================================

import { z } from 'zod'

// ─── Item de pedido ───────────────────────────────────────────

export const itemPedidoSchema = z.object({
  produto_id: z
    .string()
    .uuid('produto_id deve ser um UUID válido')
    .nullable()
    .optional(),

  nome_produto: z
    .string()
    .min(1, 'Nome do produto é obrigatório')
    .max(120, 'Nome do produto deve ter no máximo 120 caracteres')
    .trim(),

  quantidade: z
    .number({ invalid_type_error: 'Quantidade deve ser um número' })
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero')
    .max(9999, 'Quantidade máxima é 9999'),

  preco_unitario: z
    .number({ invalid_type_error: 'Preço deve ser um número' })
    .positive('Preço deve ser maior que zero')
    .multipleOf(0.01, 'Preço deve ter no máximo 2 casas decimais'),
})

export type ItemPedidoInput = z.infer<typeof itemPedidoSchema>

// ─── Criação de pedido ────────────────────────────────────────

export const criarPedidoSchema = z.object({
  cliente_nome: z
    .string()
    .min(2, 'Nome do cliente deve ter no mínimo 2 caracteres')
    .max(120, 'Nome do cliente deve ter no máximo 120 caracteres')
    .trim(),

  cliente_telefone: z
    .string()
    .regex(
      /^[\d\s\-\(\)\+]{8,20}$/,
      'Telefone inválido — use apenas números, espaços, +, - e ()'
    )
    .nullable()
    .optional(),

  canal: z.enum(['whatsapp', 'instagram', 'presencial'], {
    errorMap: () => ({ message: 'Canal deve ser: whatsapp, instagram ou presencial' }),
  }),

  data_entrega: z
    .string()
    .datetime({ message: 'data_entrega deve ser um timestamp ISO 8601 válido' })
    .nullable()
    .optional(),

  observacoes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .trim()
    .nullable()
    .optional(),

  itens: z
    .array(itemPedidoSchema)
    .min(1, 'O pedido deve ter pelo menos 1 item')
    .max(50, 'O pedido pode ter no máximo 50 itens'),
})

export type CriarPedidoInput = z.infer<typeof criarPedidoSchema>

// ─── Atualização de status ────────────────────────────────────

export const atualizarStatusSchema = z.object({
  status: z.enum(
    ['novo', 'confirmado', 'producao', 'pronto', 'entregue', 'cancelado'],
    { errorMap: () => ({ message: 'Status inválido' }) }
  ),
})

export type AtualizarStatusInput = z.infer<typeof atualizarStatusSchema>

// ─── Atualização parcial de pedido ───────────────────────────

export const atualizarPedidoSchema = criarPedidoSchema
  .partial()
  .omit({ itens: true })  // itens são imutáveis após criação

export type AtualizarPedidoInput = z.infer<typeof atualizarPedidoSchema>
