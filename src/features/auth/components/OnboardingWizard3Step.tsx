'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Store,
  MapPin,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Camera,
  Upload,
  Cake,
} from 'lucide-react'
import {
  onboardingSimplStep1Schema,
  onboardingSimplStep2Schema,
  onboardingSimplStep3Schema,
  ESTADOS_BR,
  TIPOS_PRODUTO,
  TIPOS_PRODUTO_LABEL,
  type OnboardingSimplStep1,
  type OnboardingSimplStep2,
  type OnboardingSimplStep3,
} from '../schemas/auth.schema'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/utils'

// ─── Step indicator ──────────────────────────────────────────

const STEPS = [
  { label: 'Confeitaria', icon: '🏪' },
  { label: 'Localização', icon: '📍' },
  { label: 'Produtos', icon: '🍰' },
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

// ─── Main Wizard ─────────────────────────────────────────────

export function OnboardingWizard3Step() {
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

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
          fotoUrl={fotoUrl}
          onFotoChange={setFotoUrl}
          onDone={() => setStep(2)}
        />
      </>
    )

  if (step === 2)
    return (
      <>
        <StepIndicator current={2} />
        <Step2 userId={userId} onDone={() => setStep(3)} onBack={goBack} />
      </>
    )

  return (
    <>
      <StepIndicator current={3} />
      <Step3 userId={userId} onBack={goBack} />
    </>
  )
}

// ─── Step 1: Nome da confeitaria + foto de perfil ────────────

function Step1({
  userId,
  fotoUrl,
  onFotoChange,
  onDone,
}: {
  userId: string | null
  fotoUrl: string | null
  onFotoChange: (url: string) => void
  onDone: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(fotoUrl)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingSimplStep1>({
    resolver: zodResolver(onboardingSimplStep1Schema),
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2 MB.')
      return
    }

    setUploading(true)
    const supabase = createSupabaseBrowserClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/perfil.${ext}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (error) {
      toast.error('Erro ao enviar foto. Tente novamente.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl
    setPreviewUrl(url)
    onFotoChange(url)
    setUploading(false)
  }

  async function onSubmit(values: OnboardingSimplStep1) {
    if (!userId) return

    const supabase = createSupabaseBrowserClient()

    // Upsert into confeitarias — the row may already exist from a trigger
    const { error } = await supabase
      .from('confeitarias')
      .upsert(
        {
          id: userId,
          nome: values.nome_confeitaria,
          logo_url: previewUrl,
        },
        { onConflict: 'id' }
      )

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.')
      return
    }

    // Keep legacy table in sync
    await supabase
      .from('confeiteiros')
      .update({ nome: values.nome_confeitaria, logo_url: previewUrl })
      .eq('id', userId)

    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Sua confeitaria</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Como seus clientes vão te conhecer?
        </p>
      </div>

      {/* Avatar upload */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            'relative w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors',
            previewUrl ? 'border-primary-300' : 'border-gray-300 hover:border-primary-400'
          )}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-gray-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary-600 animate-bounce" />
            </div>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <p className="text-xs text-gray-400">
          {previewUrl ? 'Toque para trocar' : 'Toque para enviar foto (opcional)'}
        </p>
      </div>

      <Input
        label="Nome da confeitaria"
        placeholder="Ex: Doces da Maria"
        leftIcon={<Store className="w-4 h-4" />}
        error={errors.nome_confeitaria?.message}
        required
        {...register('nome_confeitaria')}
      />

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
        Continuar
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </form>
  )
}

// ─── Step 2: Cidade + Estado ─────────────────────────────────

function Step2({
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
  } = useForm<OnboardingSimplStep2>({
    resolver: zodResolver(onboardingSimplStep2Schema),
  })

  async function onSubmit(values: OnboardingSimplStep2) {
    if (!userId) return

    const supabase = createSupabaseBrowserClient()
    const cidadeEstado = `${values.cidade}, ${values.estado}`

    const { error } = await supabase
      .from('confeitarias')
      .update({ cidade: cidadeEstado })
      .eq('id', userId)

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.')
      return
    }

    // Keep legacy table in sync
    await supabase
      .from('confeiteiros')
      .update({ cidade: cidadeEstado })
      .eq('id', userId)

    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Onde você está?</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Ajuda seus clientes a encontrar você.
        </p>
      </div>

      <Input
        label="Cidade"
        placeholder="Ex: São Paulo"
        leftIcon={<MapPin className="w-4 h-4" />}
        error={errors.cidade?.message}
        required
        {...register('cidade')}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          Estado <span className="text-red-500">*</span>
        </label>
        <select
          {...register('estado')}
          className={cn(
            'w-full h-10 px-3 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500',
            errors.estado ? 'border-red-500' : 'border-gray-300'
          )}
        >
          <option value="">Selecione...</option>
          {ESTADOS_BR.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        {errors.estado && (
          <p className="text-xs text-red-600">{errors.estado.message}</p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          className="flex-1"
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Continuar
        </Button>
      </div>
    </form>
  )
}

// ─── Step 3: Tipos de produtos ───────────────────────────────

function Step3({
  userId,
  onBack,
}: {
  userId: string | null
  onBack: () => void
}) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingSimplStep3>({
    resolver: zodResolver(onboardingSimplStep3Schema),
    defaultValues: { tipos_produto: [] },
  })

  const selectedTypes = watch('tipos_produto') ?? []

  async function onSubmit(values: OnboardingSimplStep3) {
    if (!userId) return

    const supabase = createSupabaseBrowserClient()

    // Save product types as description (text) + mark onboarding complete
    const descricao = values.tipos_produto
      .map((t) => TIPOS_PRODUTO_LABEL[t])
      .join(', ')

    const { error } = await supabase
      .from('confeitarias')
      .update({
        descricao,
        onboarding_completo: true,
      })
      .eq('id', userId)

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.')
      return
    }

    // Keep legacy table in sync
    await supabase
      .from('confeiteiros')
      .update({ onboarding_completo: true })
      .eq('id', userId)

    toast.success('Sua doceria está pronta! Bem-vinda ao Doceria Pro 🎂')
    router.push('/dashboard')
    router.refresh()
  }

  const ICONS: Record<string, string> = {
    bolos: '🎂',
    tortas: '🥧',
    trufas: '🍫',
    doces_finos: '🍬',
    bem_casados: '💒',
    outros: '🧁',
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">O que você faz?</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Selecione os tipos de produtos que você produz.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {TIPOS_PRODUTO.map((tipo) => {
          const checked = selectedTypes.includes(tipo)
          return (
            <label
              key={tipo}
              className={cn(
                'flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all',
                checked
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <input
                type="checkbox"
                value={tipo}
                {...register('tipos_produto')}
                className="sr-only"
              />
              <span className="text-lg">{ICONS[tipo]}</span>
              <span
                className={cn(
                  'text-sm font-medium',
                  checked ? 'text-primary-700' : 'text-gray-700'
                )}
              >
                {TIPOS_PRODUTO_LABEL[tipo]}
              </span>
              {checked && (
                <CheckCircle className="w-4 h-4 text-primary-600 ml-auto" />
              )}
            </label>
          )
        })}
      </div>

      {errors.tipos_produto && (
        <p className="text-xs text-red-600">{errors.tipos_produto.message}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          className="flex-1"
          leftIcon={<Cake className="w-4 h-4" />}
        >
          Finalizar e entrar
        </Button>
      </div>
    </form>
  )
}
