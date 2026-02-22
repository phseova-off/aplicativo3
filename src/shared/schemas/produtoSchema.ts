// ============================================================
// Doceria Pro — Schema de Produto (Zod)
// ============================================================

import { z } from 'zod'

// ─── Ingrediente aninhado ─────────────────────────────────────

export const ingredienteSchema = z.object({
  nome: z
    .string()
    .min(1, 'Nome do ingrediente é obrigatório')
    .max(80, 'Nome do ingrediente deve ter no máximo 80 caracteres')
    .trim(),

  quantidade: z
    .number({ invalid_type_error: 'Quantidade deve ser um número' })
    .positive('Quantidade deve ser maior que zero'),

  unidade: z
    .string()
    .min(1, 'Unidade é obrigatória')
    .max(20, 'Unidade deve ter no máximo 20 caracteres')
    .trim(),

  custo_unitario: z
    .number({ invalid_type_error: 'Custo deve ser um número' })
    .nonnegative('Custo não pode ser negativo')
    .multipleOf(0.001, 'Custo deve ter no máximo 3 casas decimais'),
})

export type IngredienteInput = z.infer<typeof ingredienteSchema>

// ─── Criação de produto ───────────────────────────────────────

export const criarProdutoSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome do produto deve ter no mínimo 2 caracteres')
    .max(120, 'Nome do produto deve ter no máximo 120 caracteres')
    .trim(),

  descricao: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .nullable()
    .optional(),

  preco: z
    .number({ invalid_type_error: 'Preço de venda deve ser um número' })
    .positive('Preço de venda deve ser maior que zero')
    .multipleOf(0.01, 'Preço deve ter no máximo 2 casas decimais'),

  categoria: z.enum(['trufa', 'bombom', 'kit', 'outro'], {
    errorMap: () => ({ message: 'Categoria deve ser: trufa, bombom, kit ou outro' }),
  }),

  ativo: z.boolean().default(true),

  foto_url: z
    .string()
    .url('URL da foto inválida')
    .nullable()
    .optional(),

  ingredientes: z
    .array(ingredienteSchema)
    .max(30, 'Um produto pode ter no máximo 30 ingredientes')
    .default([]),
})

export type CriarProdutoInput = z.infer<typeof criarProdutoSchema>

// ─── Atualização de produto ───────────────────────────────────

export const atualizarProdutoSchema = criarProdutoSchema.partial()

export type AtualizarProdutoInput = z.infer<typeof atualizarProdutoSchema>

// ─── Custo calculado ─────────────────────────────────────────

/**
 * Calcula o custo total de um produto a partir dos ingredientes.
 * Usado para derivar `custo_calculado` antes de persistir.
 */
export function calcularCustoProduto(ingredientes: IngredienteInput[]): number {
  return ingredientes.reduce(
    (acc, ing) => acc + ing.quantidade * ing.custo_unitario,
    0
  )
}
