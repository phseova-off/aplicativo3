import type { MarketingPost } from '@/server/services/openaiService'

export type { MarketingPost }

export interface MarketingCronogramaInput {
  tipo_negocio: string
  publico_alvo: string
  periodo_dias: number
  foco: string
}

export const TIPOS_NEGOCIO = [
  'Confeitaria artesanal',
  'Doceria fina',
  'Bolos personalizados',
  'Doces para festas',
  'Brigadeiros gourmet',
  'Bolos fitness/veganos',
] as const

export const PUBLICOS_ALVO = [
  'Mães com filhos pequenos',
  'Festas e eventos',
  'Casamentos e datas especiais',
  'Público fitness/saudável',
  'Corporativo',
  'Público geral',
] as const

export const FOCOS_PERIODO = [
  'Vender mais',
  'Ganhar seguidores',
  'Mostrar bastidores',
  'Lançar produto novo',
  'Data comemorativa',
  'Depoimentos de clientes',
] as const
