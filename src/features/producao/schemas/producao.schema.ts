import { z } from 'zod'

export const ingredienteSchema = z.object({
  nome: z.string().min(1, 'Nome do ingrediente obrigatório'),
  quantidade: z.coerce.number().min(0.001, 'Quantidade inválida'),
  unidade: z.string().min(1, 'Unidade obrigatória'),
  custo_unitario: z.coerce.number().min(0, 'Custo inválido'),
  // Opcional: FK para ingredientes_catalogo (para cálculo de custo real)
  ingrediente_id: z.string().uuid().optional().nullable(),
})

export const receitaSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional().nullable(),
  preco: z.coerce.number().min(0, 'Preço inválido'),
  custo: z.coerce.number().min(0, 'Custo inválido'),
  categoria: z.enum(['trufa', 'bombom', 'kit', 'outro']).default('outro'),
  ativo: z.boolean().default(true),
  rendimento: z.coerce.number().int().min(1).default(1),
  tempo_producao_minutos: z.coerce.number().int().min(0).default(60),
  ingredientes: z.array(ingredienteSchema).default([]),
})

export const loteUpdateSchema = z.object({
  quantidade_produzida: z.coerce.number().min(0).optional(),
  custo_total: z.coerce.number().min(0).optional(),
  observacoes: z.string().optional().nullable(),
  data_producao: z.string().optional(),
  status: z.enum(['planejado', 'em_andamento', 'concluido', 'cancelado']).optional(),
  motivo_desvio: z.string().optional().nullable(),
})

export const concluirLoteSchema = z.object({
  quantidade_produzida: z.coerce.number().min(0, 'Quantidade não pode ser negativa'),
  observacoes: z.string().optional().nullable(),
  motivo_desvio: z.string().optional().nullable(),
}).superRefine((val, ctx) => {
  if (val.quantidade_produzida === 0 && !val.observacoes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe o motivo da produção zero (ingrediente faltou, etc.)',
      path: ['observacoes'],
    })
  }
})

export type ReceitaFormValues = z.infer<typeof receitaSchema>
export type IngredienteValues = z.infer<typeof ingredienteSchema>
export type LoteUpdateValues = z.infer<typeof loteUpdateSchema>
export type ConcluirLoteValues = z.infer<typeof concluirLoteSchema>
