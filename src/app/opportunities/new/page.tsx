'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { ButtonPrimary, Card } from '@/components/ui'
import { getAuthenticatedClient } from '@/lib/supabase/client'

export default function CreateOpportunityPage() {
  const router = useRouter()
  const [customerName, setCustomerName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState('')
  const [technology, setTechnology] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const { supabase, error: authError } = await getAuthenticatedClient()
      if (authError) throw authError

      const { data: membership, error: membershipError } = await supabase
        .from('org_members')
        .select('org_id,user_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      if (membershipError) throw membershipError
      if (!membership) throw new Error('No active workspace found.')

      const normalizedCustomerName = customerName.trim()
      const { data: existingCustomer, error: customerLookupError } = await supabase
        .from('customers')
        .select('id')
        .eq('org_id', membership.org_id)
        .eq('company_name', normalizedCustomerName)
        .maybeSingle()
      if (customerLookupError) throw customerLookupError

      let customerId = existingCustomer?.id
      if (!customerId) {
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert({
            org_id: membership.org_id,
            owner_id: membership.user_id,
            company_name: normalizedCustomerName,
            industry: industry.trim() || null,
            company_size: companySize.trim() || null,
            country: country.trim() || null,
          })
          .select('id')
          .single()
        if (customerError) throw customerError
        customerId = customer.id
      }

      const technologies = technology.split(',').map((item) => item.trim()).filter(Boolean)
      const { data: opportunity, error: opportunityError } = await supabase
        .from('opportunities')
        .insert({
          org_id: membership.org_id,
          customer_id: customerId,
          created_by: membership.user_id,
          title: title.trim(),
          description: description.trim() || null,
          preferred_region: country.trim() || null,
          technology_categories: technologies,
          requirements: technologies,
          estimated_value: value ? Number(value) : null,
          currency: 'USD',
          status: 'open',
          stage: 'new',
        })
        .select('id')
        .single()
      if (opportunityError) throw opportunityError

      router.replace(`/opportunities/${opportunity.id}`)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create opportunity.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Opportunity</h1>
          <p className="mt-1 text-slate-400">Define a sales opportunity and match it with channel partners.</p>
        </div>

        <Card className="max-w-2xl">
          <form onSubmit={submit} className="space-y-5">
            <Field label="Customer Company *"><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="e.g., Acme GmbH" className={input} /></Field>
            <Field label="Opportunity Title *"><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g., Enterprise Cybersecurity Implementation" className={input} /></Field>
            <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the opportunity, customer needs, and requirements..." rows={4} className={input} /></Field>
            <Field label="Country / Region *"><input required value={country} onChange={(event) => setCountry(event.target.value)} placeholder="e.g., Germany" className={input} /></Field>
            <Field label="Technology Focus *"><input required value={technology} onChange={(event) => setTechnology(event.target.value)} placeholder="e.g., Cybersecurity, Cloud Infrastructure" className={input} /></Field>
            <Field label="Industry"><input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="e.g., Financial Services" className={input} /></Field>
            <Field label="Customer Company Size"><input value={companySize} onChange={(event) => setCompanySize(event.target.value)} placeholder="e.g., Mid-market" className={input} /></Field>
            <Field label="Estimated Opportunity Value (USD)"><input type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g., 250000" className={input} /></Field>

            {error && <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-3 text-sm text-red-300">{error}</div>}

            <div className="flex gap-3 pt-4">
              <ButtonPrimary type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Opportunity'}</ButtonPrimary>
              <ButtonPrimary href="/opportunities" className="bg-slate-700 hover:bg-slate-600">Cancel</ButtonPrimary>
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
