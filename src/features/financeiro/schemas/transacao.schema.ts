import { z } from 'zod'

export const transacaoSchema = z.object({
  tipo: z.enum(['receita', 'despesa']),
  categoria: z.string().min(1, 'Categoria obrigatória'),
  valor: z.number().positive('Valor deve ser positivo'),
  descricao: z.string().optional(),
  data: z.string().min(1, 'Data obrigatória'),
  pedido_id: z.string().uuid().optional().nullable(),
})

export type TransacaoFormValues = z.infer<typeof transacaoSchema>
