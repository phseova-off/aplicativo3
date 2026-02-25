'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/utils'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { useCreateTransacaoComCallback } from '../hooks/useFinanceiro'
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from '../types/financeiro.types'
import type { TransacaoTipo } from '../types/financeiro.types'

const schema = z.object({
  tipo:      z.enum(['receita', 'despesa']),
  categoria: z.string().min(1, 'Categoria obrigatória'),
  valor:     z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  descricao: z.string().optional(),
  data:      z.string().min(1, 'Data obrigatória'),
})

type FormValues = z.infer<typeof schema>

interface NovaTransacaoModalProps {
  isOpen: boolean
  onClose: () => void
  tipoInicial?: TransacaoTipo
  onSuccess?: () => void
}

export function NovaTransacaoModal({
  isOpen,
  onClose,
  tipoInicial = 'despesa',
  onSuccess,
}: NovaTransacaoModalProps) {
  const { mutateAsync, isPending } = useCreateTransacaoComCallback()
  const [tipo, setTipo] = useState<TransacaoTipo>(tipoInicial)
  const [comprovante, setComprovante] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const categorias = tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo,
      data: new Date().toISOString().split('T')[0],
    },
  })

  function switchTipo(t: TransacaoTipo) {
    setTipo(t)
    setValue('tipo', t)
    setValue('categoria', '')
  }

  function handleClose() {
    reset()
    setComprovante(null)
    setTipo(tipoInicial)
    onClose()
  }

  async function onSubmit(values: FormValues) {
    try {
      const transacao = await mutateAsync({ ...values, tipo })

      // Upload comprovante to Supabase Storage (despesa only)
      if (comprovante && tipo === 'despesa') {
        const supabase = createSupabaseBrowserClient()
        const ext = comprovante.name.split('.').pop()
        const path = `${transacao.id}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('comprovantes')
          .upload(path, comprovante, { contentType: comprovante.type, upsert: true })

        if (uploadError) {
          // Non-fatal — transação was created, just the file upload failed
          toast.error('Transação salva, mas houve erro no upload do comprovante.')
        }
      }

      handleClose()
      onSuccess?.()
    } catch {
      // error handled by mutation's onError
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nova Transação" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Toggle receita / despesa */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50 p-1 gap-1">
          {(['receita', 'despesa'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTipo(t)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                tipo === t
                  ? t === 'receita'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {t === 'receita' ? '+ Receita' : '− Despesa'}
            </button>
          ))}
        </div>

        {/* Hidden tipo */}
        <input type="hidden" {...register('tipo')} value={tipo} />

        {/* Valor + Data */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            error={errors.valor?.message}
            {...register('valor', { valueAsNumber: true })}
          />
          <Input
            label="Data"
            type="date"
            error={errors.data?.message}
            {...register('data')}
          />
        </div>

        {/* Categoria */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Categoria</label>
          <select
            {...register('categoria')}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.categoria && (
            <p className="text-xs text-red-600">{errors.categoria.message}</p>
          )}
        </div>

        {/* Descrição */}
        <Textarea
          label="Descrição (opcional)"
          placeholder="Ex: Compra de farinha de trigo..."
          {...register('descricao')}
        />

        {/* Comprovante (despesa only) */}
        {tipo === 'despesa' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Comprovante <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setComprovante(e.target.files?.[0] ?? null)}
            />
            {comprovante ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                <Receipt className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="flex-1 text-blue-700 truncate">{comprovante.name}</span>
                <button
                  type="button"
                  onClick={() => setComprovante(null)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Anexar foto ou PDF
              </button>
            )}
          </div>
        )}

        <Button
          type="submit"
          loading={isPending}
          className={cn(
            'w-full',
            tipo === 'receita' ? 'bg-green-500 hover:bg-green-600' : undefined,
          )}
        >
          {tipo === 'receita' ? 'Registrar receita' : 'Registrar despesa'}
        </Button>
      </form>
    </Modal>
  )
}
