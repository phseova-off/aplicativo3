import OpenAI from 'openai'
import type { MarketingPostRico, DataComemorativaBr } from '@/features/marketing/types/marketing.types'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ─── Legacy interface (kept for backwards compatibility) ───────

export interface MarketingPost {
  dia: number
  plataforma: 'Instagram' | 'WhatsApp' | 'TikTok'
  tema: string
  legenda: string
  hashtags: string[]
  horario_sugerido: string
}

export interface MarketingScheduleInput {
  tipo_negocio: string
  publico_alvo: string
  periodo_dias: number
  foco: string
  nome_negocio?: string
}

export async function generateMarketingSchedule(
  input: MarketingScheduleInput
): Promise<MarketingPost[]> {
  const { tipo_negocio, publico_alvo, periodo_dias, foco, nome_negocio } = input

  const prompt = `Você é um especialista em marketing digital para pequenos negócios de confeitaria no Brasil.

Crie um cronograma de conteúdo para redes sociais com ${periodo_dias} posts/dias para:
- Tipo de negócio: ${tipo_negocio}
- Nome do negócio: ${nome_negocio ?? 'Minha Doceria'}
- Público-alvo: ${publico_alvo}
- Foco do período: ${foco}

Para cada dia, crie um post diferente variando entre Instagram, WhatsApp e TikTok.
Use linguagem natural, brasileira e autêntica. Inclua emojis nas legendas.
Hashtags devem ser relevantes e em português.

Retorne APENAS um JSON válido com a chave "posts":
{"posts": [{"dia":1,"plataforma":"Instagram","tema":"...","legenda":"...","hashtags":["#doceria"],"horario_sugerido":"19:00"}]}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  const parsed = JSON.parse(content) as { posts?: MarketingPost[] }
  return parsed.posts ?? []
}

// ─── New rich cronograma generator ────────────────────────────

export interface CronogramaGerarInput {
  mes: number
  ano: number
  nome_negocio: string
  datas_especiais: DataComemorativaBr[]
  produtos: string[]
}

const SYSTEM_PROMPT = `Você é uma especialista em marketing digital para confeitarias artesanais brasileiras.
Seu tom é acolhedor, autêntico e próximo — como se fosse a própria confeiteira conversando com seus clientes.
Use emojis com moderação (não mais de 3 por legenda). Escreva em português brasileiro informal mas correto.
Seja criativa com as ideias visuais — pense em conteúdo que funcione na vida real de uma confeiteira pequena.`

export async function generateCronogramaMarketing(
  input: CronogramaGerarInput
): Promise<MarketingPostRico[]> {
  const { mes, ano, nome_negocio, datas_especiais, produtos } = input

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const nomeMes = meses[mes - 1]

  // Calculate weeks for the month
  const diasNoMes = new Date(ano, mes, 0).getDate()

  // Build weekly post days (approx 1 per week)
  const semanas: number[] = []
  for (let d = 7; d <= diasNoMes; d += 7) semanas.push(d)
  if (semanas[semanas.length - 1] !== diasNoMes) semanas.push(diasNoMes)

  const datasEspeciaisStr = datas_especiais.length > 0
    ? datas_especiais.map((d) => `- ${d.nome} (dia ${parseInt(d.data.split('-')[2], 10)})`).join('\n')
    : 'Nenhuma selecionada'

  const produtosStr = produtos.length > 0
    ? produtos.join(', ')
    : 'seus produtos habituais'

  const userPrompt = `Crie um cronograma de marketing para ${nomeMes}/${ano} para a confeitaria "${nome_negocio}".

PRODUTOS EM DESTAQUE este mês: ${produtosStr}

DATAS COMEMORATIVAS selecionadas:
${datasEspeciaisStr}

POSTS A GERAR:
1. Um post semanal (aproximadamente nos dias: ${semanas.join(', ')})
2. Um post especial para CADA data comemorativa listada acima (no próprio dia da data)

Para CADA post, gere:
- dia: número do dia no mês
- data: "${ano}-${String(mes).padStart(2,'0')}-DD" (DD = dia do mês)
- plataforma: "Instagram", "WhatsApp" ou "TikTok" (varie entre os posts)
- formato: "Reels", "Carrossel", "Story" ou "Feed"
- tema: título curto do post (máx 60 caracteres)
- ideia_visual: descrição específica do que filmar ou fotografar (máx 120 caracteres)
- legenda: legenda completa pronta para publicar (2-4 parágrafos, com emojis)
- hashtags: exatamente 15 hashtags segmentadas (5 de nicho, 5 locais genéricas, 5 gerais)
- horario_sugerido: melhor horário no formato "HH:MM"
- cta: call-to-action específico (ex: "Encomende pelo link na bio!", "Mande uma mensagem agora!")
- data_comemorativa: nome da data (só preencher se for post de data especial, senão omitir)

Retorne JSON com a chave "posts" contendo o array. Ordene os posts por dia crescente.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 6000,
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  const parsed = JSON.parse(content) as { posts?: MarketingPostRico[] }
  const posts = parsed.posts ?? []

  // Ensure data field is properly formatted
  return posts.map((p) => ({
    ...p,
    data: p.data ?? `${ano}-${String(mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`,
    hashtags: (p.hashtags ?? []).slice(0, 15),
  }))
}
