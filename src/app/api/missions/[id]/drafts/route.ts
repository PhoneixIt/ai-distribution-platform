import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { getOpenAIToken } from '@/lib/ai/openai'

type Context = { params: Promise<{ id: string }> }

type Draft = { dossier_id: string; subject: string; body: string; personalization_evidence: string[]; contact: Record<string, unknown> }

export async function POST(_request: Request, context: Context) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })
  const { id } = await context.params

  const missionResult = await supabase.from('missions').select('*').eq('id', id).maybeSingle()
  if (missionResult.error) return NextResponse.json({ error: missionResult.error.message }, { status: 500 })
  const mission = missionResult.data
  if (!mission) return NextResponse.json({ error: 'Mission not found.' }, { status: 404 })

  const dossierResult = await supabase.from('mission_dossiers').select('*').eq('mission_id', id).order('created_at')
  if (dossierResult.error) return NextResponse.json({ error: dossierResult.error.message }, { status: 500 })
  if (!dossierResult.data?.length) return NextResponse.json({ error: 'Contact dossiers are not ready.' }, { status: 409 })

  const apiKey = await getOpenAIToken().catch(() => null)
  if (!apiKey) return NextResponse.json({ error: 'OpenAI is not configured; personalized drafting cannot run without an AI provider.' }, { status: 503 })

  const input = dossierResult.data.slice(0,10).map((dossier) => ({
    dossier_id: dossier.id,
    mission: { objective: mission.objective, vendor: mission.vendor_name, product: mission.product_name, market: mission.market, country: mission.country, segment: mission.customer_segment },
    company: dossier.company,
    commercial: dossier.commercial,
    intelligence: dossier.intelligence,
    people: dossier.people,
  }))

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_AGENT_MODEL || 'gpt-5.6-luna',
      store: false,
      instructions: 'Write genuinely personalized first-touch B2B partner outreach. Use only the supplied evidence. Do not invent customer names, partnerships, certifications, products, numbers, or achievements. Explain in the evidence array exactly which dossier facts drove personalization. Keep the email concise and professional. If a contact has no usable email, still draft for review but mark that gap in evidence.',
      input: JSON.stringify(input),
      text: {
        format: {
          type: 'json_schema',
          name: 'mission_outreach_drafts',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              drafts: { type: 'array', items: { type: 'object', properties: { dossier_id: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, personalization_evidence: { type: 'array', items: { type: 'string' } } }, required: ['dossier_id','subject','body','personalization_evidence'], additionalProperties: false } }
            },
            required: ['drafts'], additionalProperties: false
          }
        }
      },
      max_output_tokens: 5000
    })
  })
  const raw = await response.text()
  let payload: Record<string, unknown> = {}
  try { payload = raw ? JSON.parse(raw) as Record<string, unknown> : {} } catch {}
  if (!response.ok) return NextResponse.json({ error: String((payload.error as Record<string, unknown> | undefined)?.message || 'OpenAI draft generation failed.') }, { status: 502 })
  const drafts = Array.isArray(payload.output_text) ? [] : JSON.parse(String(payload.output_text || '{"drafts":[]}')).drafts as Draft[]

  const created: unknown[] = []
  for (const draft of drafts) {
    const dossier = dossierResult.data.find((item) => item.id === draft.dossier_id)
    if (!dossier) continue
    const contact = Array.isArray(dossier.people) && dossier.people.length ? dossier.people[0] : {}
    const inserted = await supabase.from('mission_outreach_drafts').insert({
      org_id: mission.org_id, mission_id: id, dossier_id: dossier.id,
      contact, subject: draft.subject, body: draft.body,
      personalization_evidence: draft.personalization_evidence, status: 'pending_approval', created_by: user.id
    }).select('*').single()
    if (inserted.error) throw inserted.error
    const approval = await supabase.from('mission_approvals').insert({
      org_id: mission.org_id, mission_id: id, draft_id: inserted.data.id, requested_by: user.id, status: 'pending'
    }).select('*').single()
    if (approval.error) throw approval.error
    created.push(inserted.data)
  }

  await supabase.from('missions').update({
    current_stage: 'draft_ready', status: 'running',
    result_summary: { ...(mission.result_summary || {}), drafts_generated: created.length }
  }).eq('id', id)

  await supabase.from('missions').update({
    current_stage: 'waiting_approval', status: 'waiting_approval',
    result_summary: { ...(mission.result_summary || {}), drafts_generated: created.length, approvals_requested: created.length }
  }).eq('id', id)

  return NextResponse.json({ missionId: id, draftsGenerated: created.length, approvalsRequested: created.length, drafts: created })
}

export async function GET(_request: Request, context: Context) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })
  const { id } = await context.params
  const result = await supabase.from('mission_outreach_drafts').select('*,mission_approvals(*)').eq('mission_id', id).order('created_at')
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ drafts: result.data || [] })
}