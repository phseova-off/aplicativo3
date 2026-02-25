import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { Resend } from 'resend'
import { z } from 'zod'

const schema = z.object({
  tipo: z.enum(['geral', 'bug', 'sugestao']),
  texto: z.string().min(5).max(2000),
})

const tipoLabel: Record<string, string> = {
  geral: 'Geral',
  bug: '🐛 Bug',
  sugestao: '💡 Sugestão',
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const body = await request.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { tipo, texto } = parsed.data

  // Get user email/nome if logged in
  let userEmail: string | null = null
  let userNome: string | null = null

  if (user) {
    userEmail = user.email ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('confeitaria_membros')
      .select('confeitarias(nome)')
      .eq('user_id', user.id)
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userNome = (profile as any)?.confeitarias?.nome ?? null
  }

  // Save to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase as any).from('feedbacks').insert({
    user_id: user?.id ?? null,
    tipo,
    texto,
    user_email: userEmail,
    user_nome: userNome,
  })

  if (dbError) {
    console.error('[feedback] db error:', dbError)
    return NextResponse.json({ error: 'Erro ao salvar feedback' }, { status: 500 })
  }

  // Send email via Resend (non-fatal)
  const resendKey = process.env.RESEND_API_KEY
  const toEmail = process.env.FEEDBACK_EMAIL_TO

  if (resendKey && toEmail) {
    try {
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: 'Doceria Pro <feedback@doceriapro.com.br>',
        to: toEmail,
        subject: `[Feedback Beta] ${tipoLabel[tipo]} — ${userNome ?? userEmail ?? 'Anônimo'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #d946ef; padding: 20px 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 18px;">Novo Feedback — Doceria Pro Beta</h1>
            </div>
            <div style="background: #fafafa; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 110px;">Tipo</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600;">${tipoLabel[tipo]}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Usuário</td>
                  <td style="padding: 6px 0; font-size: 13px;">${userNome ?? '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Email</td>
                  <td style="padding: 6px 0; font-size: 13px;">${userEmail ?? '—'}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${texto}</p>
            </div>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error('[feedback] email error:', emailErr)
      // Non-fatal — feedback was already saved
    }
  }

  return NextResponse.json({ success: true })
}
