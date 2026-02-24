'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { z } from 'zod'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'

const recuperarSenhaSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

type RecuperarSenhaValues = z.infer<typeof recuperarSenhaSchema>

export function RecuperarSenhaForm() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarSenhaValues>({
    resolver: zodResolver(recuperarSenhaSchema),
  })

  async function onSubmit(values: RecuperarSenhaValues) {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
    })

    if (error) {
      toast.error('Erro ao enviar e-mail. Tente novamente.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">E-mail enviado!</h2>
          <p className="text-sm text-gray-600 mt-1">
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:text-primary-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-gray-600">
        Digite seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="seu@email.com"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.email?.message}
        {...register('email')}
      />

      <Button type="submit" loading={isSubmitting} className="w-full">
        Enviar link de recuperação
      </Button>

      <p className="text-center text-sm text-gray-600">
        Lembrou a senha?{' '}
        <Link href="/login" className="text-primary-600 font-medium hover:text-primary-700">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
