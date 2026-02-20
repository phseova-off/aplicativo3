'use client'

import { Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { MarketingForm } from '@/features/marketing/components/MarketingForm'
import { CronogramaViewer } from '@/features/marketing/components/CronogramaViewer'
import { useCronogramas } from '@/features/marketing/hooks/useMarketing'

export default function MarketingPage() {
  const { data: cronogramas, isLoading } = useCronogramas()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing com IA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gere cronogramas de conteúdo para redes sociais automaticamente
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form column */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Gerar Cronograma</CardTitle>
              <Sparkles className="w-4 h-4 text-primary-600" />
            </CardHeader>
            <MarketingForm />
          </Card>
        </div>

        {/* Results column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Cronogramas Gerados
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : cronogramas && cronogramas.length > 0 ? (
            cronogramas.map((cronograma) => (
              <CronogramaViewer key={cronograma.id} cronograma={cronograma} />
            ))
          ) : (
            <Card>
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">Nenhum cronograma ainda</p>
                <p className="text-sm mt-1">
                  Use o formulário ao lado para gerar seu primeiro cronograma de conteúdo.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
