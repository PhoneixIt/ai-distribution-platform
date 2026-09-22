import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

type Context = { params: Promise<{ id: string }> }

function contactEmail(contact: Record<string, unknown>) {
  const value = contact.email
  return typeof value === 'string' && value.includes('@') ? value : ''
}

export async function POST(request: Request, context: Context) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })
  const { id } = await context.params
  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}
  const draftId = typeof body.draftId === 'string' ? body.draftId : ''
  if (!draftId) return NextResponse.json({ error: 'draftId is required.' }, { status: 400 })

  const mission = await supabase.from('missions').select('id,result_summary').eq('id', id).maybeSingle()
  if (mission.error) return NextResponse.json({ error: mission.error.message }, { status: 500 })
  if (!mission.data) return NextResponse.json({ error: 'Mission not found.' }, { status: 404 })

  const draft = await supabase.from('mission_outreach_drafts').select('*,mission_approvals(*)').eq('id', draftId).eq('mission_id', id).maybeSingle()
  if (draft.error) return NextResponse.json({ error: draft.error.message }, { status: 500 })
  if (!draft.data) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 })

  const approval = Array.isArray(draft.data.mission_approvals) ? draft.data.mission_approvals[0] : null
  if (!approval || approval.status !== 'approved' || draft.data.status !== 'approved') {
    return NextResponse.json({ error: 'The draft must be explicitly approved in PortAi before sending.' }, { status: 403 })
  }

  const contact = draft.data.contact && typeof draft.data.contact === 'object' ? draft.data.contact as Record<string, unknown> : {}
  const to = contactEmail(contact)
  if (!to) return NextResponse.json({ error: 'Approved draft has no usable contact email.' }, { status: 409 })

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return NextResponse.json({ error: 'Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL before sending.' }, { status: 503 })

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: draft.data.subject, text: draft.data.body }),
  })
  const raw = await response.text()
  let payload: unknown = {}
  try { payload = raw ? JSON.parse(raw) : {} } catch {}
  if (!response.ok) return NextResponse.json({ error: 'Resend rejected the send request.', provider: payload }, { status: 502 })

  await supabase.from('mission_outreach_drafts').update({ status: 'sent', send_result: payload }).eq('id', draftId)
  await supabase.from('missions').update({
    current_stage: 'sent', status: 'running',
    result_summary: { ...(mission.data.result_summary || {}), last_sent_draft_id: draftId, sent_at: new Date().toISOString() }
  }).eq('id', id)

  await supabase.from('missions').update({
    current_stage: 'tracking', status: 'running'
  }).eq('id', id)

  return NextResponse.json({ success: true, draftId, provider: payload })
}