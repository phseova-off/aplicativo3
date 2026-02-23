import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/server/db/client'

export async function POST() {
  // Identify the requesting user via their session cookie
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Use service role to delete the auth user (bypasses RLS intentionally)
  const admin = createSupabaseServiceClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('[conta/deletar] error deleting user', { userId: user.id, error })
    return NextResponse.json({ error: 'Erro ao deletar conta' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
