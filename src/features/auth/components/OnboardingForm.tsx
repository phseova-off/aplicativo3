'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Store, Phone, MapPin } from 'lucide-react'
import { onboardingSchema, type OnboardingFormValues } from '../schemas/auth.schema'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'

export function OnboardingForm() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
  })

  async function onSubmit(values: OnboardingFormValues) {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        nome_negocio: values.nome_negocio,
        telefone: values.telefone ?? null,
        cidade: values.cidade ?? null,
        onboarding_completo: true,
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.')
      return
    }

    toast.success('Sua doceria está pronta! 🎂')
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nome do negócio"
        placeholder="Ex: Doceria da Maria"
        leftIcon={<Store className="w-4 h-4" />}
        error={errors.nome_negocio?.message}
        required
        {...register('nome_negocio')}
      />
      <Input
        label="WhatsApp (opcional)"
        type="tel"
        placeholder="(11) 99999-9999"
        leftIcon={<Phone className="w-4 h-4" />}
        error={errors.telefone?.message}
        {...register('telefone')}
      />
      <Input
        label="Cidade (opcional)"
        placeholder="São Paulo, SP"
        leftIcon={<MapPin className="w-4 h-4" />}
        error={errors.cidade?.message}
        {...register('cidade')}
      />

      <Button type="submit" loading={isSubmitting} className="w-full mt-2">
        Começar a usar o Doceria Pro
      </Button>
    </form>
  )
}
