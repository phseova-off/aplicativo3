'use client'

import { useState, useEffect } from 'react'
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
  Link2,
  Copy,
  CheckCircle,
  Globe,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react'
import { z } from 'zod'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { useConfeitaria } from '@/features/auth/hooks/useConfeitaria'
import { usePlano } from '@/features/planos/hooks/usePlano'
import { PLANO_CONFIG } from '@/features/planos/lib/planFeatures'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { useRouter } from 'next/navigation'
import { cn } from '@/shared/lib/utils'

// ─── Perfil & Slug section ────────────────────────────────────────────────────

const perfilSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  slug: z
    .string()
    .min(2, 'Slug deve ter no mínimo 2 caracteres')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Só letras minúsculas, números e hífens'),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
})

type PerfilValues = z.infer<typeof perfilSchema>

function SecaoPerfil() {
  const { confeitaria, loading, refresh } = useConfeitaria()
  const [slugCopied, setSlugCopied] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PerfilValues>({
    resolver: zodResolver(perfilSchema),
    values: {
      nome: confeitaria?.nome ?? '',
      slug: confeitaria?.slug ?? '',
      telefone: confeitaria?.telefone ?? '',
      cidade: confeitaria?.cidade ?? '',
    },
  })

  async function onSubmit(values: PerfilValues) {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('confeitarias')
      .update({
        nome: values.nome,
        slug: values.slug,
        telefone: values.telefone || null,
        cidade: values.cidade || null,
      })
      .eq('id', user.id)

    if (error) {
      if (error.code === '23505') {
        toast.error('Esse endereço já está em uso. Escolha outro.')
        return
      }
      toast.error('Erro ao salvar. Tente novamente.')
      return
    }

    await refresh()
    reset(values)
    toast.success('Dados atualizados!')
  }

  function handleCopySlug() {
    const slug = confeitaria?.slug
    if (!slug) return
    navigator.clipboard.writeText(`https://doceriapro.com/menu/${slug}`)
    setSlugCopied(true)
    setTimeout(() => setSlugCopied(false), 2000)
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
          error={errors.nome?.message}
          required
          {...register('nome')}
        />

        {/* Slug with prefix */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5 text-gray-400" />
            Endereço público (cardápio)
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
            <span className="bg-gray-50 border-r border-gray-300 px-2 py-2.5 text-xs text-gray-400 whitespace-nowrap select-none">
              doceriapro.com/menu/
            </span>
            <input
              {...register('slug')}
              className={cn(
                'flex-1 h-10 px-2.5 text-sm bg-white text-gray-900 focus:outline-none',
                errors.slug && 'bg-red-50'
              )}
            />
          </div>
          {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
          {confeitaria?.slug && (
            <button
              type="button"
              onClick={handleCopySlug}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 w-fit"
            >
              {slugCopied ? (
                <><CheckCircle className="w-3 h-3" /> Link copiado!</>
              ) : (
                <><Copy className="w-3 h-3" /> Copiar link do cardápio</>
              )}
            </button>
          )}
        </div>

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

// ─── Plano summary section ────────────────────────────────────────────────────

function SecaoPlano() {
  const { plano, config } = usePlano()
  const { confeitaria, pedidosPct, cronogramasPct } = useConfeitaria()

  const variantByPlan: Record<string, 'default' | 'purple' | 'info'> = {
    free: 'default',
    starter: 'info',
    pro: 'purple',
  }

  const pedidosMes = confeitaria?.pedidos_mes_atual ?? 0
  const cronogramasMes = confeitaria?.cronogramas_ia_mes_atual ?? 0
  const maxPedidos = config.maxPedidosMes === Infinity ? null : config.maxPedidosMes
  const maxCronogramas = config.cronogramasIAMes

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary-600" />
          Plano atual
        </CardTitle>
        <Badge variant={variantByPlan[plano] ?? 'default'}>{config.label}</Badge>
      </CardHeader>

      {/* Usage bars */}
      <div className="space-y-3 mb-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pedidos este mês</span>
            <span className={cn('font-medium', pedidosPct >= 80 ? 'text-amber-600' : 'text-gray-900')}>
              {pedidosMes} / {maxPedidos === null ? '∞' : maxPedidos}
            </span>
          </div>
          {maxPedidos !== null && (
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  pedidosPct >= 100 ? 'bg-red-500' : pedidosPct >= 80 ? 'bg-amber-400' : 'bg-primary-500'
                )}
                style={{ width: `${pedidosPct}%` }}
              />
            </div>
          )}
          {maxPedidos === null && (
            <p className="text-xs text-green-600 font-medium">Ilimitado no seu plano</p>
          )}
        </div>

        {maxCronogramas > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cronogramas IA este mês</span>
              <span className={cn('font-medium', cronogramasPct >= 80 ? 'text-amber-600' : 'text-gray-900')}>
                {cronogramasMes} / {maxCronogramas}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  cronogramasPct >= 100 ? 'bg-red-500' : cronogramasPct >= 80 ? 'bg-amber-400' : 'bg-primary-500'
                )}
                style={{ width: `${cronogramasPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <p className="text-sm text-gray-500">
          {config.preco !== null ? `${config.precoLabel} · Renova mensalmente` : 'Grátis para sempre'}
        </p>
        <Link
          href="/configuracoes/plano"
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {plano === 'free' ? 'Fazer upgrade' : 'Gerenciar'}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {pedidosPct >= 80 && maxPedidos !== null && (
        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700">
            <strong>Atenção:</strong> você usou {pedidosPct.toFixed(0)}% do limite de pedidos do mês.{' '}
            <Link href="/configuracoes/plano" className="underline font-medium">
              Faça upgrade
            </Link>{' '}
            para continuar recebendo pedidos sem interrupções.
          </p>
        </div>
      )}
    </Card>
  )
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function SecaoContaDanger() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  async function handleDelete() {
    if (confirmText !== 'DELETAR') return
    setDeleting(true)

    const res = await fetch('/api/conta/deletar', { method: 'POST' })

    if (res.ok) {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      toast.success('Conta encerrada. Sentiremos sua falta!')
      router.push('/login')
    } else {
      toast.error('Erro ao deletar conta. Entre em contato com o suporte.')
      setDeleting(false)
    }
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

// ─── Cardápio Público section ─────────────────────────────────────────────────

function SecaoCardapioPublico() {
  const { confeitaria, loading, refresh } = useConfeitaria()
  const [toggling, setToggling] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)

  const slug = confeitaria?.slug
  const ativo = confeitaria?.menu_publico_ativo ?? false
  const linkPublico = slug ? `${window?.location?.origin ?? 'https://doceriapro.com'}/menu/${slug}` : null

  async function handleToggle() {
    if (!confeitaria || !slug) return
    setToggling(true)
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToggling(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('confeitarias')
      .update({ menu_publico_ativo: !ativo })
      .eq('id', user.id)

    if (error) {
      toast.error('Erro ao atualizar. Tente novamente.')
    } else {
      await refresh()
      toast.success(!ativo ? 'Cardápio público ativado!' : 'Cardápio desativado.')
    }
    setToggling(false)
  }

  async function handleCopyLink() {
    if (!linkPublico) return
    await navigator.clipboard.writeText(linkPublico)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2000)
  }

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary-600" />
          Cardápio Público
        </CardTitle>
        <Badge variant={ativo ? 'success' : 'default'}>{ativo ? 'Ativo' : 'Inativo'}</Badge>
      </CardHeader>

      <p className="text-sm text-gray-500 mb-4">
        Compartilhe um link único do seu cardápio para clientes pedirm via WhatsApp.
        Este é o seu principal canal de crescimento orgânico.
      </p>

      {!slug ? (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700">
            Configure seu endereço público acima antes de ativar o cardápio.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Link preview */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 flex-1 truncate font-mono text-xs">
              /menu/{slug}
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 flex-shrink-0"
            >
              {linkCopiado ? (
                <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Copiado!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copiar</>
              )}
            </button>
            {ativo && linkPublico && (
              <a
                href={linkPublico}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-600 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between gap-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              {ativo ? (
                <Eye className="w-4 h-4 text-green-500" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {ativo ? 'Cardápio visível ao público' : 'Cardápio oculto'}
                </p>
                <p className="text-xs text-gray-400">
                  {ativo
                    ? 'Qualquer pessoa com o link pode ver seus produtos'
                    : 'O link do cardápio não está acessível ainda'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                toggling && 'opacity-60 cursor-not-allowed',
                ativo ? 'bg-primary-600' : 'bg-gray-200'
              )}
              role="switch"
              aria-checked={ativo}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  ativo ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {ativo && (
            <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-xs text-primary-700">
                <strong>Dica:</strong> Compartilhe o link no seu WhatsApp, bio do Instagram e grupos de clientes.
                Cada cliente que abre o cardápio pode indicar para outras pessoas — é o seu loop de crescimento!
              </p>
            </div>
          )}

          <Link
            href="/configuracoes/cardapio-publico"
            className="flex items-center justify-between gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium pt-1"
          >
            <span>Configurações avançadas do cardápio</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie sua conta e preferências</p>
      </div>

      <SecaoPerfil />
      <SecaoCardapioPublico />
      <SecaoPlano />
      <SecaoContaDanger />
    </div>
  )
}
