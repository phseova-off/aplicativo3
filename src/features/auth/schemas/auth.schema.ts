import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const cadastroSchema = z
  .object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

// ─── Onboarding — 5 steps ─────────────────────────────────────

export const onboardingStep1Schema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome muito longo'),
  slug: z
    .string()
    .min(2, 'Slug deve ter no mínimo 2 caracteres')
    .max(60, 'Slug muito longo')
    .regex(/^[a-z0-9-]+$/, 'Só letras minúsculas, números e hífens'),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
})

// Step 2: first product + ingredient rows → Aha! moment
export const ingredienteLinhaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  quantidade: z.coerce
    .number({ invalid_type_error: 'Quantidade inválida' })
    .positive('Deve ser positivo'),
  unidade: z.enum(['kg', 'g', 'l', 'ml', 'un', 'cx', 'pct']),
  preco_por_unidade: z.coerce
    .number({ invalid_type_error: 'Preço inválido' })
    .positive('Deve ser positivo'),
})

export const onboardingStep2Schema = z.object({
  produto_nome: z.string().min(2, 'Nome do produto obrigatório').max(100),
  produto_preco: z.coerce
    .number({ invalid_type_error: 'Preço inválido' })
    .positive('Preço deve ser positivo'),
  produto_categoria: z.enum(['trufa', 'bombom', 'kit', 'bolo', 'cookie', 'outro']),
  produto_rendimento: z.coerce.number().int().positive('Rendimento inválido').default(1),
  ingredientes: z
    .array(ingredienteLinhaSchema)
    .min(1, 'Adicione pelo menos 1 ingrediente'),
})

// Step 3: delivery & availability config
export const onboardingStep3Schema = z.object({
  area_entrega: z.string().optional(),
  prazo_padrao_dias: z.coerce.number().int().min(0).max(30).default(3),
  horarios_atendimento: z.string().optional(),
})

// Step 4: activate public menu
export const onboardingStep4Schema = z.object({
  menu_publico_ativo: z.boolean().default(true),
})

// Step 5: plan selection
export const onboardingStep5Schema = z.object({
  plano: z.enum(['free', 'starter', 'pro']),
})

// Keep legacy schema for backwards compat
export const onboardingSchema = onboardingStep1Schema

export type LoginFormValues    = z.infer<typeof loginSchema>
export type CadastroFormValues = z.infer<typeof cadastroSchema>
export type OnboardingFormValues = z.infer<typeof onboardingSchema>
export type OnboardingStep1    = z.infer<typeof onboardingStep1Schema>
export type OnboardingStep2    = z.infer<typeof onboardingStep2Schema>
export type OnboardingStep3    = z.infer<typeof onboardingStep3Schema>
export type OnboardingStep4    = z.infer<typeof onboardingStep4Schema>
export type OnboardingStep5    = z.infer<typeof onboardingStep5Schema>
export type IngredienteLinha   = z.infer<typeof ingredienteLinhaSchema>
