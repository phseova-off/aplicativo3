import { cn } from '@/shared/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
  shadow?: boolean
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className, padding = 'md', shadow = false }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200',
        paddingStyles[padding],
        shadow && 'shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>{children}</div>
  )
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h3 className={cn('text-base font-semibold text-gray-900', className)}>{children}</h3>
  )
}
