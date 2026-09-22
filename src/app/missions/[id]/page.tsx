'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'

type Mission = {
  id: string
  objective: string
  vendor_name: string | null
  product_name: string | null
  country: string | null
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

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const [mission, setMission] = useState<Mission | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  async function load(id: string) {
    const [m, d] = await Promise.all([
      fetch('/api/missions').then((r) => r.json()),
      fetch('/api/missions/' + id + '/drafts').then((r) => r.json()),
    ])
    const found = (m.missions || []).find((item: Mission) => item.id === id)
    if (!found) throw new Error('Mission not found.')
    setMission(found)
    setDrafts(d.drafts || [])
  }

  useEffect(() => {
    let active = true
    void params.then(({ id }) => load(id)).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Could not load mission.') })
    return () => { active = false }
  }, [params])

  async function action(id: string, endpoint: string, body: Record<string, unknown>) {
    setBusy(id + endpoint); setError(''); setNotice('')
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Action failed.')
      const missionId = mission?.id
      if (missionId) await load(missionId)
      setNotice('Action completed.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed.') }
    finally { setBusy('') }
  }

  async function runStage(endpoint: string, label: string) {
    if (!mission) return
    setBusy(label); setError(''); setNotice('')
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Stage failed.')
      await load(mission.id)
      setNotice(label + ' completed.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Stage failed.') }
    finally { setBusy('') }
  }

  if (!mission) return <AppShell title="Mission"><p className="text-sm text-slate-400">{error || 'Loading mission…'}</p></AppShell>

  const summary = mission.result_summary || {}
  return <AppShell title="Mission execution" subtitle="Evidence-backed work stays visible; external communication remains blocked until you explicitly approve a draft.">
    <Link href="/workflow" className="text-sm text-blue-400">← Missions</Link>
    <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-xs uppercase tracking-wider text-blue-400">Mission</p><h1 className="mt-2 text-2xl font-semibold">{mission.objective}</h1><p className="mt-2 text-xs text-slate-500">{mission.id}</p></div>
        <span className="rounded-full border border-blue-900 px-3 py-1 text-xs text-blue-300">{mission.current_stage.replaceAll('_',' ')}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Discovered" value={summary.discovered ?? 0} />
        <Metric label="Qualified" value={summary.qualified ?? 0} />
        <Metric label="Selected" value={mission.candidate_count} />
        <Metric label="Contacts" value={summary.contacts_found ?? 0} />
        <Metric label="Apollo credits" value={summary.apollo_credits_consumed ?? 0} />
      </div>
    </section>

    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-blue-400">Execution stages</p><h2 className="mt-1 text-lg font-semibold">Contact research → personalized draft → human approval → send</h2></div><span className="text-xs text-slate-500">No automatic send</span></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={!!busy || mission.current_stage !== 'dossier_ready'} onClick={() => runStage('/api/missions/' + mission.id + '/contacts','Contact research')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">Research contacts</button>
        <button disabled={!!busy || !['contacts_researched','draft_ready'].includes(mission.current_stage)} onClick={() => runStage('/api/missions/' + mission.id + '/drafts','Generate drafts')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">Generate drafts</button>
      </div>
    </section>

    {error ? <div className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">{error}</div> : null}
    {notice ? <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">{notice}</div> : null}

    <section className="mt-6 space-y-4">
      {drafts.map((draft) => {
        const approval = draft.mission_approvals?.[0]
        const contactName = [draft.contact.first_name, draft.contact.last_name].filter(Boolean).join(' ') || 'Contact'
        return <article key={draft.id} className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs uppercase tracking-wider text-amber-400">Human approval required</p><h2 className="mt-1 text-lg font-semibold">{contactName}</h2><p className="text-xs text-slate-500">{String(draft.contact.email || 'No email revealed')}</p></div><span className="rounded-full border border-amber-900 px-2.5 py-1 text-xs text-amber-300">{draft.status.replaceAll('_',' ')}</span></div>
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Subject</p><p className="mt-1 font-medium">{draft.subject}</p><p className="mt-5 text-xs uppercase tracking-wider text-slate-500">Message</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{draft.body}</p></div>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Why this is personalized</p><ul className="mt-2 space-y-2 text-sm text-slate-400">{draft.personalization_evidence.map((item) => <li key={item}>• {item}</li>)}</ul></div>
          {approval?.status === 'pending' ? <div className="mt-4 flex flex-wrap gap-2"><button disabled={!!busy} onClick={() => action(draft.id,'/api/missions/' + mission.id + '/approvals/' + approval.id,{action:'reject'})} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Reject</button><button disabled={!!busy} onClick={() => action(draft.id,'/api/missions/' + mission.id + '/approvals/' + approval.id,{action:'approve'})} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">Approve draft</button></div> : null}
          {approval?.status === 'approved' && draft.status === 'approved' ? <button disabled={!!busy} onClick={() => action(draft.id,'/api/missions/' + mission.id + '/send',{draftId:draft.id})} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">Send approved email</button> : null}
        </article>
      })}
    </section>
  </AppShell>
}

function Metric({ label, value }: { label: string; value: unknown }) { return <div className="rounded-xl bg-slate-950 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{String(value)}</p></div> }