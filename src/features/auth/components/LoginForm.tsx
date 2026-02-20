'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Mail, Lock } from 'lucide-react'
import { loginSchema, type LoginFormValues } from '../schemas/auth.schema'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginFormValues) {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Erro ao fazer login. Tente novamente.'
      )
      return
    }

    toast.success('Bem-vinda de volta!')
    router.push(redirectTo)
    router.refresh()
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
        autoComplete="current-password"
        placeholder="••••••••"
        leftIcon={<Lock className="w-4 h-4" />}
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex justify-end">
        <Link href="/esqueci-senha" className="text-sm text-primary-600 hover:text-primary-700">
          Esqueci a senha
        </Link>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Entrar
      </Button>

      <p className="text-center text-sm text-gray-600">
        Não tem conta?{' '}
        <Link href="/cadastro" className="text-primary-600 font-medium hover:text-primary-700">
          Criar conta grátis
        </Link>
      </p>
    </form>
  )
}
