import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/server/db/client'
import { AppLayout } from '@/shared/components/layout/AppLayout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome_negocio, plano, onboarding_completo')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completo) {
    redirect('/onboarding')
  }

  return (
    <AppLayout
      userName={profile?.nome_negocio ?? user.email ?? 'Usuário'}
      planName={profile?.plano ?? 'gratuito'}
    >
      {children}
    </AppLayout>
  )
}
