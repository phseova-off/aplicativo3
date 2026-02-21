import { z } from 'zod'

export const ingredienteSchema = z.object({
  nome: z.string().min(1, 'Nome do ingrediente obrigatório'),
  quantidade: z.coerce.number().min(0.001, 'Quantidade inválida'),
  unidade: z.string().min(1, 'Unidade obrigatória'),
  custo_unitario: z.coerce.number().min(0, 'Custo inválido'),
})

export const receitaSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional().nullable(),
  preco: z.coerce.number().min(0, 'Preço inválido'),
  custo: z.coerce.number().min(0, 'Custo inválido'),
  categoria: z.enum(['trufa', 'bombom', 'kit', 'outro']).default('outro'),
  ativo: z.boolean().default(true),
  ingredientes: z.array(ingredienteSchema).default([]),
})

export const loteUpdateSchema = z.object({
  quantidade_produzida: z.coerce.number().min(0).optional(),
  custo_total: z.coerce.number().min(0).optional(),
  observacoes: z.string().optional().nullable(),
  data_producao: z.string().optional(),
})

export type ReceitaFormValues = z.infer<typeof receitaSchema>
export type IngredienteValues = z.infer<typeof ingredienteSchema>
export type LoteUpdateValues = z.infer<typeof loteUpdateSchema>
