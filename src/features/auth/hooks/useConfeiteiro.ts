'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/server/db/client'
import type { Confeiteiro } from '@/server/db/types'

interface UseConfeiteiroResult {
  confeiteiro: Confeiteiro | null
  loading: boolean
  refresh: () => Promise<void>
}

export function useConfeiteiro(): UseConfeiteiroResult {
  const [confeiteiro, setConfeiteiro] = useState<Confeiteiro | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfeiteiro = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setConfeiteiro(null)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('confeiteiros')
      .select('*')
      .eq('id', user.id)
      .single()

    // The Supabase generic may not resolve the type correctly here;
    // we cast since the query is typed at the DB level.
    setConfeiteiro(data as unknown as Confeiteiro)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConfeiteiro()
  }, [fetchConfeiteiro])

  return { confeiteiro, loading, refresh: fetchConfeiteiro }
}
