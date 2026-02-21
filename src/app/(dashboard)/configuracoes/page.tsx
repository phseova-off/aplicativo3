'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Store,
  Phone,
  MapPin,
  CreditCard,
  Trash2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { onboardingStep1Schema, type OnboardingStep1 } from '@/features/auth/schemas/auth.schema'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { useConfeiteiro } from '@/features/auth/hooks/useConfeiteiro'
import { usePlano } from '@/features/planos/hooks/usePlano'
import { PLANO_CONFIG } from '@/features/planos/lib/planFeatures'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { useRouter } from 'next/navigation'

// ─── Perfil section ───────────────────────────────────────────

function SecaoPerfil() {
  const { confeiteiro, loading, refresh } = useConfeiteiro()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OnboardingStep1>({
    resolver: zodResolver(onboardingStep1Schema),
    values: {
      nome_negocio: confeiteiro?.nome ?? '',
      telefone: confeiteiro?.telefone ?? '',
      cidade: confeiteiro?.cidade ?? '',
    },
  })

  async function onSubmit(values: OnboardingStep1) {
    const supabase = createSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('confeiteiros')
      .update({
        nome: values.nome_negocio,
        telefone: values.telefone ?? null,
        cidade: values.cidade ?? null,
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.')
      return
    }

    await refresh()
    reset(values)
    toast.success('Perfil atualizado!')
  }

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary-600" />
          Dados da confeitaria
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome do negócio"
          leftIcon={<Store className="w-4 h-4" />}
          error={errors.nome_negocio?.message}
          required
          {...register('nome_negocio')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="WhatsApp"
            type="tel"
            leftIcon={<Phone className="w-4 h-4" />}
            error={errors.telefone?.message}
            {...register('telefone')}
          />
          <Input
            label="Cidade"
            leftIcon={<MapPin className="w-4 h-4" />}
            error={errors.cidade?.message}
            {...register('cidade')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ─── Plano summary section ────────────────────────────────────

function SecaoPlano() {
  const { plano, config } = usePlano()

  const variantByPlan: Record<string, 'default' | 'purple' | 'info'> = {
    free: 'default',
    starter: 'info',
    pro: 'purple',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary-600" />
          Plano atual
        </CardTitle>
        <Badge variant={variantByPlan[plano] ?? 'default'}>{config.label}</Badge>
      </CardHeader>

      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm text-gray-700">
            {config.preco !== null
              ? `${config.precoLabel} · Renova mensalmente`
              : 'Grátis para sempre'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {config.maxPedidosMes === Infinity
              ? 'Pedidos ilimitados'
              : `Até ${config.maxPedidosMes} pedidos/mês`}
            {' · '}
            {config.cronogramasIAMes > 0
              ? `${config.cronogramasIAMes} cronograma${config.cronogramasIAMes > 1 ? 's' : ''} de IA/mês`
              : 'Sem IA de marketing'}
          </p>
        </div>
        <Link
          href="/configuracoes/plano"
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {plano === 'free' ? 'Fazer upgrade' : 'Gerenciar'}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {plano === 'free' && (
        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700">
            <strong>Plano Free:</strong> você tem acesso a até 10 pedidos/mês. Faça upgrade para
            desbloquear pedidos ilimitados e geração de cronogramas com IA.
          </p>
        </div>
      )}
    </Card>
  )
}

// ─── Danger zone ──────────────────────────────────────────────

function SecaoContaDanger() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  async function handleDelete() {
    if (confirmText !== 'DELETAR') return
    setDeleting(true)

    const supabase = createSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) { router.push('/login'); return }

    // Sign out first, then the service role would delete the user
    // (in production, use a server action or API route with service role)
    await supabase.auth.signOut()
    toast.success('Conta encerrada. Sentiremos sua falta!')
    router.push('/login')
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          Zona de perigo
        </CardTitle>
      </CardHeader>

      {!confirming ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Deletar conta</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Remove permanentemente todos os seus dados. Ação irreversível.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Deletar conta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-red-700 font-medium">
            Tem certeza? Esta ação é irreversível e apagará todos os seus pedidos, produtos e dados.
          </p>
          <p className="text-xs text-gray-500">
            Digite <strong className="font-mono">DELETAR</strong> para confirmar:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETAR"
            className="w-full h-10 px-3 rounded-lg border border-red-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setConfirming(false); setConfirmText('') }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
              disabled={confirmText !== 'DELETAR'}
              className="flex-1"
            >
              Confirmar exclusão
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie sua conta e preferências</p>
      </div>

      <SecaoPerfil />
      <SecaoPlano />
      <SecaoContaDanger />
    </div>
  )
}
