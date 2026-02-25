import { createSupabaseServerClient } from '@/server/db/client'

export const dynamic = 'force-dynamic'

interface CheckResult {
  ok: boolean
  latencyMs: number
}

async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('confeitarias').select('id').limit(1)
    return { ok: !error, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
        ok
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
      />
      {ok ? 'Operacional' : 'Com problema'}
    </span>
  )
}

export default async function StatusPage() {
  const db = await checkSupabase()
  const allOk = db.ok

  const version = process.env.npm_package_version ?? '0.1.0'
  const env = process.env.NODE_ENV ?? 'production'

  const checkedAt = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const services = [
    { name: 'API', ok: true, latencyMs: null },
    { name: 'Banco de dados (Supabase)', ok: db.ok, latencyMs: db.latencyMs },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">

        {/* Logo + title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl shadow-lg">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Doceria Pro — Status</h1>
          <p className="text-sm text-gray-500">Status atual dos serviços da plataforma</p>
        </div>

        {/* Overall status */}
        <div
          className={`rounded-2xl border p-5 flex items-center gap-4 ${
            allOk
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              allOk ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {allOk ? (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div>
            <p className={`text-base font-bold ${allOk ? 'text-green-800' : 'text-red-800'}`}>
              {allOk ? 'Todos os sistemas operacionais' : 'Há problemas em um ou mais serviços'}
            </p>
            <p className={`text-xs mt-0.5 ${allOk ? 'text-green-600' : 'text-red-600'}`}>
              Verificado em {checkedAt}
            </p>
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Serviços</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {services.map((svc) => (
              <li key={svc.name} className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm text-gray-700">{svc.name}</span>
                <div className="flex items-center gap-3">
                  {svc.latencyMs !== null && (
                    <span className="text-xs text-gray-400">{svc.latencyMs} ms</span>
                  )}
                  <StatusBadge ok={svc.ok} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Meta */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Informações</h2>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span className="text-gray-400">Versão</span>
            <span className="font-mono">{version}</span>
            <span className="text-gray-400">Ambiente</span>
            <span className="font-mono capitalize">{env}</span>
            <span className="text-gray-400">Região</span>
            <span className="font-mono">São Paulo (sa-east-1)</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          Doceria Pro · Suporte:{' '}
          <a href="mailto:suporte@doceriapro.com.br" className="underline hover:text-gray-600">
            suporte@doceriapro.com.br
          </a>
        </p>
      </div>
    </div>
  )
}
