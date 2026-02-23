'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Store,
  Phone,
  MapPin,
  Link2,
  Package,
  Plus,
  Trash2,
  Calculator,
  CheckCircle,
  Globe,
  ChevronRight,
  ChevronLeft,
  Copy,
  Clock,
  TrendingUp,
  AlertTriangle,
  Zap,
} from 'lucide-react'
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  type OnboardingStep1,
  type OnboardingStep2,
  type OnboardingStep3,
} from '../schemas/auth.schema'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { cn, formatCurrency } from '@/shared/lib/utils'

// ─── Slug generation ─────────────────────────────────────────────────────────

function gerarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

// ─── Aha! moment calculation ─────────────────────────────────────────────────

interface AhaResult {
  custo_total: number
  margem_pct: number
  preco_sugerido: number
}

function calcularAha(
  ingredientes: OnboardingStep2['ingredientes'],
  preco_venda: number,
  rendimento: number
): AhaResult {
  const custo_ingredientes = ingredientes.reduce(
    (acc, ing) => acc + ing.quantidade * ing.preco_por_unidade,
    0
  )
  const custo_total = custo_ingredientes / Math.max(rendimento, 1)
  const margem_pct =
    preco_venda > 0 ? ((preco_venda - custo_total) / preco_venda) * 100 : -Infinity
  const preco_sugerido = custo_total / 0.3

  return { custo_total, margem_pct, preco_sugerido }
}

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Negócio', icon: '🏪' },
  { label: 'Produto', icon: '🍫' },
  { label: 'Entregas', icon: '🚚' },
  { label: 'Menu', icon: '🌐' },
  { label: 'Plano', icon: '🚀' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((step, i) => {
          const idx = i + 1
          const done = idx < current
          const active = idx === current
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  done && 'bg-green-500 text-white',
                  active && 'bg-primary-600 text-white ring-4 ring-primary-100',
                  !done && !active && 'bg-gray-100 text-gray-400'
                )}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : <span>{step.icon}</span>}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  active ? 'text-primary-700' : 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full mt-1">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${((current - 1) / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right">
        Passo {current} de {STEPS.length}
      </p>
    </div>
  )
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [s1Data, setS1Data] = useState<OnboardingStep1 | null>(null)
  const [ahaResult, setAhaResult] = useState<AhaResult | null>(null)

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  function goBack() {
    setStep((s) => Math.max(1, s - 1))
  }

  if (step === 1)
    return (
      <>
        <StepIndicator current={1} />
        <Step1
          userId={userId}
          onDone={(data) => {
            setS1Data(data)
            setStep(2)
          }}
        />
      </>
    )

  if (step === 2)
    return (
      <>
        <StepIndicator current={2} />
        <Step2
          userId={userId}
          onDone={(result) => {
            setAhaResult(result)
            setStep(3)
          }}
          onBack={goBack}
        />
      </>
    )

  if (step === 3)
    return (
      <>
        <StepIndicator current={3} />
        <Step3 userId={userId} onDone={() => setStep(4)} onBack={goBack} />
      </>
    )

  if (step === 4)
    return (
      <>
        <StepIndicator current={4} />
        <Step4
          slug={s1Data?.slug ?? ''}
          userId={userId}
          onDone={() => setStep(5)}
          onBack={goBack}
        />
      </>
    )

  return (
    <>
      <StepIndicator current={5} />
      <Step5 ahaResult={ahaResult} userId={userId} onBack={goBack} />
    </>
  )
}

// ─── Step 1: Dados da confeitaria ────────────────────────────────────────────

function Step1({
  userId,
  onDone,
}: {
  userId: string | null
  onDone: (data: OnboardingStep1) => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingStep1>({
    resolver: zodResolver(onboardingStep1Schema),
    defaultValues: { slug: '' },
  })

  const nomeWatch = watch('nome')
  const slugWatch = watch('slug') ?? ''

  useEffect(() => {
    if (nomeWatch) {
      setValue('slug', gerarSlug(nomeWatch), { shouldValidate: false })
    }
  }, [nomeWatch, setValue])

  async function onSubmit(values: OnboardingStep1) {
    if (!userId) return

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from('confeitarias')
      .update({
        nome: values.nome,
        slug: values.slug,
        telefone: values.telefone || null,
        cidade: values.cidade || null,
      })
      .eq('id', userId)

    if (error) {
      if (error.code === '23505') {
        toast.error('Esse endereço já está em uso. Escolha outro.')
        return
      }
      toast.error('Erro ao salvar. Tente novamente.')
      return
    }

    onDone(values)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Sua doceria</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Como você quer que seus clientes te conheçam?
        </p>
      </div>

      <Input
        label="Nome do negócio"
        placeholder="Ex: Doceria da Maria"
        leftIcon={<Store className="w-4 h-4" />}
        error={errors.nome?.message}
        required
        {...register('nome')}
      />

      {/* Slug with prefix overlay */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Link2 className="w-3.5 h-3.5 text-gray-400" />
          Endereço público
          <span className="text-xs font-normal text-gray-400 ml-1">(automático)</span>
        </label>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
          <span className="bg-gray-50 border-r border-gray-300 px-2 py-2.5 text-xs text-gray-400 whitespace-nowrap select-none">
            doceriapro.com/menu/
          </span>
          <input
            {...register('slug')}
            placeholder="minha-doceria"
            className={cn(
              'flex-1 h-10 px-2.5 text-sm bg-white text-gray-900 focus:outline-none',
              errors.slug && 'bg-red-50'
            )}
          />
        </div>
        {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
        {!errors.slug && slugWatch && (
          <p className="text-xs text-gray-500">✓ Seu cardápio: doceriapro.com/menu/{slugWatch}</p>
        )}
      </div>

      <Input
        label="WhatsApp"
        type="tel"
        placeholder="(11) 99999-9999"
        leftIcon={<Phone className="w-4 h-4" />}
        error={errors.telefone?.message}
        {...register('telefone')}
      />

      <Input
        label="Cidade"
        placeholder="São Paulo, SP"
        leftIcon={<MapPin className="w-4 h-4" />}
        error={errors.cidade?.message}
        {...register('cidade')}
      />

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full mt-2">
        Continuar
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </form>
  )
}

// ─── Step 2: Primeiro produto + Aha! moment ──────────────────────────────────

const UNIDADES = ['kg', 'g', 'l', 'ml', 'un', 'cx', 'pct'] as const
const CATEGORIAS = [
  { value: 'trufa', label: 'Trufas' },
  { value: 'bombom', label: 'Bombons' },
  { value: 'bolo', label: 'Bolos' },
  { value: 'kit', label: 'Kits' },
  { value: 'cookie', label: 'Cookies' },
  { value: 'outro', label: 'Outro' },
] as const

function Step2({
  userId,
  onDone,
  onBack,
}: {
  userId: string | null
  onDone: (result: AhaResult) => void
  onBack: () => void
}) {
  const [calculating, setCalculating] = useState(false)
  const [aha, setAha] = useState<AhaResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useForm<OnboardingStep2>({
    resolver: zodResolver(onboardingStep2Schema),
    defaultValues: {
      produto_categoria: 'trufa',
      produto_rendimento: 1,
      ingredientes: [{ nome: '', quantidade: 1, unidade: 'g', preco_por_unidade: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ingredientes' })

  async function handleCalcular() {
    const values = watch()
    const price = Number(values.produto_preco)
    const rend = Number(values.produto_rendimento) || 1
    const ings = values.ingredientes ?? []

    if (!price || ings.length === 0 || !ings[0].nome) {
      toast.error('Preencha o preço e pelo menos um ingrediente.')
      return
    }

    setCalculating(true)
    setAha(null)
    setSavedOk(false)

    // Intentional suspense — the reveal IS the Aha! moment
    await new Promise((r) => setTimeout(r, 1600))

    const result = calcularAha(ings, price, rend)
    setAha(result)
    setCalculating(false)
  }

  async function handleSalvar() {
    const values = watch()
    if (!aha || !userId) return

    setSaving(true)
    const supabase = createSupabaseBrowserClient()

    try {
      const ingRows = values.ingredientes.map((ing) => ({
        confeitaria_id: userId,
        nome: ing.nome,
        unidade: ing.unidade,
        preco_atual: ing.preco_por_unidade,
      }))

      const { data: ingData, error: ingErr } = await supabase
        .from('ingredientes_catalogo')
        .upsert(ingRows, { onConflict: 'confeitaria_id,nome', ignoreDuplicates: false })
        .select('id, nome')

      if (ingErr) throw ingErr

      const { data: prodData, error: prodErr } = await supabase
        .from('produtos')
        .insert({
          confeitaria_id: userId,
          nome: values.produto_nome,
          preco_venda: values.produto_preco,
          categoria: values.produto_categoria,
          rendimento: values.produto_rendimento ?? 1,
          custo_calculado: aha.custo_total,
          ativo: true,
        })
        .select('id')
        .single()

      if (prodErr) throw prodErr

      if (ingData && prodData) {
        const links = values.ingredientes.map((ing) => {
          const cat = ingData.find((r) => r.nome === ing.nome)
          return {
            produto_id: prodData.id,
            ingrediente_id: cat!.id,
            quantidade: ing.quantidade,
          }
        })
        const { error: linkErr } = await supabase.from('produtos_ingredientes').insert(links)
        if (linkErr) throw linkErr
      }

      setSavedOk(true)
      toast.success('Produto salvo! 🎉')
      onDone(aha)
    } catch {
      toast.error('Erro ao salvar produto. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const margemColor =
    !aha ? '' : aha.margem_pct < 0 ? 'text-red-600' : aha.margem_pct < 40 ? 'text-yellow-600' : 'text-green-600'

  const margemBg =
    !aha ? '' : aha.margem_pct < 0 ? 'bg-red-50 border-red-200' : aha.margem_pct < 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'

  const margemMsg =
    !aha ? '' : aha.margem_pct < 0
      ? 'Você está vendendo no prejuízo!'
      : aha.margem_pct < 40
      ? 'Margem baixa — você pode cobrar mais.'
      : 'Ótima margem! Continue assim.'

  const MargemIcon = !aha
    ? null
    : aha.margem_pct < 0
    ? AlertTriangle
    : aha.margem_pct < 40
    ? TrendingUp
    : Zap

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Seu primeiro produto</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Vamos calcular o custo real e descobrir sua margem de lucro.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input
            label="Nome do produto"
            placeholder="Ex: Trufa de Chocolate"
            leftIcon={<Package className="w-4 h-4" />}
            error={errors.produto_nome?.message}
            required
            {...register('produto_nome')}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Categoria <span className="text-red-500">*</span>
          </label>
          <select
            {...register('produto_categoria')}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Preço de venda (R$)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          error={errors.produto_preco?.message}
          required
          {...register('produto_preco')}
        />

        <div className="col-span-2">
          <Input
            label="Rendimento (unidades por receita)"
            type="number"
            min="1"
            placeholder="1"
            hint="Ex: 1 receita = 30 trufas"
            error={errors.produto_rendimento?.message}
            {...register('produto_rendimento')}
          />
        </div>
      </div>

      {/* Dynamic ingredient rows */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Ingredientes <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() =>
              append({ nome: '', quantidade: 1, unidade: 'g', preco_por_unidade: 0 })
            }
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        </div>

        <div className="text-[10px] text-gray-400 grid grid-cols-[1fr_52px_44px_64px_24px] gap-1.5 mb-1 px-0.5">
          <span>Nome</span>
          <span className="text-center">Qtd</span>
          <span className="text-center">Un</span>
          <span className="text-center">R$/un</span>
          <span />
        </div>

        <div className="space-y-1.5">
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-[1fr_52px_44px_64px_24px] gap-1.5 items-center">
              <input
                {...register(`ingredientes.${i}.nome`)}
                placeholder="Ex: Chocolate"
                className="h-9 px-2.5 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0"
              />
              <input
                {...register(`ingredientes.${i}.quantidade`)}
                type="number"
                step="0.001"
                min="0.001"
                placeholder="100"
                className="h-9 px-1.5 rounded-md border border-gray-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                {...register(`ingredientes.${i}.unidade`)}
                className="h-9 px-1 rounded-md border border-gray-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input
                {...register(`ingredientes.${i}.preco_por_unidade`)}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="h-9 px-1.5 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {fields.length > 1 ? (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="h-6 w-6 flex items-center justify-center text-gray-300 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Calculate button */}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        loading={calculating}
        onClick={handleCalcular}
        leftIcon={<Calculator className="w-4 h-4" />}
      >
        {calculating ? 'Calculando seu lucro…' : 'Calcular minha margem'}
      </Button>

      {/* Aha! moment reveal */}
      {aha && !calculating && (
        <div
          className={cn(
            'rounded-xl border-2 p-4 space-y-3',
            margemBg
          )}
        >
          <div className="flex items-center gap-2">
            {MargemIcon && <MargemIcon className={cn('w-5 h-5', margemColor)} />}
            <span className={cn('font-semibold text-sm', margemColor)}>{margemMsg}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-lg p-2.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Custo</p>
              <p className="text-base font-bold text-gray-900">{formatCurrency(aha.custo_total)}</p>
            </div>
            <div className={cn('rounded-lg p-2.5 border', margemBg)}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Margem</p>
              <p className={cn('text-base font-bold', margemColor)}>
                {isFinite(aha.margem_pct) ? `${aha.margem_pct.toFixed(0)}%` : '—'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Ideal 70%</p>
              <p className="text-base font-bold text-green-700">{formatCurrency(aha.preco_sugerido)}</p>
            </div>
          </div>

          {isFinite(aha.margem_pct) && aha.margem_pct < 40 && (
            <p className="text-xs text-gray-600 bg-white rounded-lg p-2.5 border border-gray-100">
              💡 Para 70% de margem, seu preço ideal é{' '}
              <strong>{formatCurrency(aha.preco_sugerido)}</strong>. No Doceria Pro você
              acompanha isso para todos os produtos.
            </p>
          )}

          {!savedOk ? (
            <Button
              type="button"
              className="w-full"
              loading={saving}
              onClick={handleSalvar}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Guardar este cálculo
            </Button>
          ) : (
            <div className="flex items-center gap-2 justify-center text-green-700 text-sm font-medium py-1">
              <CheckCircle className="w-4 h-4" />
              Produto salvo com sucesso!
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onBack} leftIcon={<ChevronLeft className="w-4 h-4" />}>
          Voltar
        </Button>
        <Button
          type="button"
          variant={aha ? 'primary' : 'outline'}
          className="flex-1"
          onClick={() => onDone(aha ?? { custo_total: 0, margem_pct: 0, preco_sugerido: 0 })}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          {aha ? 'Continuar' : 'Pular por agora'}
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3: Entregas & atendimento ──────────────────────────────────────────

function Step3({
  userId,
  onDone,
  onBack,
}: {
  userId: string | null
  onDone: () => void
  onBack: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingStep3>({
    resolver: zodResolver(onboardingStep3Schema),
    defaultValues: { prazo_padrao_dias: 3 },
  })

  async function onSubmit(values: OnboardingStep3) {
    if (!userId) return

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from('confeitarias')
      .update({
        area_entrega: values.area_entrega || null,
        prazo_padrao_dias: values.prazo_padrao_dias,
        horarios_atendimento: values.horarios_atendimento || null,
      })
      .eq('id', userId)

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.')
      return
    }

    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Entregas e atendimento</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Informe onde e quando você atende seus clientes.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Área de entrega
        </label>
        <textarea
          {...register('area_entrega')}
          rows={2}
          placeholder="Ex: Entrego nos bairros Centro, Jardins e Vila Madalena"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <Input
        label="Prazo padrão de entrega (dias)"
        type="number"
        min="0"
        max="30"
        leftIcon={<Clock className="w-4 h-4" />}
        hint="Antecedência mínima que o cliente deve pedir"
        error={errors.prazo_padrao_dias?.message}
        {...register('prazo_padrao_dias')}
      />

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Horários de atendimento
        </label>
        <textarea
          {...register('horarios_atendimento')}
          rows={2}
          placeholder="Ex: Seg a Sex das 9h às 18h. Pedidos via WhatsApp."
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onBack} leftIcon={<ChevronLeft className="w-4 h-4" />}>
          Voltar
        </Button>
        <Button type="submit" loading={isSubmitting} className="flex-1" rightIcon={<ChevronRight className="w-4 h-4" />}>
          Continuar
        </Button>
      </div>
    </form>
  )
}

// ─── Step 4: Cardápio público ─────────────────────────────────────────────────

function Step4({
  slug,
  userId,
  onDone,
  onBack,
}: {
  slug: string
  userId: string | null
  onDone: () => void
  onBack: () => void
}) {
  const [activating, setActivating] = useState(false)
  const [copied, setCopied] = useState(false)

  const menuUrl = `https://doceriapro.com/menu/${slug || 'minha-doceria'}`

  async function handleActivate() {
    if (!userId) return
    setActivating(true)

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from('confeitarias')
      .update({ menu_publico_ativo: true })
      .eq('id', userId)

    setActivating(false)

    if (error) {
      toast.error('Erro ao ativar cardápio. Tente novamente.')
      return
    }

    toast.success('Cardápio online ativado! 🎉')
    onDone()
  }

  function handleCopy() {
    navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent(`Olá! Veja meu cardápio online: ${menuUrl} 🎂`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Seu cardápio online</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Compartilhe com seus clientes e receba pedidos pelo WhatsApp.
        </p>
      </div>

      <div className="bg-gradient-to-br from-primary-50 to-orange-50 rounded-2xl p-5 border border-primary-100 text-center space-y-3">
        <Globe className="w-10 h-10 text-primary-500 mx-auto" />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Seu endereço público</p>
          <p className="text-sm font-semibold text-gray-800 mt-1 break-all">{menuUrl}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCopy}
            leftIcon={<Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={handleWhatsApp}
          >
            📱 WhatsApp
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack} leftIcon={<ChevronLeft className="w-4 h-4" />}>
          Voltar
        </Button>
        <Button
          type="button"
          className="flex-1"
          loading={activating}
          onClick={handleActivate}
          leftIcon={<Globe className="w-4 h-4" />}
        >
          Ativar meu cardápio
        </Button>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
      >
        Pular por agora
      </button>
    </div>
  )
}

// ─── Step 5: Plano ────────────────────────────────────────────────────────────

const PLANOS = [
  {
    key: 'free' as const,
    nome: 'Gratuito',
    preco: 'R$0/mês',
    descricao: 'Até 10 pedidos/mês',
    cor: 'border-gray-200 bg-white',
    badge: null,
  },
  {
    key: 'starter' as const,
    nome: 'Starter',
    preco: 'R$49/mês',
    descricao: 'Pedidos ilimitados + 1 cronograma IA/mês',
    cor: 'border-primary-300 bg-primary-50',
    badge: '⭐ Mais popular',
  },
  {
    key: 'pro' as const,
    nome: 'Pro',
    preco: 'R$99/mês',
    descricao: 'Tudo do Starter + 3 cronogramas IA + relatórios avançados',
    cor: 'border-orange-300 bg-orange-50',
    badge: '🚀 Melhor custo-benefício',
  },
] as const

function Step5({
  ahaResult,
  userId,
  onBack,
}: {
  ahaResult: AhaResult | null
  userId: string | null
  onBack: () => void
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<'free' | 'starter' | 'pro'>('starter')
  const [finishing, setFinishing] = useState(false)

  const anchoringMsg =
    ahaResult && isFinite(ahaResult.margem_pct) && ahaResult.margem_pct > 0
      ? `Com ${ahaResult.margem_pct.toFixed(0)}% de margem, 100 pedidos/mês = ${formatCurrency(
          (ahaResult.preco_sugerido - ahaResult.custo_total) * 100
        )} de lucro. O Starter se paga com menos de 1 pedido.`
      : 'Doceiras Pro faturam em média 3× mais por gerir preços e pedidos com dados reais.'

  async function handleFinish() {
    if (!userId) return
    setFinishing(true)

    const supabase = createSupabaseBrowserClient()

    // Mark onboarding complete (middleware reads confeitarias)
    await supabase
      .from('confeitarias')
      .update({ onboarding_completo: true })
      .eq('id', userId)

    // Also keep confeiteiros in sync for backward compat
    await supabase
      .from('confeiteiros')
      .update({ onboarding_completo: true })
      .eq('id', userId)

    if (selected === 'free') {
      toast.success('Sua doceria está pronta! Bem-vinda ao Doceria Pro 🎂')
      router.push('/dashboard')
      return
    }

    try {
      const resp = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: selected }),
      })
      const { url } = await resp.json()
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL')
      }
    } catch {
      toast.error('Erro ao redirecionar para pagamento. Tente novamente.')
      setFinishing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Escolha seu plano</h2>
        <p className="text-sm text-gray-500 mt-0.5">Você pode mudar a qualquer momento.</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
        💰 {anchoringMsg}
      </div>

      <div className="space-y-2">
        {PLANOS.map((plano) => (
          <button
            key={plano.key}
            type="button"
            onClick={() => setSelected(plano.key)}
            className={cn(
              'w-full text-left rounded-xl border-2 p-3.5 transition-all',
              plano.cor,
              selected === plano.key
                ? 'ring-2 ring-primary-500 ring-offset-1'
                : 'hover:border-gray-300'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900">{plano.nome}</span>
                  {plano.badge && (
                    <span className="text-[10px] bg-white border border-primary-200 px-1.5 py-0.5 rounded-full text-primary-700">
                      {plano.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{plano.descricao}</p>
              </div>
              <p className="text-sm font-bold text-gray-900 shrink-0">{plano.preco}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onBack} leftIcon={<ChevronLeft className="w-4 h-4" />}>
          Voltar
        </Button>
        <Button
          type="button"
          className="flex-1"
          loading={finishing}
          onClick={handleFinish}
        >
          {selected === 'free'
            ? 'Entrar no Doceria Pro'
            : `Assinar plano ${selected === 'starter' ? 'Starter' : 'Pro'}`}
        </Button>
      </div>

      <p className="text-center text-[10px] text-gray-400">
        Planos pagos com 7 dias de garantia. Cancele quando quiser.
      </p>
    </div>
  )
}
