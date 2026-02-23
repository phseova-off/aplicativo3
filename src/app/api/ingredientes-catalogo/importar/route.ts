import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

export interface ImportarLinhaPreview {
  linha: number
  nome: string
  preco_atual: number
  unidade: string
  fornecedor: string | null
  status: 'novo' | 'atualizar' | 'erro'
  erro?: string
}

export interface ImportarResult {
  inseridos: number
  atualizados: number
  erros: number
  linhas: ImportarLinhaPreview[]
}

function parseCSV(text: string): string[][] {
  return text
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      // Suporte básico a campos entre aspas
      const cells: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          inQuotes = !inQuotes
        } else if (ch === ',' && !inQuotes) {
          cells.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
      cells.push(current.trim())
      return cells
    })
}

const UNIDADES_VALIDAS = ['g', 'kg', 'ml', 'l', 'un', 'cx', 'pct']

/**
 * GET /api/ingredientes-catalogo/importar
 * Retorna o template CSV para download.
 */
export async function GET() {
  const template = [
    'nome,preco,unidade,fornecedor',
    'Farinha de Trigo,4.50,kg,Fornecedor A',
    'Manteiga,12.00,kg,',
    'Chocolate 70%,32.00,kg,Barry Callebaut',
    'Ovos,0.85,un,',
    'Açúcar Refinado,3.20,kg,',
  ].join('\n')

  return new Response(template, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="template_ingredientes.csv"',
    },
  })
}

/**
 * POST /api/ingredientes-catalogo/importar
 * Body: { csv: string, confirmar?: boolean }
 *
 * Se confirmar=false (default): retorna preview sem salvar.
 * Se confirmar=true: salva no banco.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { csv, confirmar = false } = body as { csv: string; confirmar?: boolean }

  if (!csv || typeof csv !== 'string') {
    return NextResponse.json({ error: 'Campo csv é obrigatório' }, { status: 422 })
  }

  const rows = parseCSV(csv.trim())
  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV deve ter cabeçalho + ao menos uma linha' }, { status: 422 })
  }

  // Validar cabeçalho (flexível: aceita em português ou inglês)
  const header = rows[0].map((h) => h.toLowerCase().trim())
  const nomIdx = header.findIndex((h) => h === 'nome' || h === 'name')
  const precoIdx = header.findIndex((h) => ['preco', 'preço', 'price', 'valor'].includes(h))
  const unIdx = header.findIndex((h) => ['unidade', 'unit', 'un'].includes(h))
  const fornIdx = header.findIndex((h) => ['fornecedor', 'supplier', 'fornecedora'].includes(h))

  if (nomIdx === -1 || precoIdx === -1) {
    return NextResponse.json({
      error: 'CSV deve ter colunas: nome, preco (e opcionalmente: unidade, fornecedor)',
    }, { status: 422 })
  }

  // Buscar ingredientes existentes para detectar duplicatas
  const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: existentes } = await db
    .from('ingredientes_catalogo')
    .select('id, nome')
    .eq('confeiteiro_id', user.id) as { data: Array<{ id: string; nome: string }> | null }

  const existentesMap: Record<string, string> = {} // nome.lower -> id
  for (const e of existentes ?? []) {
    existentesMap[e.nome.toLowerCase()] = e.id
  }

  const linhas: ImportarLinhaPreview[] = []
  const paraInserir: Array<{ nome: string; preco_atual: number; unidade: string; fornecedor: string | null; confeiteiro_id: string }> = []
  const paraAtualizar: Array<{ id: string; preco_atual: number; fornecedor: string | null }> = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const nome = row[nomIdx]?.trim() ?? ''
    const precoRaw = row[precoIdx]?.trim().replace(',', '.') ?? ''
    const unidade = (unIdx >= 0 ? row[unIdx]?.trim() : 'kg') ?? 'kg'
    const fornecedor = (fornIdx >= 0 ? row[fornIdx]?.trim() || null : null) ?? null

    if (!nome) {
      linhas.push({ linha: i + 1, nome: '', preco_atual: 0, unidade, fornecedor, status: 'erro', erro: 'Nome vazio' })
      continue
    }

    const preco = parseFloat(precoRaw)
    if (isNaN(preco) || preco <= 0) {
      linhas.push({ linha: i + 1, nome, preco_atual: 0, unidade, fornecedor, status: 'erro', erro: 'Preço inválido' })
      continue
    }

    const unidadeNorm = UNIDADES_VALIDAS.includes(unidade.toLowerCase()) ? unidade.toLowerCase() : 'kg'
    const existeId = existentesMap[nome.toLowerCase()]

    if (existeId) {
      linhas.push({ linha: i + 1, nome, preco_atual: preco, unidade: unidadeNorm, fornecedor, status: 'atualizar' })
      paraAtualizar.push({ id: existeId, preco_atual: preco, fornecedor })
    } else {
      linhas.push({ linha: i + 1, nome, preco_atual: preco, unidade: unidadeNorm, fornecedor, status: 'novo' })
      paraInserir.push({ nome, preco_atual: preco, unidade: unidadeNorm, fornecedor, confeiteiro_id: user.id })
    }
  }

  const erros = linhas.filter((l) => l.status === 'erro').length

  // Preview mode: retornar sem salvar
  if (!confirmar) {
    return NextResponse.json({
      inseridos: paraInserir.length,
      atualizados: paraAtualizar.length,
      erros,
      linhas,
    } satisfies ImportarResult)
  }

  // Confirmar: salvar no banco
  let inseridos = 0
  let atualizados = 0

  if (paraInserir.length > 0) {
    const { error: insErr } = await db
      .from('ingredientes_catalogo')
      .insert(paraInserir)
    if (!insErr) inseridos = paraInserir.length
  }

  for (const item of paraAtualizar) {
    const { error: updErr } = await db
      .from('ingredientes_catalogo')
      .update({
        preco_atual: item.preco_atual,
        fornecedor: item.fornecedor,
        preco_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .eq('confeiteiro_id', user.id)
    if (!updErr) atualizados++
  }

  return NextResponse.json({ inseridos, atualizados, erros, linhas } satisfies ImportarResult)
}
