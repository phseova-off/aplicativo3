import { cn } from '@/shared/lib/utils'

function Pulse({ className }: { className?: string }) {
  return <div className={cn('bg-gray-200 animate-pulse rounded', className)} />
}

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-7 w-32" />
              <Pulse className="h-3 w-16" />
            </div>
            <Pulse className="w-11 h-11 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ParaFazerSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <Pulse className="h-4 w-36" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Pulse className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Pulse className="h-3 w-40" />
            <Pulse className="h-3 w-24" />
          </div>
          <Pulse className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function SparklineSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <Pulse className="h-4 w-40 mb-4" />
      <Pulse className="h-20 w-full rounded-lg" />
    </div>
  )
}

export function ProximosPedidosSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <Pulse className="h-4 w-36" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0">
          <div className="flex-1 space-y-1.5">
            <Pulse className="h-3 w-32" />
            <Pulse className="h-3 w-20" />
          </div>
          <Pulse className="h-5 w-20 rounded-full" />
          <Pulse className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SugestaoSkeleton() {
  return (
    <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200 p-5">
      <Pulse className="h-4 w-32 bg-primary-200 mb-3" />
      <Pulse className="h-4 w-full bg-primary-200 mb-2" />
      <Pulse className="h-4 w-3/4 bg-primary-200" />
    </div>
  )
}
