import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/server/db/client'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { FeedbackButton } from '@/features/feedback/components/FeedbackButton'

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

  // Prefer v2 confeitarias table; fall back to legacy confeiteiros
  const { data: confeitaria } = await supabase
    .from('confeitarias')
    .select('nome, plano, onboarding_completo')
    .eq('id', user.id)
    .maybeSingle()

  if (!confeitaria?.onboarding_completo) {
    redirect('/onboarding')
  }

  return (
    <>
      <AppLayout
        userName={confeitaria?.nome ?? user.email ?? 'Usuário'}
        planName={confeitaria?.plano ?? 'free'}
      >
        {children}
      </AppLayout>
      <FeedbackButton />
    </>
  )
}
