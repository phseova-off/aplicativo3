import { OnboardingForm } from '@/features/auth/components/OnboardingForm'

export const metadata = { title: 'Configure sua doceria — Doceria Pro' }

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-4">🎂</span>
          <h1 className="text-2xl font-bold text-gray-900">Vamos configurar sua doceria!</h1>
          <p className="text-gray-600 mt-2">
            Essas informações ajudam a personalizar sua experiência.
          </p>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          <OnboardingForm />
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          Você pode atualizar isso mais tarde nas configurações.
        </p>
      </div>
    </div>
  )
}
