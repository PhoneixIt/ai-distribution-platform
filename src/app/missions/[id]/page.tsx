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
  technology_focus: string | null
  partner_types: string[]
  customer_segment: string | null
  status: string
  current_stage: string
  candidate_count: number
  result_summary: Record<string, unknown>
  error_message: string | null
}

type Draft = {
  id: string
  dossier_id: string
  subject: string
  body: string
  contact: Record<string, unknown>
  personalization_evidence: string[]
  status: string
  mission_approvals: { id: string; status: string }[]
}

type Dossier = {
  id: string
  company: Record<string, unknown>
  intelligence: Record<string, unknown>
  recommended_action: Record<string, unknown>
}

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const [mission, setMission] = useState<Mission | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
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
    setDossiers(d.dossiers || [])
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
      const payload = await readJson(response)
      if (!response.ok) throw new Error(payload.error || 'Action failed.')
      const missionId = mission?.id
      if (missionId) await load(missionId)
      setNotice('Action completed.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed.') }
    finally { setBusy('') }
  }

  async function startDiscovery() {
    if (!mission) return
    setBusy('Start discovery'); setError(''); setNotice('')
    try {
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: mission.id,
          country: mission.country,
          technologyFocus: mission.technology_focus,
          partnerTypes: mission.partner_types,
          customerSegment: mission.customer_segment,
          desiredCandidateCount: 200,
        }),
      })
      const payload = await readJson(response)
      if (!response.ok) throw new Error(payload.error || 'Discovery failed.')
      await load(mission.id)
      setNotice('Discovery completed. PortAi has prepared the candidates for review.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discovery failed.')
    } finally {
      setBusy('')
    }
  }

  async function runStage(endpoint: string, label: string) {
    if (!mission) return
    setBusy(label); setError(''); setNotice('')
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const payload = await readJson(response)
      if (!response.ok) throw new Error(payload.error || 'Stage failed.')
      await load(mission.id)
      setNotice(label + ' completed.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Stage failed.') }
    finally { setBusy('') }
  }

  if (!mission) return <AppShell title="Mission"><p className="text-sm text-slate-600">{error || 'Loading missionâ€¦'}</p></AppShell>

  const summary = mission.result_summary || {}
  return <AppShell title="Mission execution" subtitle="Evidence-backed work stays visible; external communication remains blocked until you explicitly approve a draft.">
    <Link href="/workflow" className="text-sm text-blue-600">â† Missions</Link>
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-xs uppercase tracking-wider text-blue-600">Mission</p><h1 className="mt-2 text-2xl font-semibold">{mission.objective}</h1><p className="mt-2 text-xs text-slate-500">{mission.id}</p></div>
        <span className="rounded-full border border-blue-200 px-3 py-1 text-xs text-blue-700">{mission.current_stage.replaceAll('_',' ')}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Discovered" value={summary.discovered ?? 0} />
        <Metric label="Verified" value={summary.verified ?? 0} />
        <Metric label="Qualified" value={summary.qualified ?? 0} />
        <Metric label="Selected" value={summary.selected ?? 0} />
        <Metric label="Research failed" value={summary.research_failed ?? 0} />
        <Metric label="Contacts" value={summary.contacts_found ?? 0} />
        <Metric label="Apollo credits" value={summary.hunter_credits_consumed ?? 0} />
      </div>
    </section>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-blue-600">Execution stages</p><h2 className="mt-1 text-lg font-semibold">Contact research â†’ personalized draft â†’ human approval â†’ send</h2></div><span className="text-xs text-slate-500">No automatic send</span></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {mission.current_stage === 'defined' || mission.current_stage === 'failed' ? <button disabled={!!busy} onClick={startDiscovery} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">{busy === 'Start discovery' ? 'Discoveringâ€¦' : 'Start discovery â†’'}</button> : null}
        <button disabled={!!busy || mission.current_stage !== 'dossier_ready'} onClick={() => runStage('/api/missions/' + mission.id + '/contacts','Contact research')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">Research contacts</button>
        <button disabled={!!busy || !['contacts_researched','draft_ready'].includes(mission.current_stage)} onClick={() => runStage('/api/missions/' + mission.id + '/drafts','Generate drafts')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">Generate drafts</button>
      </div>
    </section>

    {mission.error_message ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Mission failed: {mission.error_message}</div> : null}
    {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
    {notice ? <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{notice}</div> : null}

    <section className="mt-6 space-y-4">
      {drafts.map((draft) => {
        const approval = draft.mission_approvals?.[0]
        const dossier = dossiers.find((item) => item.id === draft.dossier_id)
        const intelligence = dossier?.intelligence || {}
        const companyName = String(dossier?.company.name || 'Company dossier unavailable')
        const evidence = Array.isArray(intelligence.evidence) ? intelligence.evidence : []
        const qualificationReasons = Array.isArray(intelligence.reasons) ? intelligence.reasons : []
        const contactName = [draft.contact.first_name, draft.contact.last_name].filter(Boolean).join(' ') || 'Contact'
        return <article key={draft.id} className="rounded-2xl border border-amber-200/50 bg-amber-50 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs uppercase tracking-wider text-amber-700">Human approval required</p><h2 className="mt-1 text-lg font-semibold">{contactName}</h2><p className="text-xs text-slate-500">{String(draft.contact.email || 'No email revealed')}</p></div><span className="rounded-full border border-amber-200 px-2.5 py-1 text-xs text-amber-700">{draft.status.replaceAll('_',' ')}</span></div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Qualified company dossier</p>
            <h3 className="mt-1 font-semibold">{companyName}</h3>
            {dossier ? <>
              <p className="mt-1 text-sm text-slate-600">{String(dossier.company.country || 'Country unavailable')} Â· {String(dossier.company.website || 'Website unavailable')}</p>
              <p className="mt-3 text-xs text-slate-500">Qualification score: {String(intelligence.qualification_score ?? 'not recorded')}</p>
              {qualificationReasons.length ? <ul className="mt-2 space-y-1 text-sm text-slate-600">{qualificationReasons.map((item, index) => <li key={`${index}-${String(item)}`}>â€¢ {String(item)}</li>)}</ul> : null}
              {evidence.length ? <details className="mt-3"><summary className="cursor-pointer text-sm text-blue-600">Qualification evidence ({evidence.length})</summary><ul className="mt-2 space-y-2 text-sm text-slate-600">{evidence.map((item, index) => <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ul></details> : <p className="mt-2 text-sm text-slate-500">No qualification evidence was recorded.</p>}
              {dossier.recommended_action.rationale ? <p className="mt-3 text-sm text-slate-600">Next action: {String(dossier.recommended_action.rationale)}</p> : null}
            </> : <p className="mt-2 text-sm text-red-700">The draftâ€™s saved dossier could not be loaded, so review the source mission data before approving.</p>}
          </div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Subject</p><p className="mt-1 font-medium">{draft.subject}</p><p className="mt-5 text-xs uppercase tracking-wider text-slate-500">Message</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{draft.body}</p></div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Why this is personalized</p><ul className="mt-2 space-y-2 text-sm text-slate-600">{draft.personalization_evidence.map((item) => <li key={item}>â€¢ {item}</li>)}</ul></div>
          {approval?.status === 'pending' ? <div className="mt-4 flex flex-wrap gap-2"><button disabled={!!busy} onClick={() => action(draft.id,'/api/missions/' + mission.id + '/approvals/' + approval.id,{action:'reject'})} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Reject</button><button disabled={!!busy} onClick={() => action(draft.id,'/api/missions/' + mission.id + '/approvals/' + approval.id,{action:'approve'})} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">Approve draft</button></div> : null}
          {approval?.status === 'approved' && draft.status === 'approved' ? <button disabled={!!busy} onClick={() => action(draft.id,'/api/missions/' + mission.id + '/send',{draftId:draft.id})} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">Send approved email</button> : null}
        </article>
      })}
    </section>
  </AppShell>
}

function Metric({ label, value }: { label: string; value: unknown }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{String(value)}</p></div> }

