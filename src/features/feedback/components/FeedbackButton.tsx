'use client'

import { useState } from 'react'
import { MessageSquare, X, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type Tipo = 'geral' | 'bug' | 'sugestao'

const TIPOS: { value: Tipo; label: string; emoji: string }[] = [
  { value: 'geral', label: 'Geral', emoji: '💬' },
  { value: 'bug', label: 'Bug', emoji: '🐛' },
  { value: 'sugestao', label: 'Sugestão', emoji: '💡' },
]

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<Tipo>('geral')
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || texto.trim().length < 5) return
    setLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, texto: texto.trim() }),
      })
      if (res.ok) {
        setEnviado(true)
        setTexto('')
        setTimeout(() => {
          setEnviado(false)
          setOpen(false)
        }, 2800)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setTexto('')
    setEnviado(false)
    setTipo('geral')
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5',
          'bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg',
          'text-sm font-semibold transition-all duration-200 hover:scale-105',
          open && 'opacity-0 pointer-events-none',
        )}
        aria-label="Enviar feedback"
      >
        <MessageSquare className="w-4 h-4" />
        Feedback
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary-500">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Dar Feedback</span>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {enviado ? (
            /* Success state */
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="text-sm font-semibold text-gray-800">Obrigada pelo feedback!</p>
              <p className="text-xs text-gray-500">Sua mensagem foi recebida e nos ajuda muito a melhorar o Doceria Pro.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">

              {/* Tipo tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {TIPOS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      tipo === t.value
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700',
                    )}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={
                    tipo === 'bug'
                      ? 'Descreva o que aconteceu e como reproduzir...'
                      : tipo === 'sugestao'
                      ? 'O que você gostaria de ver no Doceria Pro?'
                      : 'O que você acha do Doceria Pro? Como podemos melhorar?'
                  }
                  rows={4}
                  maxLength={2000}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-gray-400"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-400">{texto.length}/2000</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || texto.trim().length < 5}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  'bg-primary-500 hover:bg-primary-600 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {loading ? 'Enviando…' : 'Enviar feedback'}
              </button>

              <p className="text-center text-xs text-gray-400">
                Você está na versão beta — seu feedback é muito valioso!
              </p>
            </form>
          )}
        </div>
      )}
    </>
  )
}
