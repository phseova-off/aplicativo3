'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Mail, Lock } from 'lucide-react'
import { cadastroSchema, type CadastroFormValues } from '../schemas/auth.schema'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { GoogleButton } from './GoogleButton'

export function CadastroForm() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroFormValues>({
    resolver: zodResolver(cadastroSchema),
  })

  async function onSubmit(values: CadastroFormValues) {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      toast.error(
        error.message.includes('already registered')
          ? 'Este e-mail já está cadastrado.'
          : 'Erro ao criar conta. Tente novamente.'
      )
      return
    }

    toast.success('Conta criada! Vamos configurar sua doceria.')
    router.push('/onboarding')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="seu@email.com"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Senha"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 6 caracteres"
        leftIcon={<Lock className="w-4 h-4" />}
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        placeholder="Repita a senha"
        leftIcon={<Lock className="w-4 h-4" />}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button type="submit" loading={isSubmitting} className="w-full">
        Criar conta grátis
      </Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-400">ou</span>
        </div>
      </div>

      <GoogleButton label="Cadastrar com Google" />

      <p className="text-center text-sm text-gray-600">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary-600 font-medium hover:text-primary-700">
          Entrar
        </Link>
      </p>

      <p className="text-center text-xs text-gray-500">
        Ao criar conta você concorda com nossos{' '}
        <Link href="/termos" className="underline">
          Termos de Uso
        </Link>{' '}
        e{' '}
        <Link href="/privacidade" className="underline">
          Política de Privacidade
        </Link>
        .
      </p>
    </form>
  )
}
