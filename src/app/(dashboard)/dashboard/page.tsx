import { Suspense } from 'react'
import { createSupabaseServerClient } from '@/server/db/client'
import { KPIGrid }           from '@/features/dashboard/components/KPIGrid'
import { ParaFazerHoje }     from '@/features/dashboard/components/ParaFazerHoje'
import { Sparkline }         from '@/features/dashboard/components/Sparkline'
import { ProximosPedidos }   from '@/features/dashboard/components/ProximosPedidos'
import { SugestaoIA }        from '@/features/dashboard/components/SugestaoIA'
import {
  KPISkeleton,
  ParaFazerSkeleton,
  SparklineSkeleton,
  ProximosPedidosSkeleton,
  SugestaoSkeleton,
} from '@/features/dashboard/components/DashboardSkeletons'
import {
  getKPIs,
  getParaFazerHoje,
  getSparkline,
  getProximosPedidos,
  getSugestaoIA,
} from '@/features/dashboard/lib/dashboardData'

// Revalidate every 5 minutes (ISR)
export const revalidate = 300

// ─── Async section components (each independently streamed) ───

async function KPISection({ userId }: { userId: string }) {
  const data = await getKPIs(userId)
  return <KPIGrid data={data} />
}

async function ParaFazerSection({ userId }: { userId: string }) {
  const data = await getParaFazerHoje(userId)
  return <ParaFazerHoje data={data} />
}

async function SparklineSection({ userId }: { userId: string }) {
  const points = await getSparkline(userId)
  return <Sparkline points={points} />
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

  // Pedidos amanhã
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)

  const sugestao = await getSugestaoIA({
    pedidosHoje:    hoje.pedidosHoje.length,
    pedidosAmanha:  0,   // fetched separately if needed; keeping lightweight
    faturamentoMes: kpis.faturamento.valor,
    lotesAbertos:   hoje.lotesPendentes.length,
    topProduto:     kpis.topProduto?.nome ?? null,
    margemMedia:    kpis.margemMedia,
    nomePrimeiro:   nome.split(' ')[0],
  })

  return <SugestaoIA sugestao={sugestao} />
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

  const { data: perfil } = await supabase
    .from('confeiteiros')
    .select('nome')
    .eq('id', userId)
    .single()

  const nome = perfil?.nome ?? user!.email ?? 'Confeiteira'

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting(nome)}</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{todayLabel()}</p>
        </div>
      </div>

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

        {/* Left: Para fazer hoje + Sparkline */}
        <div className="space-y-6 lg:col-span-1">
          <Suspense fallback={<ParaFazerSkeleton />}>
            <ParaFazerSection userId={userId} />
          </Suspense>

          <Suspense fallback={<SparklineSkeleton />}>
            <SparklineSection userId={userId} />
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
