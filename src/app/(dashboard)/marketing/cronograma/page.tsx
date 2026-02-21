'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Package, Sparkles, ListChecks } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { DatePickerDatas } from '@/features/marketing/components/DatePickerDatas'
import { CalendarioMarketing } from '@/features/marketing/components/CalendarioMarketing'
import { PostCard } from '@/features/marketing/components/PostCard'
import { BotaoGerar } from '@/features/marketing/components/BotaoGerar'
import {
  useCronogramaDoMes,
  useGerarCronogramaMarketing,
  useProdutosMarketing,
} from '@/features/marketing/hooks/useCronogramaMarketing'
import {
  getDatasComemorativasBr,
  MESES_PT,
} from '@/features/marketing/types/marketing.types'
import type { DataComemorativaBr, MarketingPostRico } from '@/features/marketing/types/marketing.types'
import { cn } from '@/shared/lib/utils'

// ─── Month/Year navigator ─────────────────────────────────────

function MesNavigator({
  mes, ano, onChange,
}: {
  mes: number; ano: number; onChange: (mes: number, ano: number) => void
}) {
  const prev = () => {
    if (mes === 1) onChange(12, ano - 1)
    else onChange(mes - 1, ano)
  }
  const next = () => {
    if (mes === 12) onChange(1, ano + 1)
    else onChange(mes + 1, ano)
  }
  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-base font-semibold text-gray-900 min-w-[130px] text-center">
        {MESES_PT[mes - 1]} {ano}
      </span>
      <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              i < current
                ? 'bg-primary-600 text-white'
                : i === current
                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-400'
                : 'bg-gray-100 text-gray-400'
            )}
          >
            {i < current ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={cn('h-0.5 w-6', i < current ? 'bg-primary-400' : 'bg-gray-200')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────

const STEPS = ['Mês', 'Datas', 'Produtos', 'Gerar']

export default function CronogramaPage() {
  const now = new Date()
  const [mes, setMes]     = useState(now.getMonth() + 1)
  const [ano, setAno]     = useState(now.getFullYear())
  const [step, setStep]   = useState(0)

  const [datasEspeciais, setDatasEspeciais] = useState<DataComemorativaBr[]>([])
  const [produtosSel, setProdutosSel]       = useState<string[]>([])

  // Data
  const { data: cronograma, isLoading: loadingCronograma } = useCronogramaDoMes(mes, ano)
  const { data: produtos = [], isLoading: loadingProdutos } = useProdutosMarketing()
  const { mutate: gerar, isPending: gerando } = useGerarCronogramaMarketing()

  // Re-calculate holidays when month/year change
  const datasDisponiveis = useMemo(
    () => getDatasComemorativasBr(mes, ano),
    [mes, ano]
  )

  // Clear selections when month changes
  const handleMesChange = (novoMes: number, novoAno: number) => {
    setMes(novoMes)
    setAno(novoAno)
    setDatasEspeciais([])
    setStep(0)
  }

  const toggleData = (d: DataComemorativaBr) => {
    setDatasEspeciais((prev) =>
      prev.some((s) => s.data === d.data)
        ? prev.filter((s) => s.data !== d.data)
        : [...prev, d]
    )
  }

  const toggleProduto = (nome: string) => {
    setProdutosSel((prev) =>
      prev.includes(nome) ? prev.filter((p) => p !== nome) : [...prev, nome]
    )
  }

  const handleGerar = () => {
    gerar(
      { mes, ano, datas_especiais: datasEspeciais, produtos: produtosSel },
      { onSuccess: () => setStep(3) }  // stay on gerar step (calendar shows below)
    )
  }

  const posts = (cronograma?.conteudo ?? []) as MarketingPostRico[]
  const postsEspeciais = posts.filter((p) => p.data_comemorativa)
  const postsRegulares = posts.filter((p) => !p.data_comemorativa)

  // Estimated post count for BotaoGerar
  const estimatedPosts = Math.ceil(new Date(ano, mes, 0).getDate() / 7) + datasEspeciais.length

  return (
    <div className="space-y-6 pb-12">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-600" />
            Cronograma de Marketing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gere posts personalizados com IA para cada mês, incluindo datas comemorativas.
          </p>
        </div>
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left panel: controls ─────────────────────── */}
        <div className="space-y-4">
          {/* Step 0: Month/year */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-600" />
                1. Selecione o mês
              </CardTitle>
            </CardHeader>
            <div className="flex items-center justify-between">
              <MesNavigator mes={mes} ano={ano} onChange={handleMesChange} />
              {step === 0 && (
                <Button size="sm" onClick={() => setStep(1)}>
                  Próximo
                </Button>
              )}
            </div>
          </Card>

          {/* Step 1: Holidays */}
          {step >= 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  2. Datas comemorativas
                </CardTitle>
              </CardHeader>
              <DatePickerDatas
                datasDisponiveis={datasDisponiveis}
                selecionadas={datasEspeciais}
                onToggle={toggleData}
              />
              {step === 1 && (
                <div className="mt-4 flex justify-end">
                  <Button size="sm" onClick={() => setStep(2)}>
                    Próximo
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Step 2: Products */}
          {step >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-600" />
                  3. Produtos em destaque
                </CardTitle>
              </CardHeader>

              {loadingProdutos ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : produtos.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhum produto cadastrado. A IA usará seus produtos habituais.
                </p>
              ) : (
                <div className="space-y-2">
                  {produtos.map((p) => (
                    <label key={p.id} className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors select-none text-sm',
                      produtosSel.includes(p.nome)
                        ? 'bg-primary-50 border-primary-300 text-primary-800'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                    )}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary-600 shrink-0"
                        checked={produtosSel.includes(p.nome)}
                        onChange={() => toggleProduto(p.nome)}
                      />
                      {p.nome}
                    </label>
                  ))}
                  {produtosSel.length > 0 && (
                    <p className="text-xs text-primary-600 font-medium pt-1">
                      {produtosSel.length} {produtosSel.length === 1 ? 'produto selecionado' : 'produtos selecionados'}
                    </p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="mt-4 flex justify-end">
                  <Button size="sm" onClick={() => setStep(3)}>
                    Próximo
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Step 3: Generate */}
          {step >= 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary-600" />
                  4. Gerar cronograma
                </CardTitle>
              </CardHeader>

              {/* Summary */}
              <div className="text-xs text-gray-600 space-y-1 mb-4 bg-gray-50 rounded-lg p-3">
                <p><span className="font-medium">Mês:</span> {MESES_PT[mes - 1]} / {ano}</p>
                <p>
                  <span className="font-medium">Datas especiais:</span>{' '}
                  {datasEspeciais.length > 0 ? datasEspeciais.map((d) => d.nome).join(', ') : 'Nenhuma'}
                </p>
                <p>
                  <span className="font-medium">Produtos:</span>{' '}
                  {produtosSel.length > 0 ? produtosSel.join(', ') : 'Habituais'}
                </p>
                <p>
                  <span className="font-medium">Posts estimados:</span> ~{estimatedPosts}
                </p>
              </div>

              <BotaoGerar
                onClick={handleGerar}
                loading={gerando}
                postCount={estimatedPosts}
              />
            </Card>
          )}
        </div>

        {/* ── Right panel: calendar / results ──────────── */}
        <div className="lg:col-span-2">
          {loadingCronograma ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {/* Calendar view */}
              <Card>
                <CardHeader>
                  <CardTitle>Calendário — {MESES_PT[mes - 1]} {ano}</CardTitle>
                  <span className="text-xs text-gray-400">{posts.length} posts gerados</span>
                </CardHeader>
                <CalendarioMarketing mes={mes} ano={ano} posts={posts} />
              </Card>

              {/* Special posts */}
              {postsEspeciais.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Posts de datas especiais
                  </h2>
                  {postsEspeciais.map((p, i) => (
                    <PostCard key={i} post={p} isSpecial />
                  ))}
                </div>
              )}

              {/* Regular weekly posts */}
              {postsRegulares.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-700">Posts semanais</h2>
                  {postsRegulares.map((p, i) => (
                    <PostCard key={i} post={p} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar className="w-12 h-12 text-gray-200 mb-4" />
              <p className="font-medium text-gray-700">Nenhum cronograma para {MESES_PT[mes - 1]} {ano}</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                Siga os passos ao lado para gerar seu cronograma de conteúdo com IA.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
