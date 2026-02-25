'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/ui/Button'
import { PlanoGate } from '@/features/planos/components/PlanoGate'
import { formatCurrency, formatDate } from '@/shared/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────

function labelMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(ano, m - 1, 1)
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

interface Transacao {
  data: string
  tipo: string
  categoria: string
  descricao: string | null
  valor: number
  origem?: string | null
}

// ─── PDF generation (lazy-loaded) ────────────────────────────

async function gerarPDF(mes: string, nomeConfeitaria: string) {
  // Fetch data
  const [resumoRes, txRes] = await Promise.all([
    fetch(`/api/financeiro/resumo?mes=${mes}`),
    fetch(`/api/financeiro?mes=${mes}&limit=500`),
  ])

  if (!resumoRes.ok || !txRes.ok) throw new Error('Erro ao buscar dados')

  const resumo = await resumoRes.json()
  const txData = await txRes.json()
  const transacoes: Transacao[] = txData.data ?? []

  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const largura = doc.internal.pageSize.getWidth()
  const mesLabel = labelMes(mes)

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(217, 70, 239) // primary-500 purple
  doc.rect(0, 0, largura, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Doceria Pro', 14, 12)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Relatório Financeiro — ${mesLabel}`, 14, 20)
  doc.text(nomeConfeitaria, largura - 14, 20, { align: 'right' })

  // ── Resumo ──────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo do Mês', 14, 38)

  const resumoRows = [
    ['Total de Receitas', formatCurrency(resumo.receitas)],
    ['Total de Despesas', formatCurrency(resumo.despesas)],
    ['Lucro Líquido', formatCurrency(resumo.lucroLiquido)],
  ]

  autoTable(doc, {
    startY: 42,
    head: [],
    body: resumoRows,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { textColor: [80, 80, 80], cellWidth: 100 },
      1: {
        fontStyle: 'bold',
        halign: 'right',
        textColor: resumo.lucroLiquido >= 0 ? [22, 163, 74] : [220, 38, 38],
      },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Despesas por categoria ───────────────────────────────────
  const despesasCats = Object.entries(resumo.despesasPorCategoria ?? {})
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))

  if (despesasCats.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastY = (doc as any).lastAutoTable?.finalY ?? 60
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Despesas por Categoria', 14, lastY + 10)

    autoTable(doc, {
      startY: lastY + 14,
      head: [['Categoria', 'Valor']],
      body: despesasCats.map(([cat, val]) => [cat, formatCurrency(val as number)]),
      theme: 'striped',
      headStyles: { fillColor: [217, 70, 239], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  // ── Transactions table ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastY2 = (doc as any).lastAutoTable?.finalY ?? 80

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Lançamentos', 14, lastY2 + 10)

  autoTable(doc, {
    startY: lastY2 + 14,
    head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']],
    body: transacoes.map((t) => [
      formatDate(t.data),
      t.tipo === 'receita' ? 'Receita' : 'Despesa',
      t.categoria,
      t.descricao ?? '—',
      (t.tipo === 'receita' ? '+' : '-') + formatCurrency(t.valor),
    ]),
    headStyles: { fillColor: [217, 70, 239], textColor: 255, fontStyle: 'bold' },
    theme: 'striped',
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Footer ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Gerado por Doceria Pro em ${new Date().toLocaleDateString('pt-BR')} — Página ${i} de ${pageCount}`,
      largura / 2, doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    )
  }

  doc.save(`relatorio-${mes}.pdf`)
}

// ─── Button ───────────────────────────────────────────────────

function RelatorioButton({ mes }: { mes: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await gerarPDF(mes, 'Minha Confeitaria')
      toast.success('PDF gerado com sucesso!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      leftIcon={
        loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <FileDown className="w-3.5 h-3.5" />
      }
    >
      {loading ? 'Gerando PDF…' : 'Exportar PDF'}
    </Button>
  )
}

// ─── Exported component (wrapped in PlanoGate) ────────────────

export function RelatorioExporter({ mes }: { mes: string }) {
  return (
    <PlanoGate planoMinimo="pro" feature="relatorio_pdf">
      <RelatorioButton mes={mes} />
    </PlanoGate>
  )
}
