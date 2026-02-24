'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/server/db/client'
import type { User } from '@supabase/supabase-js'

type BrowserClient = ReturnType<typeof createSupabaseBrowserClient>

interface AuthContextValue {
  supabase: BrowserClient
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const value = useMemo(() => ({ supabase, user, loading }), [supabase, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useSupabase() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useSupabase must be used inside <AuthProvider>')
  return ctx
}
