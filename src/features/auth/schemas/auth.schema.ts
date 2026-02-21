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

// ─── Onboarding — 4 steps ─────────────────────────────────────

export const onboardingStep1Schema = z.object({
  nome_negocio: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome muito longo'),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
})

export const onboardingProdutoSchema = z.object({
  nome: z.string().min(2, 'Nome do produto obrigatório').max(100),
  preco: z.coerce
    .number({ invalid_type_error: 'Preço inválido' })
    .positive('Preço deve ser positivo'),
  categoria: z.enum(['trufa', 'bombom', 'kit', 'outro']),
})

export const onboardingStep2Schema = z.object({
  produtos: z
    .array(onboardingProdutoSchema)
    .min(1, 'Adicione pelo menos 1 produto'),
})

export const onboardingStep3Schema = z.object({
  area_entrega: z.string().optional(),
  prazo_padrao: z.coerce
    .number()
    .int()
    .min(0)
    .max(30)
    .default(3),
})

export const onboardingStep4Schema = z.object({
  plano: z.enum(['free', 'starter', 'pro']),
})

// Keep legacy schema for backwards compat
export const onboardingSchema = onboardingStep1Schema

export type LoginFormValues      = z.infer<typeof loginSchema>
export type CadastroFormValues   = z.infer<typeof cadastroSchema>
export type OnboardingFormValues = z.infer<typeof onboardingSchema>
export type OnboardingStep1      = z.infer<typeof onboardingStep1Schema>
export type OnboardingStep2      = z.infer<typeof onboardingStep2Schema>
export type OnboardingStep3      = z.infer<typeof onboardingStep3Schema>
export type OnboardingStep4      = z.infer<typeof onboardingStep4Schema>
export type OnboardingProduto    = z.infer<typeof onboardingProdutoSchema>
