import { Sparkles } from 'lucide-react'

interface Props {
  sugestao: string
}

export function SugestaoIA({ sugestao }: Props) {
  return (
    <div className="bg-gradient-to-r from-primary-50 via-primary-50 to-purple-50 rounded-xl border border-primary-200 px-5 py-4 flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center mt-0.5">
        <Sparkles className="w-4 h-4 text-primary-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-primary-700 mb-1">Sugestão do dia • IA</p>
        <p className="text-sm text-gray-700 leading-relaxed">{sugestao}</p>
      </div>
    </div>
  )
}
