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

type Candidate = {
  id: string
  company_name: string
  website: string | null
  country: string | null
  description: string | null
  partner_types: string[]
  technologies: string[]
  customer_segments: string[]
  services: string[]
  fit_score: number | null
  qualification_status: string
  qualification_score: number | null
  qualification_reasons: string[]
  concerns: string[]
  research_status: string
  research_confidence: number | null
  evidence: unknown[]
  rank: number
}

const stageLabel: Record<string, string> = {
  defined: 'Ready to run',
  researching: 'Researching',
  discovering: 'Discovering',
  verifying: 'Verifying',
  qualifying: 'Qualifying',
  matching: 'Matching',
  scored: 'Discovery complete',
  dossier_ready: 'Results ready',
  contacts_researched: 'Contacts researched',
  draft_ready: 'Draft ready',
  awaiting_approval: 'Awaiting approval',
  executing: 'Executing',
  completed: 'Completed',
  no_results: 'No results',
  blocked: 'Blocked',
  failed: 'Needs attention',
}

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const [mission, setMission] = useState<Mission | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  async function load(id: string) {
    const [missionResponse, draftResponse, candidateResponse] = await Promise.all([
      fetch('/api/missions', { cache: 'no-store' }),
      fetch('/api/missions/' + id + '/drafts', { cache: 'no-store' }),
      fetch('/api/missions/' + id + '/candidates', { cache: 'no-store' }),
    ])

    const missionsPayload = await missionResponse.json()
    const draftsPayload = await draftResponse.json()
    const candidatesPayload = await candidateResponse.json()

    if (!missionResponse.ok) throw new Error(missionsPayload.error || 'Could not load missions.')
    if (!draftResponse.ok) throw new Error(draftsPayload.error || 'Could not load mission details.')
    if (!candidateResponse.ok) throw new Error(candidatesPayload.error || 'Could not load discovery results.')

    const found = (missionsPayload.missions || []).find((item: Mission) => item.id === id)
    if (!found) throw new Error('Mission not found.')

    setMission(found)
    setDrafts(draftsPayload.drafts || [])
    setDossiers(draftsPayload.dossiers || [])
    setCandidates(candidatesPayload.candidates || [])
  }

  useEffect(() => {
    let active = true
    void params.then(({ id }) => load(id)).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load mission.')
    })
    return () => { active = false }
  }, [params])

  async function startMission() {
    if (!mission) return
    setBusy('run')
    setError('')
    setNotice('')

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
          desiredCandidateCount: 100,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Mission execution failed.')
      await load(mission.id)
      setNotice('Mission execution completed its discovery step. Results and evidence are now available.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Mission execution failed.')
    } finally {
      setBusy('')
    }
  }

  async function runStage(endpoint: string, label: string) {
    if (!mission) return
    setBusy(label)
    setError('')
    setNotice('')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || label + ' failed.')
      await load(mission.id)
      setNotice(label + ' completed.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : label + ' failed.')
    } finally {
      setBusy('')
    }
  }

  async function approvalAction(draftId: string, approvalId: string, action: 'approve' | 'reject') {
    if (!mission) return
    setBusy(draftId + action)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/missions/' + mission.id + '/approvals/' + approvalId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Approval action failed.')
      await load(mission.id)
      setNotice(action === 'approve' ? 'Draft approved.' : 'Draft rejected.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Approval action failed.')
    } finally {
      setBusy('')
    }
  }

  async function sendApproved(draftId: string) {
    if (!mission) return
    setBusy(draftId + 'send')
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/missions/' + mission.id + '/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Send failed.')
      await load(mission.id)
      setNotice('Approved communication sent.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Send failed.')
    } finally {
      setBusy('')
    }
  }

  if (!mission) {
    return (
      <AppShell title="Mission">
        <p className="text-sm text-slate-500">{error || 'Loading mission…'}</p>
      </AppShell>
    )
  }

  const summary = mission.result_summary || {}
  const stage = mission.current_stage
  const returnedCount = Number(summary.returned ?? mission.candidate_count ?? 0)
  const discoveredCount = Number(summary.discovered ?? 0)
  const qualifiedCount = Number(summary.qualified ?? 0)
  const isReady = stage === 'defined' || stage === 'failed'
  const isLegacyDiscoveryComplete = stage === 'scored'
  const isResultsReady = stage === 'dossier_ready' || (isLegacyDiscoveryComplete && returnedCount > 0)
  const isNoResults = stage === 'no_results' || (isLegacyDiscoveryComplete && returnedCount === 0 && discoveredCount === 0)
  const isContactsReady = stage === 'contacts_researched' || stage === 'draft_ready'
  const displayStatus = isLegacyDiscoveryComplete ? 'discovery complete' : mission.status.replaceAll('_', ' ')

  return (
    <AppShell title="Mission" subtitle="Give PortAi an objective. The platform handles discovery, intelligence and the next permitted actions while keeping consequential communication under your control.">
      <div className="mb-4">
        <Link href="/workflow" className="text-sm font-medium text-blue-700 hover:text-blue-800">← Back to missions</Link>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Mission objective</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 lg:text-3xl">{mission.objective}</h2>
            <p className="mt-3 text-xs text-slate-500">{mission.id}</p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {stageLabel[stage] || stage.replaceAll('_', ' ')}
          </span>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Discovered" value={discoveredCount} />
          <Metric label="Qualified" value={qualifiedCount} />
          <Metric label="Candidates found" value={returnedCount} />
          <Metric label="Contacts" value={summary.contacts_found ?? 0} />
          <Metric label="Status" value={displayStatus} />
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Next action</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">
              {isReady ? 'Run the mission' : isNoResults ? 'Discovery returned no companies' : isResultsReady ? 'Research contacts for the qualified results' : isContactsReady ? 'Prepare the next commercial action' : 'PortAi is processing this mission'}
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {isReady
                ? 'Start the objective-driven discovery workflow. No external communication is sent by this action.'
                : isNoResults
                  ? 'The discovery run completed, but the configured search providers returned no company records. PortAi did not invent or fabricate a shortlist.'
                  : isResultsReady
                    ? 'Contact enrichment is optional and only runs when a provider is configured.'
                    : isContactsReady
                      ? 'Generate reviewable drafts from researched contacts before any external communication.'
                      : 'The current stage and evidence remain visible here while PortAi works.'}
            </p>
          </div>

          {isReady ? (
            <button disabled={!!busy} onClick={startMission} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy === 'run' ? 'Running mission…' : 'Run mission →'}
            </button>
          ) : null}

          {isResultsReady ? (
            <button disabled={!!busy} onClick={() => runStage('/api/missions/' + mission.id + '/contacts', 'Contact research')} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy === 'Contact research' ? 'Researching…' : 'Research contacts →'}
            </button>
          ) : null}

          {isContactsReady ? (
            <button disabled={!!busy} onClick={() => runStage('/api/missions/' + mission.id + '/drafts', 'Generate drafts')} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy === 'Generate drafts' ? 'Preparing…' : 'Prepare drafts →'}
            </button>
          ) : null}
        </div>
      </section>

      {mission.error_message ? <Alert tone="error">Mission needs attention: {mission.error_message}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="info">{notice}</Alert> : null}

      {candidates.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Discovery results</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">Companies PortAi found</h3>
              <p className="mt-1 text-sm text-slate-500">These are the actual companies returned by this mission's discovery run. Open a result to inspect fit, qualification and evidence.</p>
            </div>
            <Link href="/discovery" className="text-sm font-medium text-blue-700 hover:text-blue-800">Open full discovery →</Link>
          </div>
          <div className="mt-5 space-y-3">
            {candidates.map((candidate) => (
              <article key={candidate.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-semibold text-slate-600">{candidate.rank}</span>
                      <h4 className="text-lg font-semibold text-slate-950">{candidate.company_name}</h4>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{candidate.qualification_status.replaceAll('_', ' ')}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{candidate.description || 'No verified company description recorded.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {[candidate.country, ...candidate.partner_types.slice(0, 3), ...candidate.customer_segments.slice(0, 2)].filter(Boolean).map((value) => <span key={value} className="rounded-full border border-slate-200 bg-white px-2.5 py-1">{value}</span>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 lg:w-72">
                    <Metric label="Fit" value={candidate.fit_score ?? '—'} />
                    <Metric label="Match" value={candidate.qualification_score ?? '—'} />
                    <Metric label="Trust" value={candidate.research_confidence != null ? Math.round(candidate.research_confidence * 100) + '%' : '—'} />
                  </div>
                </div>
                <details className="mt-4 border-t border-slate-200 pt-4">
                  <summary className="cursor-pointer text-sm font-medium text-blue-700">View intelligence & evidence</summary>
                  <div className="mt-4 grid gap-5 lg:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Why it matched</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">{candidate.qualification_reasons.length ? candidate.qualification_reasons.map((reason, index) => <li key={index}>• {reason}</li>) : <li>No qualification reasons recorded.</li>}</ul>
                      {candidate.concerns.length ? <><p className="mt-4 text-sm font-semibold text-slate-800">Needs verification</p><ul className="mt-2 space-y-1 text-sm text-slate-600">{candidate.concerns.map((item, index) => <li key={index}>• {item}</li>)}</ul></> : null}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Company intelligence</p>
                      <dl className="mt-2 space-y-2 text-sm text-slate-600">
                        <div><dt className="inline font-medium text-slate-800">Technologies:</dt> <dd className="inline">{candidate.technologies.join(', ') || 'Unknown'}</dd></div>
                        <div><dt className="inline font-medium text-slate-800">Services:</dt> <dd className="inline">{candidate.services.join(', ') || 'Unknown'}</dd></div>
                        <div><dt className="inline font-medium text-slate-800">Research:</dt> <dd className="inline">{candidate.research_status}</dd></div>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence</p>
                    {candidate.evidence.length ? <ul className="mt-2 space-y-2 text-sm text-slate-600">{candidate.evidence.slice(0, 8).map((item, index) => <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No evidence recorded.</p>}
                  </div>
                  {candidate.website ? <a href={candidate.website} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:text-blue-800">{candidate.website} ↗</a> : null}
                </details>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {isNoResults ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Discovery result</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">No companies returned by discovery</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">The discovery run completed without returning company records. This is a discovery-provider result, not evidence that no suitable companies exist. PortAi should retry with the resilient search path before treating the objective as exhausted.</p>
        </section>
      ) : null}

      {drafts.length > 0 ? (
        <section className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Reviewable actions</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Prepared communications</h3>
          </div>

          {drafts.map((draft) => {
            const approval = draft.mission_approvals?.[0]
            const dossier = dossiers.find((item) => item.id === draft.dossier_id)
            const intelligence = dossier?.intelligence || {}
            const companyName = String(dossier?.company.name || 'Company dossier unavailable')
            const evidence = Array.isArray(intelligence.evidence) ? intelligence.evidence : []
            const reasons = Array.isArray(intelligence.reasons) ? intelligence.reasons : []
            const contactName = [draft.contact.first_name, draft.contact.last_name].filter(Boolean).join(' ') || 'Contact'

            return (
              <article key={draft.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Human approval</p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-950">{contactName}</h4>
                    <p className="text-xs text-slate-500">{String(draft.contact.email || 'No email revealed')}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{draft.status.replaceAll('_', ' ')}</span>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Qualified company</p>
                    <h5 className="mt-1 font-semibold text-slate-950">{companyName}</h5>
                    {dossier ? (
                      <>
                        <p className="mt-1 text-sm text-slate-600">{String(dossier.company.country || 'Country unavailable')} · {String(dossier.company.website || 'Website unavailable')}</p>
                        <p className="mt-3 text-xs text-slate-500">Qualification score: {String(intelligence.qualification_score ?? 'not recorded')}</p>
                        {reasons.length ? <ul className="mt-2 space-y-1 text-sm text-slate-600">{reasons.map((item, index) => <li key={index}>• {String(item)}</li>)}</ul> : null}
                        {evidence.length ? <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-blue-700">View qualification evidence ({evidence.length})</summary><ul className="mt-2 space-y-2 text-sm text-slate-600">{evidence.map((item, index) => <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ul></details> : null}
                      </>
                    ) : <p className="mt-2 text-sm text-slate-500">The saved dossier is not available for this draft.</p>}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Prepared message</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{draft.subject}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{draft.body}</p>
                  </div>
                </div>

                {draft.personalization_evidence.length ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Why this is personalized</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">{draft.personalization_evidence.map((item) => <li key={item}>• {item}</li>)}</ul>
                  </div>
                ) : null}

                {approval?.status === 'pending' ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button disabled={!!busy} onClick={() => approvalAction(draft.id, approval.id, 'reject')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Reject</button>
                    <button disabled={!!busy} onClick={() => approvalAction(draft.id, approval.id, 'approve')} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Approve draft</button>
                  </div>
                ) : null}

                {approval?.status === 'approved' && draft.status === 'approved' ? (
                  <button disabled={!!busy} onClick={() => sendApproved(draft.id)} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Send approved email</button>
                ) : null}
              </article>
            )
          })}
        </section>
      ) : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize text-slate-950">{String(value)}</p>
    </div>
  )
}

function Alert({ tone, children }: { tone: 'error' | 'info'; children: React.ReactNode }) {
  return (
    <div className={tone === 'error' ? 'mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700' : 'mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800'}>
      {children}
    </div>
  )
}
