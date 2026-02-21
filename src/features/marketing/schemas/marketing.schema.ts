import { z } from 'zod'

export const marketingSchema = z.object({
  tipo_negocio: z.string().min(1, 'Tipo de negócio obrigatório'),
  publico_alvo: z.string().min(1, 'Público-alvo obrigatório'),
  periodo_dias: z.number().int().min(7).max(30),
  foco: z.string().min(1, 'Foco do período obrigatório'),
})

export const dataComemorativaSchema = z.object({
  data: z.string(),
  nome: z.string(),
  relevancia: z.enum(['alta', 'media', 'baixa']),
})

export const cronogramaInputSchema = z.object({
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2024).max(2030),
  datas_especiais: z.array(dataComemorativaSchema).default([]),
  produtos: z.array(z.string()).default([]),
})

export type MarketingFormValues = z.infer<typeof marketingSchema>
export type CronogramaInputValues = z.infer<typeof cronogramaInputSchema>
