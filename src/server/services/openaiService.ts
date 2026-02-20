import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

Retorne APENAS um JSON válido no formato:
[
  {
    "dia": 1,
    "plataforma": "Instagram",
    "tema": "Tema do post",
    "legenda": "Legenda completa do post com emojis",
    "hashtags": ["#doceria", "#confeitaria"],
    "horario_sugerido": "19:00"
  }
]`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  const parsed = JSON.parse(content) as { posts?: MarketingPost[] } | MarketingPost[]
  // Handle both { posts: [...] } and [...] response shapes
  const posts = Array.isArray(parsed) ? parsed : (parsed as { posts?: MarketingPost[] }).posts ?? []

  return posts
}
