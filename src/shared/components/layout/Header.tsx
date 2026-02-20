'use client'

import { Bell, User } from 'lucide-react'
import { getInitials } from '@/shared/lib/utils'

interface HeaderProps {
  userName?: string
  planName?: string
}

const planColors: Record<string, string> = {
  gratuito: 'bg-gray-100 text-gray-600',
  basico: 'bg-primary-100 text-primary-700',
  pro: 'bg-amber-100 text-amber-700',
}

const planLabels: Record<string, string> = {
  gratuito: 'Gratuito',
  basico: 'Básico',
  pro: 'Pro',
}

export function Header({ userName = 'Usuário', planName = 'gratuito' }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-4">
        {/* Plan badge */}
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planColors[planName] ?? planColors.gratuito}`}
        >
          {planLabels[planName] ?? 'Gratuito'}
        </span>

        {/* Notifications placeholder */}
        <button
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-700">
              {getInitials(userName)}
            </span>
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[140px] truncate">
            {userName}
          </span>
        </div>
      </div>
    </header>
  )
}
