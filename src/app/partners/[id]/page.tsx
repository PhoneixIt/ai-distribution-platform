'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAuthenticatedClient } from '@/lib/supabase/client'

interface Partner {
  id: string
  name: string
  description: string | null
  website: string | null
  country: string | null
  regions: string[] | null
  industries: string[] | null
  company_size: string | null
  employee_range: string | null
  partner_types: string[] | null
  specializations: string[] | null
  certifications: string[] | null
  technologies: string[] | null
  services: string[] | null
  customer_segments: string[] | null
  sales_regions: string[] | null
  is_verified: boolean
  verification_status: string
  source_reference: string | null
  source_type: string
  last_verified: string | null
}

interface Evidence {
  id: string
  claim_type: string
  claim_value: string
  source_url: string
  source_title: string | null
  source_type: string
  excerpt: string | null
  confidence: number
  verification_status: string
  last_verified: string | null
}

interface Contact {
  id: string
  full_name: string | null
  job_title: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  country: string | null
  verification_status: string
  confidence: number
}

export default function PartnerProfile({ params }: { params: Promise<{ id: string }> }) {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { id } = await params
      const { supabase, error: authError } = await getAuthenticatedClient()
      if (authError) {
        setError('Authentication is unavailable.')
        setLoading(false)
        return
      }

      const [partnerResult, evidenceResult, contactsResult] = await Promise.all([
        supabase.from('partners').select('*').eq('id', id).single(),
        supabase.from('company_evidence').select('*').eq('company_type', 'partner').eq('company_id', id).order('confidence', { ascending: false }),
        supabase.from('company_contacts').select('*').eq('company_type', 'partner').eq('company_id', id).order('confidence', { ascending: false }),
      ])

      if (partnerResult.error || !partnerResult.data) {
        setError('Partner profile not found.')
      } else {
        setPartner(partnerResult.data as Partner)
        setEvidence((evidenceResult.data || []) as Evidence[])
        setContacts((contactsResult.data || []) as Contact[])
      }
      setLoading(false)
    }
    void load()
  }, [params])

  if (loading) return <Shell><p className="text-slate-400">Loading company intelligence...</p></Shell>
  if (error || !partner) return <Shell><div className="rounded-xl border border-red-900/60 bg-red-950/20 p-8"><h1 className="text-xl font-semibold text-red-200">Unable to load profile</h1><p className="mt-2 text-sm text-red-300/80">{error}</p></div></Shell>

  return (
    <Shell>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/partners" className="text-sm text-blue-400 hover:text-blue-300">← Partner Directory</Link>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{partner.name}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs ${partner.is_verified ? 'border-emerald-800 text-emerald-300' : 'border-amber-800 text-amber-300'}`}>{partner.is_verified ? 'Verified' : 'Needs verification'}</span>
          </div>
          <p className="mt-2 text-slate-400">{partner.description || 'No verified company description available.'}</p>
        </div>
        {partner.website && <a href={partner.website} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-blue-400 hover:border-blue-500">Company website</a>}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Metric label="Partner type" value={join(partner.partner_types)} />
        <Metric label="Country" value={partner.country || 'Unknown'} />
        <Metric label="Customer segment" value={join(partner.customer_segments)} />
        <Metric label="Verification" value={partner.verification_status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Channel profile">
          <Rows rows={[
            ['Regions', join(partner.regions)],
            ['Sales regions', join(partner.sales_regions)],
            ['Industries', join(partner.industries)],
            ['Specializations', join(partner.specializations)],
            ['Technologies', join(partner.technologies)],
            ['Services', join(partner.services)],
            ['Certifications', join(partner.certifications)],
            ['Company size', partner.company_size || 'Unknown'],
            ['Employees', partner.employee_range || 'Unknown'],
          ]} />
        </Panel>

        <Panel title={`Evidence (${evidence.length})`}>
          {evidence.length === 0 ? <p className="text-sm text-slate-500">No evidence has been stored yet.</p> : <div className="space-y-4">{evidence.map((item) => <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs uppercase tracking-wide text-slate-500">{item.claim_type}</span><span className="text-xs text-slate-500">{Math.round(item.confidence * 100)}% confidence</span></div><p className="mt-2 text-sm text-slate-200">{item.claim_value}</p>{item.excerpt && <p className="mt-2 text-sm leading-5 text-slate-400">“{item.excerpt}”</p>}<a href={item.source_url} target="_blank" rel="noreferrer" className="mt-3 block truncate text-xs text-blue-400 hover:text-blue-300">{item.source_title || item.source_url}</a></div>)}</div>}
        </Panel>
      </div>

      <Panel title={`Contacts (${contacts.length})`} className="mt-6">
        {contacts.length === 0 ? <p className="text-sm text-slate-500">No researched contacts yet. Contact discovery is the next intelligence expansion.</p> : <div className="grid gap-4 md:grid-cols-2">{contacts.map((contact) => <div key={contact.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4"><p className="font-medium">{contact.full_name || 'Unnamed contact'}</p><p className="mt-1 text-sm text-slate-400">{contact.job_title || 'Role unknown'}</p>{contact.email && <p className="mt-3 text-sm text-blue-400">{contact.email}</p>}{contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-blue-400">LinkedIn</a>}<p className="mt-3 text-xs text-slate-500">{contact.verification_status} · {Math.round(contact.confidence * 100)}% confidence</p></div>)}</div>}
      </Panel>

      <p className="mt-6 text-xs text-slate-500">Source: {partner.source_type}{partner.last_verified ? ` · Last verified ${new Date(partner.last_verified).toLocaleDateString()}` : ''}</p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-6 py-8">{children}</div></main> }
function join(values: string[] | null | undefined) { return values?.length ? values.join(', ') : 'Unknown' }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-sm font-medium text-slate-200">{value}</p></div> }
function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`rounded-xl border border-slate-800 bg-slate-900 p-6 ${className}`}><h2 className="text-lg font-semibold">{title}</h2><div className="mt-4">{children}</div></section> }
function Rows({ rows }: { rows: [string, string][] }) { return <div className="divide-y divide-slate-800">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-3 gap-4 py-3 text-sm"><span className="text-slate-500">{label}</span><span className="col-span-2 text-slate-300">{value}</span></div>)}</div> }
