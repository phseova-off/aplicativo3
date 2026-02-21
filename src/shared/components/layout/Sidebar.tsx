'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  CakeSlice,
  TrendingUp,
  Megaphone,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/producao', label: 'Produção', icon: CakeSlice },
  { href: '/financeiro', label: 'Financeiro', icon: TrendingUp },
  { href: '/marketing/cronograma', label: 'Marketing', icon: Megaphone },
]

const bottomLinks = [
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 h-16 px-4 border-b border-gray-100', collapsed && 'justify-center px-2')}>
        <span className="text-2xl flex-shrink-0">🎂</span>
        {!collapsed && (
          <span className="font-bold text-gray-900 whitespace-nowrap">Doceria Pro</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('flex-shrink-0', isActive ? 'text-primary-600' : 'text-gray-400', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav links (Configurações etc.) */}
      <nav className="px-2 pb-1 space-y-1 border-t border-gray-100 pt-2">
        {bottomLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                ${collapsed ? 'justify-center px-2' : ''}
              `}
            >
              <Icon className={`flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400'} ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-100 space-y-1">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium',
            'text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className={cn('flex-shrink-0 text-gray-400', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
          {!collapsed && <span>Sair</span>}
        </button>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center w-full py-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
