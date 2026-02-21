'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Store,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Package,
  Truck,
  Sparkles,
  Check,
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
import { Select } from '@/shared/components/ui/Select'
import { formatCurrency } from '@/shared/lib/utils'
import type { PlanoTipo, ProdutoCategoria } from '@/server/db/types'

// ─── Types ────────────────────────────────────────────────────

interface WizardData {
  step1: OnboardingStep1 | null
  step2: OnboardingStep2 | null
  step3: OnboardingStep3 | null
  plano: PlanoTipo
}

// ─── Progress Bar ─────────────────────────────────────────────

const STEPS = [
  { label: 'Sua doceria', icon: Store },
  { label: 'Produtos', icon: Package },
  { label: 'Entregas', icon: Truck },
  { label: 'Plano', icon: Sparkles },
]

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((step, i) => {
          const done = i < current
          const active = i === current
          const Icon = step.icon
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center transition-colors
                  ${done ? 'bg-primary-600 text-white' : active ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300' : 'bg-gray-100 text-gray-400'}
                `}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-primary-700' : done ? 'text-primary-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="relative h-1.5 bg-gray-100 rounded-full mt-1">
        <div
          className="absolute left-0 top-0 h-full bg-primary-600 rounded-full transition-all duration-500"
          style={{ width: `${(current / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ─── Step 1: Dados da confeitaria ─────────────────────────────

function Step1({ onNext }: { onNext: (data: OnboardingStep1) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingStep1>({ resolver: zodResolver(onboardingStep1Schema) })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="text-center mb-6">
        <span className="text-4xl block mb-2">🏪</span>
        <h2 className="text-lg font-semibold text-gray-900">Fale sobre sua doceria</h2>
        <p className="text-sm text-gray-500 mt-1">Essas informações aparecem no seu perfil.</p>
      </div>

      <Input
        label="Nome do negócio"
        placeholder="Ex: Doceria da Maria"
        leftIcon={<Store className="w-4 h-4" />}
        error={errors.nome_negocio?.message}
        required
        autoFocus
        {...register('nome_negocio')}
      />
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

      <Button type="submit" className="w-full mt-2">
        Continuar
      </Button>
    </form>
  )
}

// ─── Step 2: Primeiros produtos ───────────────────────────────

const CATEGORIA_OPTIONS = [
  { value: 'trufa',  label: 'Trufas' },
  { value: 'bombom', label: 'Bombons' },
  { value: 'kit',    label: 'Kits' },
  { value: 'outro',  label: 'Outro' },
]

function Step2({
  onNext,
  onBack,
}: {
  onNext: (data: OnboardingStep2) => void
  onBack: () => void
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingStep2>({
    resolver: zodResolver(onboardingStep2Schema),
    defaultValues: {
      produtos: [{ nome: '', preco: 0, categoria: 'outro' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'produtos' })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="text-center mb-6">
        <span className="text-4xl block mb-2">🍫</span>
        <h2 className="text-lg font-semibold text-gray-900">Seu cardápio</h2>
        <p className="text-sm text-gray-500 mt-1">Adicione pelo menos 1 produto para começar.</p>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="bg-gray-50 rounded-xl p-4 space-y-3 relative">
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remover produto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Produto {index + 1}
            </p>
            <Input
              label="Nome do produto"
              placeholder="Ex: Trufa de Brigadeiro"
              error={errors.produtos?.[index]?.nome?.message}
              {...register(`produtos.${index}.nome`)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preço (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                error={errors.produtos?.[index]?.preco?.message}
                {...register(`produtos.${index}.preco`)}
              />
              <Select
                label="Categoria"
                options={CATEGORIA_OPTIONS}
                error={errors.produtos?.[index]?.categoria?.message}
                {...register(`produtos.${index}.categoria`)}
              />
            </div>
          </div>
        ))}
      </div>

      {errors.produtos?.root?.message && (
        <p className="text-xs text-red-600">{errors.produtos.root.message}</p>
      )}

      {fields.length < 5 && (
        <button
          type="button"
          onClick={() => append({ nome: '', preco: 0, categoria: 'outro' })}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Adicionar outro produto
        </button>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button type="submit" className="flex-1">
          Continuar
        </Button>
      </div>
    </form>
  )
}

// ─── Step 3: Área de entrega ──────────────────────────────────

function Step3({
  onNext,
  onBack,
}: {
  onNext: (data: OnboardingStep3) => void
  onBack: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OnboardingStep3>({
    resolver: zodResolver(onboardingStep3Schema),
    defaultValues: { prazo_padrao: 3 },
  })

  const prazo = watch('prazo_padrao')

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="text-center mb-6">
        <span className="text-4xl block mb-2">🚗</span>
        <h2 className="text-lg font-semibold text-gray-900">Entregas</h2>
        <p className="text-sm text-gray-500 mt-1">Configure como você trabalha com entregas.</p>
      </div>

      <Input
        label="Área de entrega"
        placeholder="Ex: Zona Sul de SP, até 10km"
        leftIcon={<MapPin className="w-4 h-4" />}
        error={errors.area_entrega?.message}
        {...register('area_entrega')}
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Prazo padrão de produção
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={14}
            step={1}
            className="flex-1 accent-primary-600"
            {...register('prazo_padrao')}
          />
          <span className="text-sm font-semibold text-primary-700 w-24 text-right">
            {prazo === 0 ? 'No mesmo dia' : `${prazo} dia${Number(prazo) !== 1 ? 's' : ''}`}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Tempo mínimo que você precisa para produzir um pedido.
        </p>
        {errors.prazo_padrao && (
          <p className="text-xs text-red-600">{errors.prazo_padrao.message}</p>
        )}
      </div>

      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <strong>Dica:</strong> Você pode alterar essas configurações a qualquer momento em Configurações.
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button type="submit" className="flex-1">
          Continuar
        </Button>
      </div>
    </form>
  )
}

// ─── Step 4: Plano ────────────────────────────────────────────

const PLANOS = [
  {
    key: 'free' as PlanoTipo,
    label: 'Free',
    preco: null,
    precoLabel: 'Grátis para sempre',
    cor: 'border-gray-200',
    corText: 'text-gray-700',
    corBg: 'bg-gray-50',
    features: ['Até 10 pedidos/mês', 'Gestão de produtos', 'Controle de produção', 'Sem IA de marketing'],
  },
  {
    key: 'starter' as PlanoTipo,
    label: 'Starter',
    preco: 49.90,
    precoLabel: 'R$49,90/mês',
    cor: 'border-primary-300 ring-1 ring-primary-200',
    corText: 'text-primary-700',
    corBg: 'bg-primary-50',
    features: ['Pedidos ilimitados', 'Tudo do Free', '1 cronograma de IA/mês', 'Suporte prioritário'],
    destaque: true,
  },
  {
    key: 'pro' as PlanoTipo,
    label: 'Pro',
    preco: 97,
    precoLabel: 'R$97/mês',
    cor: 'border-purple-300 ring-1 ring-purple-200',
    corText: 'text-purple-700',
    corBg: 'bg-purple-50',
    features: ['Tudo do Starter', '3 cronogramas de IA/mês', 'Relatórios avançados', 'Dashboard exclusivo'],
  },
]

function Step4({
  onSelect,
  onBack,
  saving,
}: {
  onSelect: (plano: PlanoTipo) => void
  onBack: () => void
  saving: boolean
}) {
  const [selected, setSelected] = useState<PlanoTipo>('free')

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <span className="text-4xl block mb-2">✨</span>
        <h2 className="text-lg font-semibold text-gray-900">Escolha seu plano</h2>
        <p className="text-sm text-gray-500 mt-1">Você pode mudar a qualquer momento.</p>
      </div>

      <div className="space-y-3">
        {PLANOS.map((plano) => (
          <button
            key={plano.key}
            type="button"
            onClick={() => setSelected(plano.key)}
            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
              selected === plano.key ? plano.cor : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${plano.corText}`}>{plano.label}</span>
                  {plano.destaque && (
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{plano.precoLabel}</p>
                <ul className="mt-2 space-y-1">
                  {plano.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Check className="w-3 h-3 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                  selected === plano.key ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                }`}
              >
                {selected === plano.key && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving} className="flex-1">
          Voltar
        </Button>
        <Button
          type="button"
          onClick={() => onSelect(selected)}
          loading={saving}
          className="flex-1"
        >
          {selected === 'free' ? 'Começar grátis' : `Assinar ${PLANOS.find((p) => p.key === selected)?.label}`}
        </Button>
      </div>
    </div>
  )
}

// ─── Wizard orchestrator ──────────────────────────────────────

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [wizardData, setWizardData] = useState<WizardData>({
    step1: null,
    step2: null,
    step3: null,
    plano: 'free',
  })

  async function handleFinish(plano: PlanoTipo) {
    if (!wizardData.step1 || !wizardData.step2) return
    setSaving(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // 1. Update confeiteiro profile
      const { error: profileError } = await supabase
        .from('confeiteiros')
        .update({
          nome: wizardData.step1.nome_negocio,
          telefone: wizardData.step1.telefone ?? null,
          cidade: wizardData.step1.cidade ?? null,
          plano: 'free',              // always free until Stripe confirms payment
          onboarding_completo: true,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. Insert initial products
      const produtosInsert = wizardData.step2.produtos.map((p) => ({
        confeiteiro_id: user.id,
        nome: p.nome,
        preco: p.preco,
        custo: 0,
        categoria: p.categoria as ProdutoCategoria,
        ativo: true,
        ingredientes: [],
      }))

      const { error: prodError } = await supabase.from('produtos').insert(produtosInsert)
      if (prodError) throw prodError

      // 3. If paid plan → create Stripe Checkout session
      if (plano !== 'free') {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planKey: plano }),
        })

        if (!res.ok) {
          toast.error('Erro ao criar sessão de pagamento. Continue com o plano grátis.')
          router.push('/dashboard')
          return
        }

        const { url } = await res.json()
        window.location.href = url
        return
      }

      toast.success('Sua doceria está pronta! 🎂')
      router.push('/dashboard')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <ProgressBar current={step} />

      {step === 0 && (
        <Step1
          onNext={(data) => {
            setWizardData((d) => ({ ...d, step1: data }))
            setStep(1)
          }}
        />
      )}
      {step === 1 && (
        <Step2
          onNext={(data) => {
            setWizardData((d) => ({ ...d, step2: data }))
            setStep(2)
          }}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <Step3
          onNext={(data) => {
            setWizardData((d) => ({ ...d, step3: data }))
            setStep(3)
          }}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <Step4
          onSelect={handleFinish}
          onBack={() => setStep(2)}
          saving={saving}
        />
      )}
    </div>
  )
}
