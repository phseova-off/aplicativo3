'use client'

import { useCallback, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/server/db/client'
import type { AuthError, Session, User } from '@supabase/supabase-js'

const supabase = createSupabaseBrowserClient()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error: err }) => {
      setUser(data.user)
      setError(err)
    })

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setError(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err)
    return { error: err }
  }, [])

  const signUp = useCallback(async (email: string, password: string, nome?: string) => {
    setError(null)
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        data: nome ? { nome } : undefined,
      },
    })
    if (err) setError(err)
    return { error: err }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    const { error: err } = await supabase.auth.signOut()
    if (err) setError(err)
    return { error: err }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (err) setError(err)
    return { error: err }
  }, [])

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  }
}
