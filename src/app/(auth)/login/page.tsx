import Link from 'next/link'
import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata = { title: 'Entrar — Doceria Pro' }

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">🎂</span>
            <span className="text-2xl font-bold text-gray-900">Doceria Pro</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Bem-vinda de volta!</h1>
          <p className="text-gray-600 mt-1">Entre na sua conta para continuar.</p>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
