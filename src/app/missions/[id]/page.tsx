'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/app-shell'

type Mission = {
  id: string
  objective: string
  vendor_name: string | null
  product_name: string | null
  country: string | null
  technology_focus: string | null
  partner_types: string[]
  customer_segment: string | null
  status: string
  current_stage: string
  candidate_count: number
  result_summary: Record<string, unknown>
}

type Draft = {
  id: string
  subject: string
  body: string
  contact: Record<string, unknown>
  personalization_evidence: string[]
  status: string
  mission_approvals: { id: string; status: string }[]
}

const STAGES = [
  ['defined', 'Ready'],
  ['discovering', 'Discover'],
  ['researching', 'Research'],
  ['scored', 'Qualify'],
  ['dossier_ready', 'Select'],
  ['contacts_researched', 'Contacts'],
  ['draft_ready', 'Draft'],
  ['waiting_approval', 'Your approval'],
  ['sent', 'Send'],
  ['tracking', 'Track'],
  ['completed', 'Done'],
] as const

const STAGE_ORDER = STAGES.map(([id]) => id)

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const [mission, setMission] = useState<Mission | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [autoStarted, setAutoStarted] = useState(false)

  async function load(id: string) {
    const [m, d] = await Promise.all([
      fetch('/api/missions').then((r) => r.json()),
      fetch('/api/missions/' + id + '/drafts').then((r) => r.json()),
    ])
    const found = (m.missions || []).find((item: Mission) => item.id === id)
    if (!found) throw new Error('Mission not found.')
    setMission(found)
    setDrafts(d.drafts || [])
    return found as Mission
  }

  useEffect(() => {
    let active = true
    void params.then(({ id }) => load(id)).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Could not load mission.')
    })
    return () => { active = false }
  }, [params])

  useEffect(() => {
    if (!mission || autoStarted || busy || typeof window === 'undefined') return
    const autoStart = new URLSearchParams(window.location.search).get('autostart') === '1'
    if (!autoStart) return
    setAutoStarted(true)
    void runMission()
  }, [mission, autoStarted, busy])

  async function post(endpoint: string, body?: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'Action failed.')
    return payload
  }

  async function runMission() {
    if (!mission) return
    setBusy('run')
    setError('')
    setNotice('PortAi is running the mission end-to-end. You only need to step in when a decision requires you.')
    try {
      let current = mission
      let guard = 0

      while (!['waiting_approval', 'completed', 'tracking'].includes(current.current_stage) && guard++ < 5) {
        if (current.current_stage === 'defined' || current.current_stage === 'failed') {
          setNotice('Discovering and researching the best matching companies…')
          await post('/api/discovery', {
            missionId: current.id,
            country: current.country,
            technologyFocus: current.technology_focus,
            partnerTypes: current.partner_types,
            customerSegment: current.customer_segment,
            desiredCandidateCount: 10,
          })
        } else if (current.current_stage === 'dossier_ready') {
          setNotice('Selecting the strongest candidates and researching decision-makers…')
          await post('/api/missions/' + current.id + '/contacts')
        } else if (current.current_stage === 'contacts_researched' || current.current_stage === 'draft_ready') {
          setNotice('Preparing personalized outreach drafts from verified evidence…')
          await post('/api/missions/' + current.id + '/drafts')
        } else {
          break
        }
        current = await load(current.id)
      }

      if (current.current_stage === 'waiting_approval') {
        setNotice('Ready for your approval. PortAi stopped before any external message was sent.')
      } else if (current.current_stage === 'completed' || current.current_stage === 'tracking') {
        setNotice('Mission execution is complete for this run.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mission execution failed.')
    } finally {
      setBusy('')
      if (mission) await load(mission.id).catch(() => undefined)
    }
  }

  async function action(id: string, endpoint: string, body: Record<string, unknown>, message: string) {
    if (!mission) return
    setBusy(id + endpoint)
    setError('')
    setNotice('')
    try {
      await post(endpoint, body)
      await load(mission.id)
      setNotice(message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.')
    } finally {
      setBusy('')
    }
  }

  const activeIndex = useMemo(() => {
    if (!mission) return 0
    const index = STAGE_ORDER.indexOf(mission.current_stage as typeof STAGE_ORDER[number])
    return index >= 0 ? index : 0
  }, [mission])

  if (!mission) {
    return <AppShell title="Mission"><p className="text-sm text-slate-400">{error || 'Loading mission…'}</p></AppShell>
  }

  const summary = mission.result_summary || {}
  const isRunning = Boolean(busy)
  const waitingApproval = mission.current_stage === 'waiting_approval'
  const canRun = !isRunning && !waitingApproval && mission.current_stage !== 'completed'
  const selected = Number(summary.selected_for_research ?? mission.candidate_count ?? 0)
  const qualified = Number(summary.qualified ?? 0)
  const review = Number(summary.needs_review ?? 0)
  const contacts = Number(summary.contacts_found ?? 0)
  const draftsGenerated = Number(summary.drafts_generated ?? drafts.length)

  return <AppShell title="Mission execution" subtitle="Describe the outcome once. PortAi handles the work and pauses only when your judgment or approval is required.">
    <Link href="/workflow" className="text-sm text-blue-400">← Missions</Link>

    <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-400">Mission</p>
          <h1 className="mt-2 max-w-4xl text-2xl font-semibold">{mission.objective}</h1>
          <p className="mt-2 text-xs text-slate-500">PortAi works through the stages automatically.</p>
        </div>
        <span className="rounded-full border border-blue-900 px-3 py-1 text-xs text-blue-300">{mission.current_stage.replaceAll('_', ' ')}</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Discovered" value={summary.discovered ?? 0} />
        <Metric label="Qualified" value={qualified} />
        <Metric label="Needs review" value={review} />
        <Metric label="Selected" value={selected} />
        <Metric label="Contacts" value={contacts} />
      </div>
    </section>

    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-400">Autopilot execution</p>
          <h2 className="mt-1 text-lg font-semibold">One action. The AI does the rest.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Discovery, research, qualification, contact research and personalized drafting run automatically. PortAi never sends an external message without your approval.</p>
        </div>
        {canRun ? (
          <button disabled={isRunning} onClick={runMission} className="min-w-44 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-50">
            {busy === 'run' ? 'Working…' : mission.current_stage === 'failed' ? 'Retry mission →' : 'Run again →'}
          </button>
        ) : waitingApproval ? (
          <span className="rounded-xl border border-amber-900 bg-amber-950/20 px-5 py-3 text-sm font-semibold text-amber-300">Your approval is next</span>
        ) : null}
      </div>

      <div className="mt-7 grid gap-2 sm:grid-cols-5 lg:grid-cols-10">
        {STAGES.map(([id, label], index) => {
          const done = index < activeIndex
          const active = index === activeIndex
          return <div key={id} className="min-w-0">
            <div className={`h-1.5 rounded-full ${done ? 'bg-blue-500' : active ? 'bg-blue-400' : 'bg-slate-800'}`} />
            <p className={`mt-2 truncate text-xs ${active ? 'text-blue-300' : done ? 'text-slate-300' : 'text-slate-600'}`}>{label}</p>
          </div>
        })}
      </div>
    </section>

    {busy === 'run' ? <div className="mt-5 rounded-xl border border-blue-900/50 bg-blue-950/20 p-4 text-sm text-blue-200" aria-live="polite">{notice}</div> : null}
    {error ? <div className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">{error}</div> : null}
    {notice && busy !== 'run' ? <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">{notice}</div> : null}

    {waitingApproval ? <section className="mt-6 rounded-2xl border border-amber-900/50 bg-amber-950/10 p-6">
      <p className="text-xs uppercase tracking-wider text-amber-400">Human approval required</p>
      <h2 className="mt-1 text-xl font-semibold">{draftsGenerated} personalized draft{draftsGenerated === 1 ? '' : 's'} ready</h2>
      <p className="mt-2 text-sm text-slate-400">Review the evidence and approve only the messages you want PortAi to send. Nothing has been sent yet.</p>
    </section> : null}

    <section className="mt-6 space-y-4">
      {drafts.map((draft) => {
        const approval = draft.mission_approvals?.[0]
        const contactName = [draft.contact.first_name, draft.contact.last_name].filter(Boolean).join(' ') || 'Contact'
        const approved = approval?.status === 'approved' && draft.status === 'approved'
        return <article key={draft.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Outreach draft</p>
              <h2 className="mt-1 text-lg font-semibold">{contactName}</h2>
              <p className="text-xs text-slate-500">{String(draft.contact.email || 'No email revealed')}</p>
            </div>
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">{approved ? 'approved' : draft.status.replaceAll('_', ' ')}</span>
          </div>
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Subject</p>
            <p className="mt-1 font-medium">{draft.subject}</p>
            <p className="mt-5 text-xs uppercase tracking-wider text-slate-500">Message</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{draft.body}</p>
          </div>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Evidence used for personalization</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-400">{draft.personalization_evidence.map((item) => <li key={item}>• {item}</li>)}</ul>
          </div>
          {approval?.status === 'pending' ? <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={!!busy} onClick={() => action(draft.id, '/api/missions/' + mission.id + '/approvals/' + approval.id, { action: 'reject' }, 'Draft rejected.')} className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40">Reject</button>
            <button disabled={!!busy} onClick={() => action(draft.id, '/api/missions/' + mission.id + '/approvals/' + approval.id, { action: 'approve' }, 'Draft approved. It is still not sent.')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">Approve draft</button>
          </div> : null}
          {approved ? <button disabled={!!busy} onClick={() => action(draft.id, '/api/missions/' + mission.id + '/send', { draftId: draft.id }, 'Approved message sent.')} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">Send approved email</button> : null}
        </article>
      })}
    </section>
  </AppShell>
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-xl bg-slate-950 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{String(value)}</p></div>
}
