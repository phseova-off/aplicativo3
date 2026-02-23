import Link from 'next/link'
import { CadastroForm } from '@/features/auth/components/CadastroForm'

export const metadata = { title: 'Criar conta — Doceria Pro' }

interface Props {
  searchParams: Promise<{ ref?: string }>
}

export default async function CadastroPage({ searchParams }: Props) {
  const { ref } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">🎂</span>
            <span className="text-2xl font-bold text-gray-900">Doceria Pro</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Crie sua conta grátis</h1>
          <p className="text-gray-600 mt-1">Organize sua doceria em minutos.</p>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          <CadastroForm refConfeitariaId={ref} />
        </div>
      </div>
    </div>
  )
}
