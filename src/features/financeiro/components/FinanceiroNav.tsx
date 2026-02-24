'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowUpDown, Calculator, Users } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const TABS = [
  { href: '/financeiro',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/financeiro/transacoes',  label: 'Transações',   icon: ArrowUpDown },
  { href: '/financeiro/precificacao',label: 'Precificação', icon: Calculator },
  { href: '/financeiro/clientes',    label: 'Clientes',     icon: Users },
]

export function FinanceiroNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-0.5 border-b border-gray-200 mb-6 overflow-x-auto">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              isActive
                ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
