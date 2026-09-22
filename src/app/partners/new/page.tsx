'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/app-shell'
import { ButtonPrimary, Card } from '@/components/ui'
import { ensureWorkspace } from '@/lib/supabase/workspace'
import { createPartner } from '@/lib/supabase/services'

export default function AddPartnerPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState('')
  const [description, setDescription] = useState('')
  const [partnerType, setPartnerType] = useState('')
  const [technology, setTechnology] = useState('')
  const [workspaceRole, setWorkspaceRole] = useState('Organization')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useState(() => {
    void ensureWorkspace().then(({ organization }) => {
      setWorkspaceRole(organization?.organization_type || organization?.organization_roles?.[0] || 'Organization')
    }).catch(() => setWorkspaceRole('Organization'))
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const { supabase } = await ensureWorkspace()

      const partner = await createPartner(supabase, {
        name: name.trim(),
        website: website.trim() || null,
        country: country.trim(),
        description: description.trim() || null,
        partner_types: partnerType ? [partnerType] : [],
        technologies: technology ? [technology] : [],
      })

      router.replace(`/partners/${partner.id}`)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create partner.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Add partner" subtitle="Add a known ecosystem company. Your organization role is inherited from account setup; only the partner's role needs classification.">
      <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Your workspace:</span> {workspaceRole}
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Company name *"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g., Northstar Cyber Systems" className={input} /></Field>
          <Field label="Website"><input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://example.com" className={input} /></Field>
          <Field label="Country *"><select required value={country} onChange={(event) => setCountry(event.target.value)} className={input}><option value="">Select country</option>{countryOptions.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
          <Field label="Partner role"><select value={partnerType} onChange={(event) => setPartnerType(event.target.value)} className={input}><option value="">Let PortAi classify later</option>{partnerTypeOptions.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
          <Field label="Primary technology"><select value={technology} onChange={(event) => setTechnology(event.target.value)} className={input}><option value="">Not specified</option>{technologyOptions.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
          <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context only when research cannot provide it." rows={4} className={input} /></Field>
          {error && <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-3 text-sm text-red-300">{error}</div>}
          <div className="flex gap-3 pt-2">
            <ButtonPrimary type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create partner'}</ButtonPrimary>
            <ButtonPrimary href="/partners" className="bg-slate-700 hover:bg-slate-600">Cancel</ButtonPrimary>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
}

const partnerTypeOptions = ['Reseller', 'VAR / Solution Provider', 'MSP', 'MSSP', 'System Integrator', 'Technology Partner', 'Service Provider', 'Distributor']
const technologyOptions = ['Cybersecurity', 'Data Protection', 'Cloud', 'Networking', 'Infrastructure', 'AI', 'SaaS', 'Microsoft', 'VMware', 'Other']
const countryOptions = ['Germany', 'Lebanon', 'United States', 'United Kingdom', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Türkiye', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Egypt', 'Jordan', 'Iraq', 'Other']

const input = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-300">{label}{children}</label>
}
