'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/app-shell'
import { getAuthenticatedClient } from '@/lib/supabase/client'

const input = 'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-600 outline-none focus:border-blue-500'

export default function NewDistributorPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState('')
  const [regions, setRegions] = useState('')
  const [specializations, setSpecializations] = useState('')
  const [services, setServices] = useState('')
  const [salesRegions, setSalesRegions] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { supabase, error: authError } = await getAuthenticatedClient()
      if (authError) throw authError
      const { error: insertError } = await supabase
        .from('distributors')
        .insert({
          name: name.trim(),
          slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          website: website.trim() || null,
          country: country.trim() || null,
          regions: regions.split(',').map((v) => v.trim()).filter(Boolean),
          specializations: specializations.split(',').map((v) => v.trim()).filter(Boolean),
          services: services.split(',').map((v) => v.trim()).filter(Boolean),
          sales_regions: salesRegions.split(',').map((v) => v.trim()).filter(Boolean),
          source_type: 'manual',
          is_active: true,
        })
        .select('id')
        .single()
      if (insertError) throw insertError
      router.replace('/distributors')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create distributor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Add distributor" subtitle="Contribute a distributor to the shared network so it can be researched and used in channel planning.">
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Company name *"><input required value={name} onChange={(e) => setName(e.target.value)} className={input} /></Field>
          <Field label="Website"><input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" className={input} /></Field>
          <Field label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} className={input} /></Field>
          <Field label="Regions"><input value={regions} onChange={(e) => setRegions(e.target.value)} placeholder="DACH, Middle East, Nordics" className={input} /></Field>
          <Field label="Specializations"><input value={specializations} onChange={(e) => setSpecializations(e.target.value)} placeholder="Cybersecurity, Cloud, Data Protection" className={input} /></Field>
          <Field label="Services"><input value={services} onChange={(e) => setServices(e.target.value)} placeholder="Distribution, Enablement, Logistics" className={input} /></Field>
          <Field label="Sales regions"><input value={salesRegions} onChange={(e) => setSalesRegions(e.target.value)} placeholder="Germany, Austria, Switzerland" className={input} /></Field>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Add distributor'}</button>
            <button type="button" onClick={() => router.back()} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-700">Cancel</button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>
}
