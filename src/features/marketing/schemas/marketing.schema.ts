import { z } from 'zod'

export const marketingSchema = z.object({
  tipo_negocio: z.string().min(1, 'Tipo de negócio obrigatório'),
  publico_alvo: z.string().min(1, 'Público-alvo obrigatório'),
  periodo_dias: z.number().int().min(7).max(30),
  foco: z.string().min(1, 'Foco do período obrigatório'),
})

export type MarketingFormValues = z.infer<typeof marketingSchema>
