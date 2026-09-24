'use client'

import { FormEvent, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/app-shell'
import { getAuthenticatedClient } from '@/lib/supabase/client'
import { ensureWorkspace } from '@/lib/supabase/workspace'

const input = 'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-600 outline-none focus:border-blue-500'

export default function NewVendorPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [categories, setCategories] = useState('')
  const [targetCustomers, setTargetCustomers] = useState('')
  const [marketSegment, setMarketSegment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const { supabase, error: authError } = await getAuthenticatedClient()
      if (authError) throw authError
      const { orgId } = await ensureWorkspace()

      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          name: name.trim(),
          slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          website: website.trim() || null,
          categories: categories.split(',').map((v) => v.trim()).filter(Boolean),
          target_customers: targetCustomers.trim() || null,
          market_segment: marketSegment.trim() || null,
          source_type: 'manual',
          is_active: true,
        })
        .select('id')
        .single()

      if (vendorError || !vendor) throw vendorError || new Error('Could not create vendor.')

      const { data: userResult } = await supabase.auth.getUser()
      if (!userResult.user) throw new Error('Authentication is unavailable.')

      const { error: relationshipError } = await supabase
        .from('org_vendors')
        .insert({
          org_id: orgId,
          vendor_id: vendor.id,
          owner_id: userResult.user.id,
          relationship_type: 'vendor',
          status: 'prospect',
        })

      if (relationshipError) throw relationshipError

      router.replace('/vendors')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create vendor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Add vendor" subtitle="Contribute a vendor to the shared network and connect it to your workspace.">
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Company name *"><input required value={name} onChange={(e) => setName(e.target.value)} className={input} /></Field>
          <Field label="Website"><input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" className={input} /></Field>
          <Field label="Categories"><input value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="Cybersecurity, Backup, Cloud" className={input} /></Field>
          <Field label="Target customers"><input value={targetCustomers} onChange={(e) => setTargetCustomers(e.target.value)} placeholder="SMB, Mid-market, Enterprise" className={input} /></Field>
          <Field label="Market segment"><input value={marketSegment} onChange={(e) => setMarketSegment(e.target.value)} placeholder="B2B SaaS" className={input} /></Field>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Add vendor'}</button>
            <button type="button" onClick={() => router.back()} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-700">Cancel</button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>
}
