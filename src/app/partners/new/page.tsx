'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { ButtonPrimary, Card } from '@/components/ui'
import { getAuthenticatedClient } from '@/lib/supabase/client'
import { createPartner } from '@/lib/supabase/services'

export default function AddPartnerPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState('')
  const [description, setDescription] = useState('')
  const [partnerTypes, setPartnerTypes] = useState('')
  const [technologies, setTechnologies] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const { supabase, error: authError } = await getAuthenticatedClient()
      if (authError) throw authError

      const partner = await createPartner(supabase, {
        name: name.trim(),
        website: website.trim() || null,
        country: country.trim(),
        description: description.trim() || null,
        partner_types: partnerTypes.split(',').map((value) => value.trim()).filter(Boolean),
        technologies: technologies.split(',').map((value) => value.trim()).filter(Boolean),
        source_type: 'manual',
        is_verified: false,
        verification_status: 'pending',
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
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Add Partner</h1>
          <p className="mt-1 text-slate-400">Create a new partner record in your directory.</p>
        </div>

        <Card className="max-w-2xl">
          <form onSubmit={submit} className="space-y-5">
            <Field label="Company Name *"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g., Northstar Cyber Systems" className={input} /></Field>
            <Field label="Website"><input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://example.com" className={input} /></Field>
            <Field label="Country *"><input required value={country} onChange={(event) => setCountry(event.target.value)} placeholder="e.g., Germany" className={input} /></Field>
            <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Brief description of the partner and their capabilities..." rows={4} className={input} /></Field>
            <Field label="Partner Types (comma-separated)"><input value={partnerTypes} onChange={(event) => setPartnerTypes(event.target.value)} placeholder="e.g., MSP, Reseller, System Integrator" className={input} /></Field>
            <Field label="Technologies (comma-separated)"><input value={technologies} onChange={(event) => setTechnologies(event.target.value)} placeholder="e.g., Cybersecurity, Cloud Infrastructure" className={input} /></Field>

            {error && <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-3 text-sm text-red-300">{error}</div>}

            <div className="flex gap-3 pt-4">
              <ButtonPrimary type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Partner'}</ButtonPrimary>
              <ButtonPrimary href="/partners" className="bg-slate-700 hover:bg-slate-600">Cancel</ButtonPrimary>
            </div>
          </form>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}

const input = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-300">{label}{children}</label>
}
