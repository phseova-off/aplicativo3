import { z } from 'zod'

export const itemPedidoSchema = z.object({
  produto_id: z.string().uuid().optional().nullable(),
  nome_produto: z.string().min(1, 'Nome do produto obrigatório'),
  quantidade: z.coerce.number().int().min(1, 'Mínimo 1'),
  preco_unitario: z.coerce.number().min(0.01, 'Preço inválido'),
})

export const pedidoSchema = z.object({
  cliente_nome: z.string().min(2, 'Nome do cliente obrigatório'),
  cliente_telefone: z.string().optional().nullable(),
  canal: z.enum(['whatsapp', 'instagram', 'presencial']).default('presencial'),
  status: z
    .enum(['novo', 'confirmado', 'producao', 'pronto', 'entregue', 'cancelado'])
    .default('novo'),
  data_entrega: z.string().optional().nullable(),
  valor_total: z.coerce.number().min(0, 'Valor inválido').default(0),
  observacoes: z.string().optional().nullable(),
  itens: z.array(itemPedidoSchema).optional().default([]),
})

export const pedidoUpdateSchema = pedidoSchema.partial()

export type PedidoFormValues = z.infer<typeof pedidoSchema>
export type PedidoUpdateValues = z.infer<typeof pedidoUpdateSchema>
export type ItemPedidoValues = z.infer<typeof itemPedidoSchema>
