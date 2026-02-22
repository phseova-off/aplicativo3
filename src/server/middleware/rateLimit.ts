// ============================================================
// Doceria Pro — Rate Limiter
//
// Estratégia:
//   - DEV / teste: sliding window in-memory (Map)
//   - PROD: substitua pela implementação Upstash abaixo
//
// Para ativar Upstash em produção:
//   1. npm install @upstash/ratelimit @upstash/redis
//   2. Adicione UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN ao .env
//   3. Descomente o bloco "Upstash (produção)" e comente o bloco "In-memory"
// ============================================================

import { AppError } from './errorHandler'

// ─── Tipos ────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Máximo de requisições permitidas na janela */
  limit: number
  /** Tamanho da janela em milissegundos */
  windowMs: number
}

export interface RateLimitResult {
  /** Requisição permitida? */
  success: boolean
  /** Limite configurado */
  limit: number
  /** Requisições restantes na janela atual */
  remaining: number
  /** Timestamp (ms) em que a janela reinicia */
  resetAt: number
}

// ─── Configurações pré-definidas ──────────────────────────────

export const RATE_CONFIGS = {
  /** Rotas gerais autenticadas — 100 req/min por usuário */
  geral: { limit: 100, windowMs: 60_000 } satisfies RateLimitConfig,

  /** Geração de cronograma com IA — 10 req/min por usuário */
  cronogramaIA: { limit: 10, windowMs: 60_000 } satisfies RateLimitConfig,

  /** Webhook do Stripe — 5 req/min por IP */
  stripeWebhook: { limit: 5, windowMs: 60_000 } satisfies RateLimitConfig,
} as const

// ─── In-memory store (DEV / instância única) ──────────────────

interface WindowEntry {
  count: number
  resetAt: number
}

// Mapa global: chave → estado da janela
// Em produção com múltiplas réplicas, use Upstash Redis.
const store = new Map<string, WindowEntry>()

// Limpeza periódica para evitar vazamento de memória
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key)
    }
  }, 60_000).unref?.()
}

function checkInMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, limit: config.limit, remaining: config.limit - 1, resetAt }
  }

  entry.count += 1
  const remaining = Math.max(0, config.limit - entry.count)
  return {
    success:   entry.count <= config.limit,
    limit:     config.limit,
    remaining,
    resetAt:   entry.resetAt,
  }
}

// ─── Upstash (produção) — descomente quando pronto ────────────
//
// import { Ratelimit }  from '@upstash/ratelimit'
// import { Redis }      from '@upstash/redis'
//
// const redis = new Redis({
//   url:   process.env.UPSTASH_REDIS_REST_URL!,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
// })
//
// const limiters = {
//   geral:         new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m') }),
//   cronogramaIA:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10,  '1 m') }),
//   stripeWebhook: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,   '1 m') }),
// }
//
// async function checkUpstash(
//   key: string,
//   limiterName: keyof typeof limiters
// ): Promise<RateLimitResult> {
//   const { success, limit, remaining, reset } = await limiters[limiterName].limit(key)
//   return { success, limit, remaining, resetAt: reset }
// }

// ─── API pública ──────────────────────────────────────────────

/**
 * Verifica o rate limit para uma chave e configuração.
 *
 * @param key    - Identificador único (ex: userId, IP)
 * @param config - Limites a aplicar (use RATE_CONFIGS.*)
 *
 * @example
 * const result = await rateLimit(`user:${userId}`, RATE_CONFIGS.geral)
 * if (!result.success) throw AppError.rateLimit()
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Troca pelo checkUpstash em produção
  return checkInMemory(key, config)
}

/**
 * Wrapper que lança AppError diretamente se o limite for excedido.
 * Ideal para uso em Route Handlers.
 *
 * @example
 * await assertRateLimit(`user:${userId}`, RATE_CONFIGS.cronogramaIA)
 */
export async function assertRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  const result = await rateLimit(key, config)
  if (!result.success) {
    throw AppError.rateLimit()
  }
}

/**
 * Constrói os headers padrão de rate limit para incluir na Response.
 *
 * @example
 * return Response.json(body, { status: 200, headers: rateLimitHeaders(result) })
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit':     String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(Math.ceil(result.resetAt / 1000)), // Unix segundos
    ...(result.success ? {} : { 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)) }),
  }
}
