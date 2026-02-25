import { Suspense } from 'react'
import { createSupabaseServerClient } from '@/server/db/client'
import { UpgradeSuccessToast } from '@/features/planos/components/UpgradeSuccessToast'
import { KPIGrid }           from '@/features/dashboard/components/KPIGrid'
import { GraficoMensal }     from '@/features/dashboard/components/GraficoMensal'
import { ParaFazerHoje }     from '@/features/dashboard/components/ParaFazerHoje'
import { ProximosPedidos }   from '@/features/dashboard/components/ProximosPedidos'
import { SugestaoIA }        from '@/features/dashboard/components/SugestaoIA'
import { AcessoRapido }      from '@/features/dashboard/components/AcessoRapido'
import {
  KPISkeleton,
  GraficoSkeleton,
  ParaFazerSkeleton,
  ProximosPedidosSkeleton,
  SugestaoSkeleton,
  AcessoRapidoSkeleton,
} from '@/features/dashboard/components/DashboardSkeletons'
import {
  getKPIs,
  getGraficoMensal,
  getParaFazerHoje,
  getProximosPedidos,
  getSugestaoIA,
} from '@/features/dashboard/lib/dashboardData'
import type { PlanoTipo } from '@/server/db/types'

// Revalidate every 5 minutes (ISR)
export const revalidate = 300

// ─── Async section components (each independently streamed) ───

async function KPISection({ userId }: { userId: string }) {
  const data = await getKPIs(userId)
  return <KPIGrid data={data} />
}

async function GraficoSection({ userId }: { userId: string }) {
  const data = await getGraficoMensal(userId)
  return <GraficoMensal data={data} />
}

async function ParaFazerSection({ userId }: { userId: string }) {
  const data = await getParaFazerHoje(userId)
  return <ParaFazerHoje data={data} />
}

async function ProximosSection({ userId }: { userId: string }) {
  const pedidos = await getProximosPedidos(userId)
  return <ProximosPedidos pedidos={pedidos} />
}

async function SugestaoSection({ userId, nome }: { userId: string; nome: string }) {
  const [kpis, hoje] = await Promise.all([
    getKPIs(userId),
    getParaFazerHoje(userId),
  ])

  const sugestao = await getSugestaoIA({
    pedidosHoje:    hoje.pedidosHoje.length,
    pedidosAmanha:  0,
    faturamentoMes: kpis.receitaMes.valor,
    lotesAbertos:   hoje.lotesPendentes.length,
    topProduto:     kpis.topProduto?.nome ?? null,
    margemMedia:    kpis.margemMedia,
    nomePrimeiro:   nome.split(' ')[0],
  })

  return <SugestaoIA sugestao={sugestao} />
}

// ─── Plan badge ────────────────────────────────────────────────

const planoBadgeConfig: Record<PlanoTipo, { label: string; cls: string }> = {
  free:    { label: 'Grátis',  cls: 'bg-gray-100 text-gray-600'       },
  starter: { label: 'Starter', cls: 'bg-blue-100 text-blue-700'       },
  pro:     { label: 'Pro',     cls: 'bg-primary-100 text-primary-700' },
}

// ─── Greeting helpers ──────────────────────────────────────────

function greeting(nome: string): string {
  const h = new Date().getHours()
  const first = nome.split(' ')[0]
  if (h < 12) return `Bom dia, ${first}!`
  if (h < 18) return `Boa tarde, ${first}!`
  return `Boa noite, ${first}!`
}

function todayLabel(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Page ──────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // user is guaranteed by the layout redirect; cast is safe
  const userId = user!.id

  // v2: get confeitaria name + plan via confeitaria_membros
  const { data: membro } = await supabase
    .from('confeitaria_membros')
    .select('confeitarias(nome, plano)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confeitaria = (membro as any)?.confeitarias
  const nome  = confeitaria?.nome  ?? user!.email ?? 'Confeiteira'
  const plano = (confeitaria?.plano ?? 'free') as PlanoTipo
  const badge = planoBadgeConfig[plano]

  return (
    <div className="space-y-6 pb-10">

      {/* ── Upgrade success toast (Stripe redirect) ─────── */}
      <Suspense fallback={null}>
        <UpgradeSuccessToast />
      </Suspense>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold text-gray-900">{greeting(nome)}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 capitalize">{todayLabel()}</p>
        </div>
      </div>

      {/* ── Acesso rápido ──────────────────────────────── */}
      <Suspense fallback={<AcessoRapidoSkeleton />}>
        <AcessoRapido />
      </Suspense>

      {/* ── AI Suggestion ──────────────────────────────── */}
      <Suspense fallback={<SugestaoSkeleton />}>
        <SugestaoSection userId={userId} nome={nome} />
      </Suspense>

      {/* ── KPIs ───────────────────────────────────────── */}
      <Suspense fallback={<KPISkeleton />}>
        <KPISection userId={userId} />
      </Suspense>

      {/* ── Main content: 2-col on large ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Para fazer hoje + Gráfico mensal */}
        <div className="space-y-6 lg:col-span-1">
          <Suspense fallback={<ParaFazerSkeleton />}>
            <ParaFazerSection userId={userId} />
          </Suspense>

          <Suspense fallback={<GraficoSkeleton />}>
            <GraficoSection userId={userId} />
          </Suspense>
        </div>

        {/* Right: Próximos pedidos */}
        <div className="lg:col-span-2">
          <Suspense fallback={<ProximosPedidosSkeleton />}>
            <ProximosSection userId={userId} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
