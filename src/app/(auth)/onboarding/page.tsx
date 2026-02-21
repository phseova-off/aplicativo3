import { OnboardingWizard } from '@/features/auth/components/OnboardingWizard'

export const metadata = { title: 'Configure sua doceria — Doceria Pro' }

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo header */}
        <div className="text-center mb-6">
          <span className="text-5xl block mb-3">🎂</span>
          <h1 className="text-2xl font-bold text-gray-900">Doceria Pro</h1>
          <p className="text-gray-500 text-sm mt-1">Configure seu negócio em 4 passos</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          <OnboardingWizard />
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Você pode atualizar tudo isso mais tarde em Configurações.
        </p>
      </div>
    </div>
  )
}
