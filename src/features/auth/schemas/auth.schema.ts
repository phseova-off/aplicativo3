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

export const onboardingSchema = z.object({
  nome_negocio: z.string().min(2, 'Nome do negócio deve ter no mínimo 2 caracteres').max(100),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type CadastroFormValues = z.infer<typeof cadastroSchema>
export type OnboardingFormValues = z.infer<typeof onboardingSchema>
