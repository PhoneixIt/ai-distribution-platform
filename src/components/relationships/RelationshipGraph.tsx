'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  createEcosystemRelationship,
  deleteEcosystemRelationship,
  ensureEcosystemOrganization,
  listEcosystemOrganizations,
  updateEcosystemRelationship,
  RELATIONSHIP_LIFECYCLE_STAGES,
  RELATIONSHIP_STATUSES,
  type EcosystemOrganization,
  type EcosystemRelationship,
} from '@/lib/supabase/services'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type Props = { initialRelationships: EcosystemRelationship[]; error?: string }

const lifecycleLabels: Record<string, string> = {
  identified: 'Identified', prospect: 'Prospect', engaged: 'Engaged', qualified: 'Qualified',
  application: 'Application', approved: 'Approved', onboarding: 'Onboarding', enabled: 'Enabled',
  active: 'Active', growing: 'Growing', at_risk: 'At risk', dormant: 'Dormant',
  reactivated: 'Reactivated', closed: 'Closed',
}
const roleLabels: Record<string, string> = {
  vendor: 'Vendor', distributor: 'Distributor', reseller: 'Reseller', var: 'VAR / Solution Provider',
  msp: 'MSP', mssp: 'MSSP', system_integrator: 'System Integrator',
  technology_partner: 'Technology Partner', service_provider: 'Service Provider', customer: 'Customer',
}
const roleOrder = ['vendor','distributor','reseller','var','msp','mssp','system_integrator','technology_partner','service_provider','customer']
const compatibleTypes: Record<string, Record<string, string>> = {
  vendor: { distributor: 'Vendor → Distributor', reseller: 'Vendor → Reseller', msp: 'Vendor → MSP', mssp: 'Vendor → MSSP', system_integrator: 'Vendor → System Integrator', technology_partner: 'Vendor → Technology Partner', customer: 'Vendor → Customer' },
  distributor: { vendor: 'Distributor → Vendor', reseller: 'Distributor → Reseller', var: 'Distributor → VAR / Solution Provider', msp: 'Distributor → MSP', mssp: 'Distributor → MSSP', system_integrator: 'Distributor → System Integrator', technology_partner: 'Distributor → Technology Partner', customer: 'Distributor → Customer' },
  reseller: { vendor: 'Reseller → Vendor', distributor: 'Reseller → Distributor', customer: 'Reseller → Customer', technology_partner: 'Reseller → Technology Partner' },
  var: { vendor: 'VAR → Vendor', distributor: 'VAR → Distributor', customer: 'VAR → Customer', technology_partner: 'VAR → Technology Partner' },
  msp: { vendor: 'MSP → Vendor', distributor: 'MSP → Distributor', customer: 'MSP → Customer', technology_partner: 'MSP → Technology Partner' },
  mssp: { vendor: 'MSSP → Vendor', distributor: 'MSSP → Distributor', customer: 'MSSP → Customer', technology_partner: 'MSSP → Technology Partner' },
  system_integrator: { vendor: 'System Integrator → Vendor', distributor: 'System Integrator → Distributor', customer: 'System Integrator → Customer', technology_partner: 'System Integrator → Technology Partner' },
  technology_partner: { vendor: 'Technology Partner → Vendor', distributor: 'Technology Partner → Distributor', reseller: 'Technology Partner → Reseller', msp: 'Technology Partner → MSP', mssp: 'Technology Partner → MSSP', system_integrator: 'Technology Partner → System Integrator' },
  service_provider: { vendor: 'Service Provider → Vendor', distributor: 'Service Provider → Distributor', customer: 'Service Provider → Customer' },
  customer: { vendor: 'Customer → Vendor', distributor: 'Customer → Distributor', reseller: 'Customer → Reseller', var: 'Customer → VAR', msp: 'Customer → MSP', mssp: 'Customer → MSSP', system_integrator: 'Customer → System Integrator' },
}
const typeLabel = (v: string) => v.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())

export function RelationshipGraph({ initialRelationships, error }: Props) {
  const [relationships, setRelationships] = useState(initialRelationships)
  const [organizations, setOrganizations] = useState<EcosystemOrganization[]>([])
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<EcosystemRelationship | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [searchB, setSearchB] = useState('')
  const [newOrg, setNewOrg] = useState({ name: '', website: '', country: '', role: '' })
  const [form, setForm] = useState({ from: '', to: '', fromRole: '', toRole: '', type: '', lifecycle: 'identified', status: 'active', market: '', territory: '', started: '', nextAction: '', notes: '' })

  const filtered = useMemo(() => filter === 'all' ? relationships : relationships.filter(r => r.lifecycle_stage === filter), [filter, relationships])
  const counts = useMemo(() => ({
    total: relationships.length,
    active: relationships.filter(r => r.status === 'active').length,
    growing: relationships.filter(r => r.lifecycle_stage === 'growing').length,
    atRisk: relationships.filter(r => r.lifecycle_stage === 'at_risk').length,
  }), [relationships])

  const loadOrganizations = async () => {
    const { supabase, user, organization, orgId } = await ensureWorkspace()
    const own = await ensureEcosystemOrganization(supabase, user.id, orgId, {
      display_name: organization.name,
      organization_roles: organization.organization_roles || (organization.organization_type ? [organization.organization_type] : []),
    })
    const list = await listEcosystemOrganizations(supabase, '', 200)
    setOrganizations([own, ...list.filter(x => x.id !== own.id)])
    setForm(f => ({ ...f, from: own.id, fromRole: f.fromRole || organization.organization_type || organization.organization_roles?.[0] || '' }))
  }

  useEffect(() => { void loadOrganizations().catch(e => setMessage(e instanceof Error ? e.message : 'Could not load organizations.')) }, [])

  const filteredB = organizations.filter(o => o.display_name.toLowerCase().includes(searchB.toLowerCase()))

  const addExternalOrg = async () => {
    if (!newOrg.name.trim()) return
    setBusy(true); setMessage('')
    try {
      const { supabase, user, orgId } = await ensureWorkspace()
      const org = await ensureEcosystemOrganization(supabase, user.id, orgId, { display_name: newOrg.name, website: newOrg.website, country: newOrg.country, organization_roles: newOrg.role ? [newOrg.role] : [] })
      setOrganizations(prev => prev.some(x => x.id === org.id) ? prev : [...prev, org])
      setForm(f => ({ ...f, to: org.id, toRole: org.organization_roles?.[0] || '', type: f.fromRole && org.organization_roles?.[0] && compatibleTypes[f.fromRole]?.[org.organization_roles[0]] ? f.fromRole + '_' + org.organization_roles[0] : '' }))
      setNewOrg({ name: '', website: '', country: '', role: '' })
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not add organization.') }
    finally { setBusy(false) }
  }

  const submit = async () => {
    if (!form.from || !form.to || form.from === form.to) { setMessage('Select a related organization.'); return }
    if (!form.fromRole || !form.toRole || !canCreateType) { setMessage('Select the roles for both organizations so PortAi can record the relationship type correctly.'); return }
    setBusy(true); setMessage('')
    try {
      const { supabase, orgId, user } = await ensureWorkspace()
      const duplicate = relationships.find(r => r.from_entity_type === 'organization' && r.to_entity_type === 'organization' && r.from_entity_id === form.from && r.to_entity_id === form.to && r.relationship_type === form.type)
      if (duplicate) { setSelected(duplicate); setShowAdd(false); setMessage('This relationship already exists.'); return }
      const created = await createEcosystemRelationship(supabase, orgId, user.id, {
        from_entity_type: 'organization', from_entity_id: form.from, to_entity_type: 'organization', to_entity_id: form.to,
        relationship_type: form.type, lifecycle_stage: form.lifecycle as any, status: form.status as any,
        market: form.market || null, territory: form.territory || null, started_at: form.started || null,
        next_action_at: form.nextAction ? new Date(form.nextAction).toISOString() : null, notes: form.notes || null,
      })
      setRelationships(prev => [created, ...prev]); setSelected(created); setShowAdd(false)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not create relationship.') }
    finally { setBusy(false) }
  }

  const save = async () => {
    if (!selected) return
    setBusy(true); setMessage('')
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const updated = await updateEcosystemRelationship(supabase, orgId, selected.id, {
        lifecycle_stage: selected.lifecycle_stage, status: selected.status, market: selected.market,
        territory: selected.territory, started_at: selected.started_at, next_action_at: selected.next_action_at,
        notes: selected.notes,
      })
      setRelationships(prev => prev.map(r => r.id === updated.id ? updated : r)); setSelected(updated)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update relationship.') }
    finally { setBusy(false) }
  }

  const closeRelationship = async () => {
    if (!selected) return
    setBusy(true)
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const updated = await updateEcosystemRelationship(supabase, orgId, selected.id, { lifecycle_stage: 'closed', status: 'closed' })
      setRelationships(prev => prev.map(r => r.id === updated.id ? updated : r)); setSelected(updated)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not close relationship.') }
    finally { setBusy(false) }
  }

  const removeRelationship = async () => {
    if (!selected || !window.confirm('Delete this relationship record?')) return
    setBusy(true)
    try {
      const { supabase, orgId } = await ensureWorkspace()
      await deleteEcosystemRelationship(supabase, orgId, selected.id)
      setRelationships(prev => prev.filter(r => r.id !== selected.id)); setSelected(null)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not delete relationship.') }
    finally { setBusy(false) }
  }

  const orgName = (id: string) => organizations.find(o => o.id === id)?.display_name || id
  const orgRoles = (id: string) => organizations.find(o => o.id === id)?.organization_roles || []
  const typeOptions = form.fromRole ? Object.entries(compatibleTypes[form.fromRole] || {}) : []
  const canCreateType = !!form.fromRole && !!form.toRole && !!compatibleTypes[form.fromRole]?.[form.toRole]

  return <main className="mx-auto w-full max-w-7xl px-6 py-8">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-indigo-600">Ecosystem</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Relationships</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Connect organizations and manage the relationship lifecycle from one workspace.</p></div>
      <button onClick={() => { setShowAdd(true); setMessage('') }} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">+ Add relationship</button>
    </div>
    {error || message ? <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{error || message}</div> : null}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Total relationships',counts.total],['Active',counts.active],['Growing',counts.growing],['At risk',counts.atRisk]].map(([l,v])=><div key={l} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{l}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{v}</p></div>)}</div>
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-950">Relationship graph</h2><p className="mt-1 text-sm text-slate-500">Your workspace ↔ ecosystem organizations. PortAi will eventually populate this from connected systems and AI discovery.</p></div><select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"><option value="all">All lifecycle stages</option>{Object.entries(lifecycleLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      {filtered.length === 0 ? <div className="px-6 py-14 text-center"><p className="font-medium text-slate-900">No workspace relationships yet</p><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Add an organization relationship to begin building your ecosystem graph.</p></div> :
      <div className="divide-y divide-slate-100">{filtered.map(r=><button key={r.id} onClick={()=>setSelected(r)} className="grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 md:grid-cols-[1fr_auto_1fr_auto] md:items-center"><div><p className="text-sm font-medium text-slate-900">{orgName(r.from_entity_id)}</p><p className="text-xs text-slate-500">{roleLabels[orgRoles(r.from_entity_id)[0]] || 'Organization'}</p></div><div className="text-center text-xs font-medium text-indigo-600">{compatibleTypes[orgRoles(r.from_entity_id)[0]]?.[orgRoles(r.to_entity_id)[0]] || typeLabel(r.relationship_type)}</div><div><p className="text-sm font-medium text-slate-900">{orgName(r.to_entity_id)}</p><p className="text-xs text-slate-500">{roleLabels[orgRoles(r.to_entity_id)[0]] || 'Organization'}</p></div><div className="text-xs text-slate-500 md:text-right">{lifecycleLabels[r.lifecycle_stage]} · {r.status}</div></button>)}</div>}
    </section>

    {showAdd ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Add relationship</h2><button onClick={()=>setShowAdd(false)} className="text-slate-500">Close</button></div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Your organization</p>
          <p className="mt-1 text-sm text-slate-600">The relationship is recorded from this workspace.</p>
          <div className="mt-3 rounded-lg border border-indigo-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900">
            {organizations[0]?.display_name || 'Loading workspace organization…'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Related organization</p>
          <p className="mt-1 text-sm text-slate-600">Choose the company you work with or want to track.</p>
          <input value={searchB} onChange={e=>setSearchB(e.target.value)} placeholder="Type a company name…" className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/>
          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {filteredB.filter(o=>o.id!==form.from).length === 0 ? <p className="px-3 py-3 text-sm text-slate-500">No matching organizations. Add a new organization below.</p> : filteredB.filter(o=>o.id!==form.from).map(o=><button type="button" key={o.id} onClick={()=>setForm(f=>({...f,to:o.id}))} className={form.to===o.id ? 'block w-full border-b border-slate-100 bg-indigo-50 px-3 py-2.5 text-left text-indigo-700 last:border-0' : 'block w-full border-b border-slate-100 bg-white px-3 py-2.5 text-left text-slate-800 hover:bg-slate-50 last:border-0'}><span className="block text-sm font-medium">{o.display_name}</span>{o.website||o.country ? <span className="mt-0.5 block text-xs text-slate-500">{[o.website,o.country].filter(Boolean).join(' · ')}</span> : null}</button>)}
          </div>
          {form.to ? <p className="mt-2 text-xs font-medium text-indigo-700">Selected: {orgName(form.to)}</p> : null}
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">Don’t see the organization?</p><p className="mt-1 text-xs text-slate-500">Add it here as a canonical ecosystem organization, then select it above.</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><input placeholder="Company name" value={newOrg.name} onChange={e=>setNewOrg({...newOrg,name:e.target.value})} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/><input placeholder="Website" value={newOrg.website} onChange={e=>setNewOrg({...newOrg,website:e.target.value})} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/><input placeholder="Country" value={newOrg.country} onChange={e=>setNewOrg({...newOrg,country:e.target.value})} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/></div><select value={newOrg.role} onChange={e=>setNewOrg({...newOrg,role:e.target.value})} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"><option value="">Organization role</option>{roleOrder.map(v=><option key={v} value={v}>{roleLabels[v]}</option>)}</select><button disabled={busy || !newOrg.role} onClick={()=>void addExternalOrg()} className="mt-2 text-sm font-medium text-indigo-600">Add organization</button></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium text-slate-600">Your role<select value={form.fromRole} onChange={e=>setForm(f=>({...f,fromRole:e.target.value,type:f.toRole && compatibleTypes[e.target.value]?.[f.toRole] ? e.target.value + '_' + f.toRole : ''}))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"><option value="">Select your role</option>{roleOrder.filter(v=>organizations[0]?.organization_roles?.includes(v)).map(v=><option key={v} value={v}>{roleLabels[v]}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Related role<select value={form.toRole} onChange={e=>setForm(f=>({...f,toRole:e.target.value,type:f.fromRole && compatibleTypes[f.fromRole]?.[e.target.value] ? f.fromRole + '_' + e.target.value : ''}))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"><option value="">Select related role</option>{roleOrder.filter(v=>organizations.find(o=>o.id===form.to)?.organization_roles?.includes(v)).map(v=><option key={v} value={v}>{roleLabels[v]}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Relationship type<select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">{typeOptions.map(([v,label])=><option key={v} value={form.fromRole + '_' + v}>{label}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Lifecycle<select value={form.lifecycle} onChange={e=>setForm(f=>({...f,lifecycle:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">{RELATIONSHIP_LIFECYCLE_STAGES.map(v=><option key={v} value={v}>{lifecycleLabels[v]}</option>)}</select></label><input placeholder="Market" value={form.market} onChange={e=>setForm(f=>({...f,market:e.target.value}))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/><input placeholder="Territory" value={form.territory} onChange={e=>setForm(f=>({...f,territory:e.target.value}))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/><input type="date" value={form.started} onChange={e=>setForm(f=>({...f,started:e.target.value}))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/><input type="datetime-local" value={form.nextAction} onChange={e=>setForm(f=>({...f,nextAction:e.target.value}))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/><textarea placeholder="Notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"/></div>
      <div className="mt-6 flex justify-end gap-2"><button onClick={()=>setShowAdd(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={busy} onClick={()=>void submit()} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">{busy?'Saving…':'Create relationship'}</button></div>
    </div></div> : null}

    {selected ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-indigo-600">Relationship</p><h2 className="mt-1 text-xl font-semibold">{orgName(selected.from_entity_id)} ↔ {orgName(selected.to_entity_id)}</h2><p className="mt-1 text-sm text-slate-500">{typeLabel(selected.relationship_type)}</p></div><button onClick={()=>setSelected(null)} className="text-slate-500">Close</button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium text-slate-600">Lifecycle<select value={selected.lifecycle_stage} onChange={e=>setSelected({...selected,lifecycle_stage:e.target.value as any})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">{RELATIONSHIP_LIFECYCLE_STAGES.map(v=><option key={v} value={v}>{lifecycleLabels[v]}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Status<select value={selected.status} onChange={e=>setSelected({...selected,status:e.target.value as any})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">{RELATIONSHIP_STATUSES.map(v=><option key={v} value={v}>{v}</option>)}</select></label><input value={selected.market||''} onChange={e=>setSelected({...selected,market:e.target.value||null})} placeholder="Market" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/><input value={selected.territory||''} onChange={e=>setSelected({...selected,territory:e.target.value||null})} placeholder="Territory" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/><textarea value={selected.notes||''} onChange={e=>setSelected({...selected,notes:e.target.value||null})} placeholder="Notes" className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"/></div>
      <div className="mt-6 flex flex-wrap justify-between gap-2"><button disabled={busy} onClick={()=>void removeRelationship()} className="text-sm text-red-600">Delete</button><div className="flex gap-2"><button disabled={busy} onClick={()=>void closeRelationship()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">Close relationship</button><button disabled={busy} onClick={()=>void save()} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">{busy?'Saving…':'Save changes'}</button></div></div>
    </div></div> : null}
  </main>
}
