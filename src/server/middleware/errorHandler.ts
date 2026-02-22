// ============================================================
// Doceria Pro — API Error Handler
// Centraliza tratamento de erros em Route Handlers.
// ============================================================

import type { ApiResponse } from '@/shared/types'

// ─── Códigos de erro padronizados ─────────────────────────────

export const ErrorCode = {
  UNAUTHORIZED:           'UNAUTHORIZED',
  FORBIDDEN:              'FORBIDDEN',
  NOT_FOUND:              'NOT_FOUND',
  VALIDATION_ERROR:       'VALIDATION_ERROR',
  PLAN_LIMIT_EXCEEDED:    'PLAN_LIMIT_EXCEEDED',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED:    'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR:  'INTERNAL_SERVER_ERROR',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

// ─── Mapeamento código → HTTP status ─────────────────────────

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED:           401,
  FORBIDDEN:              403,
  NOT_FOUND:              404,
  VALIDATION_ERROR:       422,
  PLAN_LIMIT_EXCEEDED:    402,
  EXTERNAL_SERVICE_ERROR: 502,
  RATE_LIMIT_EXCEEDED:    429,
  INTERNAL_SERVER_ERROR:  500,
}

// ─── Classe de erro da aplicação ──────────────────────────────

export class AppError extends Error {
  readonly statusCode: number
  readonly code: ErrorCode

  constructor(code: ErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'AppError'
    this.code = code
    this.statusCode = STATUS_MAP[code]

    // Mantém o stack trace correto em V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /** Atalho para erros comuns */
  static unauthorized(msg?: string)        { return new AppError('UNAUTHORIZED',           msg) }
  static forbidden(msg?: string)           { return new AppError('FORBIDDEN',              msg) }
  static notFound(resource?: string)       { return new AppError('NOT_FOUND',              resource ? `${resource} não encontrado` : undefined) }
  static validation(msg: string)           { return new AppError('VALIDATION_ERROR',       msg) }
  static planLimit(feature?: string)       { return new AppError('PLAN_LIMIT_EXCEEDED',    feature ? `Limite do plano atingido: ${feature}` : undefined) }
  static externalService(service: string)  { return new AppError('EXTERNAL_SERVICE_ERROR', `Erro no serviço externo: ${service}`) }
  static rateLimit()                       { return new AppError('RATE_LIMIT_EXCEEDED',    'Muitas requisições. Aguarde um momento.') }
}

// ─── Logger ───────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== 'production'

interface LogPayload {
  context: string
  code: string
  message: string
  statusCode: number
  stack?: string
}

function logError(payload: LogPayload): void {
  if (isDev) {
    // Legível no terminal de desenvolvimento
    console.error(
      `[${payload.context}] ${payload.code} (${payload.statusCode}): ${payload.message}`,
      payload.stack ? `\n${payload.stack}` : ''
    )
  } else {
    // Estruturado para ingestão por ferramentas como Datadog / Logtail
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level:     'error',
      context:   payload.context,
      code:      payload.code,
      status:    payload.statusCode,
      message:   payload.message,
    }))
  }
}

// ─── Handler principal ────────────────────────────────────────

/**
 * Converte qualquer erro em um ApiResponse<null> padronizado.
 *
 * @param error   - O erro capturado (AppError, ZodError, Error genérico, etc.)
 * @param context - Nome da rota/função para facilitar busca nos logs
 *
 * @example
 * export async function POST(req: Request) {
 *   try {
 *     // ...
 *   } catch (err) {
 *     const { status, ...body } = handleApiError(err, 'POST /api/pedidos')
 *     return Response.json(body, { status })
 *   }
 * }
 */
export function handleApiError(
  error: unknown,
  context: string
): ApiResponse<null> & { status: number } {
  // ── AppError (nosso) ──────────────────────────────────────
  if (error instanceof AppError) {
    logError({
      context,
      code:       error.code,
      message:    error.message,
      statusCode: error.statusCode,
      stack:      isDev ? error.stack : undefined,
    })
    return { data: null, error: error.code, status: error.statusCode }
  }

  // ── ZodError (validação) ──────────────────────────────────
  // Evita importar Zod aqui diretamente; checa duck-typing
  if (
    error !== null &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  ) {
    const zodErr = error as { issues: Array<{ path: (string|number)[]; message: string }> }
    const firstIssue = zodErr.issues[0]
    const message = firstIssue
      ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
      : 'Dados inválidos'

    logError({ context, code: 'VALIDATION_ERROR', message, statusCode: 422 })
    return { data: null, error: `VALIDATION_ERROR: ${message}`, status: 422 }
  }

  // ── Erro genérico ─────────────────────────────────────────
  const message = error instanceof Error ? error.message : 'Erro interno desconhecido'
  logError({
    context,
    code:       'INTERNAL_SERVER_ERROR',
    message,
    statusCode: 500,
    stack:      isDev && error instanceof Error ? error.stack : undefined,
  })
  return { data: null, error: 'INTERNAL_SERVER_ERROR', status: 500 }
}

// ─── Helper para respostas de sucesso ────────────────────────

export function apiSuccess<T>(data: T, status = 200): ApiResponse<T> & { status: number } {
  return { data, error: null, status }
}
