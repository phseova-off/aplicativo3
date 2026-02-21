'use client'

import { useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { PostCard } from './PostCard'
import type { MarketingPostRico } from '../types/marketing.types'
import { FORMATO_COLORS } from '../types/marketing.types'

interface CalendarioMarketingProps {
  mes: number
  ano: number
  posts: MarketingPostRico[]
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function CalendarioMarketing({ mes, ano, posts }: CalendarioMarketingProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const diasNoMes = new Date(ano, mes, 0).getDate()
  const primeiroDia = new Date(ano, mes - 1, 1).getDay()  // 0=Sun

  // Map day → posts
  const postsByDay = new Map<number, MarketingPostRico[]>()
  for (const p of posts) {
    const day = p.dia
    if (!postsByDay.has(day)) postsByDay.set(day, [])
    postsByDay.get(day)!.push(p)
  }

  // Build calendar grid cells (null = empty leading/trailing)
  const cells: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedPosts = selectedDay ? (postsByDay.get(selectedDay) ?? []) : []

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-gray-500 border-r last:border-r-0 border-gray-100"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, week) => (
          <div key={week} className="grid grid-cols-7 border-b last:border-b-0 border-gray-100">
            {cells.slice(week * 7, week * 7 + 7).map((day, idx) => {
              const dayPosts = day ? (postsByDay.get(day) ?? []) : []
              const isSelected = day === selectedDay
              const hasPost = dayPosts.length > 0
              const isSpecial = dayPosts.some((p) => p.data_comemorativa)
              const today = new Date()
              const isToday =
                day === today.getDate() &&
                mes === today.getMonth() + 1 &&
                ano === today.getFullYear()

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (!day || !hasPost) return
                    setSelectedDay(isSelected ? null : day)
                  }}
                  className={cn(
                    'min-h-[64px] p-1.5 border-r last:border-r-0 border-gray-100 transition-colors',
                    day && hasPost ? 'cursor-pointer' : '',
                    day && hasPost && !isSelected ? 'hover:bg-gray-50' : '',
                    isSelected ? 'bg-primary-50' : '',
                    !day ? 'bg-gray-50/50' : ''
                  )}
                >
                  {day && (
                    <>
                      {/* Day number */}
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1',
                          isToday ? 'bg-primary-600 text-white' : 'text-gray-700',
                          isSpecial && !isToday ? 'bg-amber-100 text-amber-700' : ''
                        )}
                      >
                        {day}
                      </div>

                      {/* Post dots */}
                      <div className="flex flex-wrap gap-0.5">
                        {dayPosts.map((p, i) => {
                          const colorCls = FORMATO_COLORS[p.formato] ?? 'bg-gray-200'
                          // Extract bg class only
                          const bg = colorCls.split(' ')[0]
                          return (
                            <div
                              key={i}
                              className={cn('w-2 h-2 rounded-full', bg)}
                              title={`${p.formato} – ${p.tema}`}
                            />
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {[
          { label: 'Reels',     cls: 'bg-red-100'    },
          { label: 'Carrossel', cls: 'bg-blue-100'   },
          { label: 'Story',     cls: 'bg-purple-100' },
          { label: 'Feed',      cls: 'bg-green-100'  },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cn('w-2.5 h-2.5 rounded-full', cls)} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-100" />
          Data especial
        </span>
      </div>

      {/* Selected day posts */}
      {selectedDay && selectedPosts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Posts do dia {selectedDay}
          </h3>
          {selectedPosts.map((post, i) => (
            <PostCard key={i} post={post} isSpecial={!!post.data_comemorativa} />
          ))}
        </div>
      )}
    </div>
  )
}
