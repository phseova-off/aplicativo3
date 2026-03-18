// ============================================================
// Doceria Pro — Calendário Sazonal
//
// Mapeia períodos de pico do setor de confeitaria no Brasil.
// Usado por:
//   - Motor de alertas (avisar planejamento com antecedência)
//   - Geração de cronograma de marketing (sugerir temas)
//   - Supressão de emails de onboarding em pico
// ============================================================

// ─── Tipos ────────────────────────────────────────────────────

export interface PeriodoPico {
  /** Nome legível: "Páscoa", "Dia das Mães", etc. */
  nome: string
  /** Chave programática */
  chave: string
  /**
   * Função que retorna a data-base do evento para um ano.
   * Eventos com data fixa retornam sempre o mesmo dia;
   * Páscoa usa cálculo de Computus.
   */
  getData: (ano: number) => Date
  /** Dias ANTES da data-base em que o pico começa */
  diasAntes: number
  /** Dias DEPOIS da data-base em que o pico termina */
  diasDepois: number
}

export interface InfoPico {
  nome: string
  chave: string
  dataBase: Date
  inicioPico: Date
  fimPico: Date
  diasRestantes: number
  emPico: boolean
}

// ─── Cálculo de Páscoa (Computus – algoritmo de Meeus) ────────

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

// ─── Mapa de eventos sazonais brasileiros ─────────────────────

export const EVENTOS_SAZONAIS: PeriodoPico[] = [
  {
    nome: 'Páscoa',
    chave: 'pascoa',
    getData: (ano) => calcularPascoa(ano),
    diasAntes: 15,
    diasDepois: 5,
  },
  {
    nome: 'Dia das Mães',
    chave: 'maes',
    getData: (ano) => {
      // Segundo domingo de maio
      const maio = new Date(ano, 4, 1) // maio = mês 4 (0-indexed)
      const diaSemana = maio.getDay()
      const primeiroDomin = diaSemana === 0 ? 1 : 8 - diaSemana
      return new Date(ano, 4, primeiroDomin + 7)
    },
    diasAntes: 10,
    diasDepois: 2,
  },
  {
    nome: 'Dia dos Namorados',
    chave: 'namorados',
    getData: (ano) => new Date(ano, 5, 12), // 12 de junho
    diasAntes: 10,
    diasDepois: 1,
  },
  {
    nome: 'Festa Junina',
    chave: 'junina',
    getData: (ano) => new Date(ano, 5, 24), // 24 de junho (São João)
    diasAntes: 15,
    diasDepois: 5,
  },
  {
    nome: 'Dia das Crianças',
    chave: 'criancas',
    getData: (ano) => new Date(ano, 9, 12), // 12 de outubro
    diasAntes: 10,
    diasDepois: 2,
  },
  {
    nome: 'Natal',
    chave: 'natal',
    getData: (ano) => new Date(ano, 11, 25),
    diasAntes: 20,
    diasDepois: 1,
  },
  {
    nome: 'Ano Novo / Réveillon',
    chave: 'ano_novo',
    getData: (ano) => new Date(ano, 11, 31),
    diasAntes: 10,
    diasDepois: 1,
  },
]

// ─── Funções públicas ─────────────────────────────────────────

function diffDias(a: Date, b: Date): number {
  const msPerDay = 86_400_000
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

/**
 * Calcula InfoPico para um evento em relação a `hoje`.
 */
function infoDoEvento(evento: PeriodoPico, hoje: Date): InfoPico {
  const ano = hoje.getFullYear()
  // Testar o evento para este ano e para o próximo
  const candidatos = [evento.getData(ano), evento.getData(ano + 1)]

  // Escolhe o mais próximo no futuro (ou o atual se estiver em pico)
  let melhor = candidatos[0]
  for (const d of candidatos) {
    const fimPico = new Date(d)
    fimPico.setDate(fimPico.getDate() + evento.diasDepois)
    if (fimPico >= hoje && diffDias(hoje, d) < diffDias(hoje, melhor)) {
      melhor = d
    }
  }

  // Recalcular se todos já passaram — usar próximo ano
  if (diffDias(hoje, melhor) < -evento.diasDepois) {
    melhor = evento.getData(ano + 1)
  }

  const inicioPico = new Date(melhor)
  inicioPico.setDate(inicioPico.getDate() - evento.diasAntes)

  const fimPico = new Date(melhor)
  fimPico.setDate(fimPico.getDate() + evento.diasDepois)

  const diasRestantes = diffDias(hoje, melhor)
  const emPico = hoje >= inicioPico && hoje <= fimPico

  return {
    nome: evento.nome,
    chave: evento.chave,
    dataBase: melhor,
    inicioPico,
    fimPico,
    diasRestantes,
    emPico,
  }
}

/**
 * Verifica se estamos em algum período de pico sazonal agora.
 */
export function eEmPicoAtual(hoje: Date = new Date()): boolean {
  return EVENTOS_SAZONAIS.some((ev) => infoDoEvento(ev, hoje).emPico)
}

/**
 * Retorna todos os picos ativos no momento.
 */
export function picosAtivos(hoje: Date = new Date()): InfoPico[] {
  return EVENTOS_SAZONAIS
    .map((ev) => infoDoEvento(ev, hoje))
    .filter((info) => info.emPico)
}

/**
 * Retorna o próximo pico sazonal (mais próximo no futuro).
 * Se estiver em um pico, retorna esse + o próximo.
 */
export function proximoPico(hoje: Date = new Date()): InfoPico | null {
  const infos = EVENTOS_SAZONAIS
    .map((ev) => infoDoEvento(ev, hoje))
    .filter((info) => info.diasRestantes >= 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)

  return infos[0] ?? null
}

/**
 * Retorna todos os picos relevantes para os próximos N dias.
 */
export function picosProximos(dias: number = 30, hoje: Date = new Date()): InfoPico[] {
  return EVENTOS_SAZONAIS
    .map((ev) => infoDoEvento(ev, hoje))
    .filter((info) => info.diasRestantes >= -info.fimPico.getDate() && info.diasRestantes <= dias)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
}
