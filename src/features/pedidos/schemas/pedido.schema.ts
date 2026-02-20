import { z } from 'zod'

export const itemPedidoSchema = z.object({
  produto: z.string().min(1, 'Nome do produto obrigatório'),
  quantidade: z.coerce.number().int().min(1, 'Mínimo 1'),
  preco_unitario: z.coerce.number().min(0.01, 'Preço inválido'),
})

export const pedidoSchema = z.object({
  cliente_nome: z.string().min(2, 'Nome do cliente obrigatório'),
  cliente_telefone: z.string().optional(),
  descricao: z.string().optional(),
  valor: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  status: z.enum(['pendente', 'em_producao', 'pronto', 'entregue', 'cancelado']).default('pendente'),
  data_entrega: z.string().optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemPedidoSchema).optional().default([]),
})

export const pedidoUpdateSchema = pedidoSchema.partial()

export type PedidoFormValues = z.infer<typeof pedidoSchema>
export type PedidoUpdateValues = z.infer<typeof pedidoUpdateSchema>
