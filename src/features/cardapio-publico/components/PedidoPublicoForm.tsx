'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, CheckCircle2, ArrowLeft, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  produto_id: z.string().uuid().optional().nullable(),
  nome_produto: z.string().min(1, 'Informe o produto'),
  quantidade: z.coerce.number().int().min(1, 'Mínimo 1'),
  preco_unitario: z.coerce.number().min(0),
})

const formSchema = z.object({
  cliente_nome: z.string().min(2, 'Informe seu nome completo'),
  cliente_telefone: z
    .string()
    .min(8, 'Informe um telefone válido (com DDD)')
    .regex(/^[\d\s\(\)\-\+]+$/, 'Telefone inválido'),
  data_entrega: z.string().optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemSchema).min(1, 'Adicione ao menos um produto'),
})

type FormValues = z.infer<typeof formSchema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface Produto {
  id: string
  nome: string
  preco: number
  categoria: string
  foto_url: string | null
}

interface Confeitaria {
  id: string
  nome: string
  slug: string | null
  prazo_padrao_dias: number | null
}

interface PedidoPublicoFormProps {
  confeitaria: Confeitaria
  produtos: Produto[]
  produtoPreSelecionado?: Produto | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PedidoPublicoForm({
  confeitaria,
  produtos,
  produtoPreSelecionado,
}: PedidoPublicoFormProps) {
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [nomeDaConfeiteira, setNomeDaConfeiteira] = useState(confeitaria.nome)

  const minDataEntrega = (() => {
    const d = new Date()
    d.setDate(d.getDate() + (confeitaria.prazo_padrao_dias ?? 3))
    return d.toISOString().split('T')[0]
  })()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente_nome: '',
      cliente_telefone: '',
      data_entrega: '',
      observacoes: '',
      itens: produtoPreSelecionado
        ? [
            {
              produto_id: produtoPreSelecionado.id,
              nome_produto: produtoPreSelecionado.nome,
              quantidade: 1,
              preco_unitario: produtoPreSelecionado.preco,
            },
          ]
        : [{ produto_id: null, nome_produto: '', quantidade: 1, preco_unitario: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'itens' })
  const itens = watch('itens')
  const total = itens.reduce((s, i) => s + (i.quantidade || 0) * (i.preco_unitario || 0), 0)

  // sync nome da confeiteira para mensagem de sucesso
  useEffect(() => {
    setNomeDaConfeiteira(confeitaria.nome)
  }, [confeitaria.nome])

  async function onSubmit(values: FormValues) {
    setEnviando(true)
    setErro(null)

    try {
      const res = await fetch(`/api/cardapio/${confeitaria.slug}/pedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg =
          data?.error?.formErrors?.[0] ??
          (typeof data?.error === 'string' ? data.error : null) ??
          'Erro ao enviar pedido. Tente novamente.'
        setErro(msg)
        return
      }

      setSucesso(true)
    } catch {
      setErro('Sem conexão. Verifique sua internet e tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // ── Tela de sucesso ──────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Pedido enviado!</h2>
            <p className="text-gray-600 text-sm">
              Seu pedido foi recebido.{' '}
              <strong>{nomeDaConfeiteira}</strong> vai confirmar em breve.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-medium mb-0.5">Próximos passos</p>
            <p>Fique de olho no seu celular — a {nomeDaConfeiteira} pode entrar em contato pelo WhatsApp para confirmar os detalhes.</p>
          </div>
          <a
            href={`/menu/${confeitaria.slug}`}
            className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao cardápio
          </a>
          {/* Viral footer */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Gerenciado com{' '}
              <a
                href={`/cadastro?ref=${confeitaria.id}`}
                className="text-primary-500 hover:text-primary-700 font-medium transition-colors"
              >
                Doceria Pro
              </a>
              {' '}— crie o seu grátis
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-pink-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <a
            href={`/menu/${confeitaria.slug}`}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Voltar ao cardápio"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 text-base leading-tight">Fazer pedido</h1>
            <p className="text-xs text-gray-400">{confeitaria.nome}</p>
          </div>
          <ShoppingBag className="w-5 h-5 text-primary-400" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Seus dados */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">Seus dados</h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Maria da Silva"
              autoComplete="name"
              className={`w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                errors.cliente_nome ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
              {...register('cliente_nome')}
            />
            {errors.cliente_nome && (
              <p className="text-xs text-red-500 mt-1">{errors.cliente_nome.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              WhatsApp / Telefone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              autoComplete="tel"
              className={`w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                errors.cliente_telefone ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
              {...register('cliente_telefone')}
            />
            {errors.cliente_telefone && (
              <p className="text-xs text-red-500 mt-1">{errors.cliente_telefone.message}</p>
            )}
          </div>
        </section>

        {/* Produtos */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">Produtos desejados</h2>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const itemErrors = errors.itens?.[index]
              return (
                <div
                  key={field.id}
                  className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex-1 space-y-2">
                    {/* Produto select or free text */}
                    <div>
                      <select
                        className={`w-full h-9 px-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                          itemErrors?.nome_produto ? 'border-red-400' : 'border-gray-200'
                        }`}
                        defaultValue={field.produto_id ?? ''}
                        onChange={(e) => {
                          const selected = produtos.find((p) => p.id === e.target.value)
                          if (selected) {
                            setValue(`itens.${index}.produto_id`, selected.id)
                            setValue(`itens.${index}.nome_produto`, selected.nome)
                            setValue(`itens.${index}.preco_unitario`, selected.preco)
                          } else {
                            setValue(`itens.${index}.produto_id`, null)
                            setValue(`itens.${index}.nome_produto`, '')
                            setValue(`itens.${index}.preco_unitario`, 0)
                          }
                        }}
                      >
                        <option value="">Selecione um produto...</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} — {formatCurrency(p.preco)}
                          </option>
                        ))}
                      </select>
                      <input type="hidden" {...register(`itens.${index}.produto_id`)} />
                      <input type="hidden" {...register(`itens.${index}.nome_produto`)} />
                      <input type="hidden" {...register(`itens.${index}.preco_unitario`)} />
                      {itemErrors?.nome_produto && (
                        <p className="text-xs text-red-500 mt-0.5">{itemErrors.nome_produto.message}</p>
                      )}
                    </div>
                    {/* Quantidade */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 flex-shrink-0">Qtd:</label>
                      <input
                        type="number"
                        min={1}
                        className="w-20 h-8 px-2 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
                        {...register(`itens.${index}.quantidade`)}
                      />
                      {itens[index]?.preco_unitario > 0 && (
                        <span className="text-xs text-gray-500 ml-auto">
                          {formatCurrency((itens[index].quantidade || 0) * (itens[index].preco_unitario || 0))}
                        </span>
                      )}
                    </div>
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors mt-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {errors.itens?.root && (
            <p className="text-xs text-red-500">{errors.itens.root.message}</p>
          )}
          {typeof errors.itens?.message === 'string' && (
            <p className="text-xs text-red-500">{errors.itens.message}</p>
          )}

          <button
            type="button"
            onClick={() =>
              append({ produto_id: null, nome_produto: '', quantidade: 1, preco_unitario: 0 })
            }
            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar outro produto
          </button>

          {total > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-600 font-medium">Total estimado</span>
              <span className="text-base font-bold text-primary-700">{formatCurrency(total)}</span>
            </div>
          )}
        </section>

        {/* Entrega */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">Entrega & Observações</h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Data de entrega desejada
            </label>
            <input
              type="date"
              min={minDataEntrega}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              {...register('data_entrega')}
            />
            {confeitaria.prazo_padrao_dias && (
              <p className="text-xs text-gray-400 mt-1">
                Prazo mínimo: {confeitaria.prazo_padrao_dias} dia{confeitaria.prazo_padrao_dias !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              rows={3}
              placeholder="Alergias, sabores, recheios especiais, mensagem no bolo..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              {...register('observacoes')}
            />
          </div>
        </section>

        {/* Erro global */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Aviso de limite */}
        <p className="text-xs text-gray-400 text-center">
          Ao enviar, {confeitaria.nome} receberá seu pedido e confirmará os detalhes.
        </p>

        {/* Viral footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-300">
            Gerenciado com{' '}
            <a
              href={`/cadastro?ref=${confeitaria.id}`}
              className="text-primary-300 hover:text-primary-500 font-medium transition-colors"
            >
              Doceria Pro
            </a>
            {' '}— crie o seu grátis
          </p>
        </div>
      </form>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-gray-100 shadow-2xl z-40">
        <div className="max-w-lg mx-auto">
          <button
            type="submit"
            form="pedido-form"
            disabled={enviando}
            onClick={handleSubmit(onSubmit)}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg text-sm flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                {total > 0 ? `Enviar pedido — ${formatCurrency(total)}` : 'Enviar pedido'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
