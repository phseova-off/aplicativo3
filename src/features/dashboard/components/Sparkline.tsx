import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import type { SparklinePoint } from '../types/dashboard.types'

interface SparklineProps {
  points: SparklinePoint[]
}

const WIDTH = 600
const HEIGHT = 80
const PAD = 4

export function Sparkline({ points }: SparklineProps) {
  const max = Math.max(...points.map((p) => p.quantidade), 1)
  const total = points.reduce((s, p) => s + p.quantidade, 0)

  // Build SVG polyline coords
  const coords = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (WIDTH - PAD * 2)
    const y = PAD + (1 - p.quantidade / max) * (HEIGHT - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  // Area fill: close the path by going bottom-right → bottom-left
  const areaCoords = [
    ...coords,
    `${(PAD + WIDTH - PAD * 2).toFixed(1)},${(HEIGHT - PAD).toFixed(1)}`,
    `${PAD.toFixed(1)},${(HEIGHT - PAD).toFixed(1)}`,
  ].join(' ')

  // Last 7 days vs previous 7 days
  const last7  = points.slice(-7).reduce((s, p) => s + p.quantidade, 0)
  const prev7  = points.slice(-14, -7).reduce((s, p) => s + p.quantidade, 0)
  const trend  = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos — últimos 30 dias</CardTitle>
        <div className="text-right">
          <span className="text-lg font-bold text-gray-900">{total}</span>
          {trend !== null && (
            <span className={`ml-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(0)}% vs semana anterior
            </span>
          )}
        </div>
      </CardHeader>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-20"
        preserveAspectRatio="none"
        aria-label="Gráfico de pedidos dos últimos 30 dias"
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"    />
          </linearGradient>
        </defs>
        {/* Area */}
        <polygon points={areaCoords} fill="url(#sparkGrad)" />
        {/* Line */}
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dots on non-zero days */}
        {points.map((p, i) => {
          if (p.quantidade === 0) return null
          const x = PAD + (i / (points.length - 1)) * (WIDTH - PAD * 2)
          const y = PAD + (1 - p.quantidade / max) * (HEIGHT - PAD * 2)
          return (
            <circle key={i} cx={x} cy={y} r="3" fill="#7c3aed">
              <title>{p.data}: {p.quantidade} pedido{p.quantidade !== 1 ? 's' : ''}</title>
            </circle>
          )
        })}
      </svg>

      {/* Day labels: only first, mid, last */}
      <div className="flex justify-between mt-1 px-0.5 text-xs text-gray-400">
        <span>{formatDayLabel(points[0]?.data)}</span>
        <span>{formatDayLabel(points[Math.floor(points.length / 2)]?.data)}</span>
        <span>{formatDayLabel(points[points.length - 1]?.data)}</span>
      </div>
    </Card>
  )
}

function formatDayLabel(iso?: string): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
