'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Modal } from '@/shared/components/ui/Modal'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { ResumoFinanceiro } from '@/features/financeiro/components/ResumoFinanceiro'
import { TransacaoList } from '@/features/financeiro/components/TransacaoList'
import { TransacaoForm } from '@/features/financeiro/components/TransacaoForm'
import { useTransacoes } from '@/features/financeiro/hooks/useFinanceiro'

export default function FinanceiroPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { data: transacoes, isLoading } = useTransacoes()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-1">
            Controle suas receitas e despesas
          </p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Nova transação
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <ResumoFinanceiro transacoes={transacoes ?? []} />

          <Card padding="none">
            <div className="p-6">
              <CardHeader>
                <CardTitle>Transações</CardTitle>
                <span className="text-sm text-gray-500">
                  {transacoes?.length ?? 0} registros
                </span>
              </CardHeader>
            </div>
            <TransacaoList transacoes={transacoes ?? []} />
          </Card>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Transação"
      >
        <TransacaoForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  )
}
