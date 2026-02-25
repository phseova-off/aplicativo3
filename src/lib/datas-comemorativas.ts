/**
 * Datas comemorativas brasileiras relevantes para confeitarias.
 *
 * Este módulo é a fonte de verdade de todas as datas comemorativas.
 * A função `getDatasComemorativasBr(mes, ano)` retorna as datas do
 * mês informado no formato esperado pela API e pelo frontend.
 *
 * Como usar:
 *   import { getDatasComemorativasBr } from '@/lib/datas-comemorativas'
 *   const datas = getDatasComemorativasBr(6, 2025) // Junho/2025
 */

// ─── Tipos ────────────────────────────────────────────────────

export interface DataComemorativa {
  /** Data no formato DD/MM — ex: "14/06" */
  data: string
  nome: string
  emoji: string
  categoria: 'data-especial' | 'religioso' | 'comercial' | 'nacional' | 'festas-juninas'
}

/** Formato rico usado pela API e pelo formulário de geração */
export interface DataComemorativaBr {
  /** Data no formato ISO YYYY-MM-DD — ex: "2025-06-14" */
  data: string
  nome: string
  emoji: string
  relevancia: 'alta' | 'media' | 'baixa'
}

// ─── Algoritmos para datas móveis ────────────────────────────

/** Calcula a data da Páscoa pelo algoritmo de Butcher */
function calcularPascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

/** N-ésima ocorrência de um dia da semana num mês (0=Dom … 6=Sáb) */
function nesimoDiaSemana(ano: number, mes: number, diaSemana: number, n: number): Date {
  const primeiro = new Date(ano, mes - 1, 1)
  const diff = (diaSemana - primeiro.getDay() + 7) % 7
  return new Date(ano, mes - 1, 1 + diff + (n - 1) * 7)
}

function addDias(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function iso(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ─── Gerador principal ────────────────────────────────────────

/**
 * Retorna as datas comemorativas do `mes` e `ano` informados.
 * Datas móveis (Páscoa, Dia das Mães, Dia dos Pais, Carnaval) são
 * calculadas algoritmicamente para cada ano.
 */
export function getDatasComemorativasBr(mes: number, ano: number): DataComemorativaBr[] {
  const pascoa  = calcularPascoa(ano)
  const carnaval = addDias(pascoa, -47)       // Terça-feira de Carnaval
  const fix      = (m: number, d: number) => new Date(ano, m - 1, d)

  const todas: DataComemorativaBr[] = [
    // Janeiro
    { data: iso(fix(1, 1)),  nome: 'Ano Novo',              emoji: '🥂', relevancia: 'alta'  },
    { data: iso(fix(1, 6)),  nome: 'Dia de Reis',           emoji: '👑', relevancia: 'baixa' },

    // Carnaval (móvel — fevereiro ou março)
    { data: iso(addDias(carnaval, -1)), nome: 'Carnaval – Segunda-feira', emoji: '🎭', relevancia: 'media' },
    { data: iso(carnaval),             nome: 'Carnaval – Terça-feira',   emoji: '🎭', relevancia: 'media' },

    // Fevereiro
    { data: iso(fix(2, 14)), nome: 'Dia de São Valentim',  emoji: '💝', relevancia: 'media' },

    // Março
    { data: iso(fix(3, 8)),  nome: 'Dia Internacional da Mulher', emoji: '🌸', relevancia: 'alta' },

    // Semana Santa / Páscoa (móvel — março ou abril)
    { data: iso(addDias(pascoa, -2)), nome: 'Sexta-feira Santa', emoji: '✝️', relevancia: 'media' },
    { data: iso(pascoa),              nome: 'Páscoa',             emoji: '🐣', relevancia: 'alta' },

    // Maio
    { data: iso(nesimoDiaSemana(ano, 5, 0, 2)), nome: 'Dia das Mães', emoji: '💐', relevancia: 'alta' },

    // Junho
    { data: iso(fix(6, 12)), nome: 'Dia dos Namorados',          emoji: '💕', relevancia: 'alta'  },
    { data: iso(fix(6, 13)), nome: 'Festa Junina – Santo Antônio', emoji: '🎪', relevancia: 'media' },
    { data: iso(fix(6, 24)), nome: 'Festa Junina – São João',     emoji: '🎆', relevancia: 'alta'  },
    { data: iso(fix(6, 29)), nome: 'Festa Junina – São Pedro',    emoji: '🎪', relevancia: 'media' },

    // Agosto
    { data: iso(nesimoDiaSemana(ano, 8, 0, 2)), nome: 'Dia dos Pais', emoji: '👔', relevancia: 'alta' },

    // Setembro
    { data: iso(fix(9, 7)), nome: 'Independência do Brasil', emoji: '🇧🇷', relevancia: 'baixa' },

    // Outubro
    { data: iso(fix(10, 4)),  nome: 'Dia de São Francisco (animais)', emoji: '🐾', relevancia: 'baixa' },
    { data: iso(fix(10, 12)), nome: 'Dia das Crianças',               emoji: '🧒', relevancia: 'alta'  },
    { data: iso(fix(10, 15)), nome: 'Dia do Professor',               emoji: '📚', relevancia: 'baixa' },
    { data: iso(fix(10, 31)), nome: 'Halloween',                      emoji: '🎃', relevancia: 'baixa' },

    // Novembro
    { data: iso(fix(11, 2)),  nome: 'Dia de Finados',         emoji: '🕯️', relevancia: 'baixa' },
    { data: iso(fix(11, 15)), nome: 'Proclamação da República', emoji: '🇧🇷', relevancia: 'baixa' },
    { data: iso(fix(11, 20)), nome: 'Dia da Consciência Negra', emoji: '✊', relevancia: 'baixa' },

    // Dezembro
    { data: iso(fix(12, 1)),  nome: 'Início do Natal (1º de dez)',    emoji: '🎄', relevancia: 'media' },
    { data: iso(fix(12, 25)), nome: 'Natal',                          emoji: '🎁', relevancia: 'alta'  },
    { data: iso(fix(12, 31)), nome: 'Réveillon',                      emoji: '🎆', relevancia: 'alta'  },
  ]

  // Filter to the requested month
  return todas.filter((d) => {
    const m = parseInt(d.data.split('-')[1], 10)
    return m === mes
  })
}

// ─── Lista estática (formato de referência com emoji + categoria) ─

/**
 * Catálogo estático de todas as datas comemorativas relevantes
 * para confeitarias brasileiras, no formato de exibição (DD/MM).
 *
 * Use `getDatasComemorativasBr(mes, ano)` para obter as datas
 * com o ano calculado e no formato ISO YYYY-MM-DD.
 */
export const CATALOGO_DATAS_COMEMORATIVAS: DataComemorativa[] = [
  { data: '01/01', nome: 'Ano Novo',               emoji: '🥂', categoria: 'nacional'      },
  { data: '06/01', nome: 'Dia de Reis',             emoji: '👑', categoria: 'religioso'     },
  { data: '14/02', nome: 'Dia de São Valentim',     emoji: '💝', categoria: 'comercial'     },
  { data: '08/03', nome: 'Dia Internacional da Mulher', emoji: '🌸', categoria: 'data-especial' },
  // Páscoa: móvel (ver getDatasComemorativasBr)
  // Dia das Mães: 2º domingo de Maio (móvel)
  { data: '12/06', nome: 'Dia dos Namorados',       emoji: '💕', categoria: 'comercial'     },
  { data: '13/06', nome: 'Festa Junina – Santo Antônio', emoji: '🎪', categoria: 'festas-juninas' },
  { data: '24/06', nome: 'Festa Junina – São João', emoji: '🎆', categoria: 'festas-juninas' },
  { data: '29/06', nome: 'Festa Junina – São Pedro', emoji: '🎪', categoria: 'festas-juninas' },
  // Dia dos Pais: 2º domingo de Agosto (móvel)
  { data: '07/09', nome: 'Independência do Brasil', emoji: '🇧🇷', categoria: 'nacional'    },
  { data: '12/10', nome: 'Dia das Crianças',        emoji: '🧒', categoria: 'comercial'     },
  { data: '31/10', nome: 'Halloween',               emoji: '🎃', categoria: 'comercial'     },
  { data: '25/12', nome: 'Natal',                   emoji: '🎁', categoria: 'religioso'     },
  { data: '31/12', nome: 'Réveillon',               emoji: '🎆', categoria: 'nacional'      },
]
