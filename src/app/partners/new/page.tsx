'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthenticatedClient } from '@/lib/supabase/client'

type PartnerForm = {
  name: string
  description: string
  website: string
  country: string
  company_size: string
  partner_types: string
}

const initialForm: PartnerForm = {
  name: '',
  description: '',
  website: '',
  country: '',
  company_size: '',
  partner_types: '',
}

function slugify(value: string) {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'partner'
  )
}

export default function NewPartnerPage() {
  const router = useRouter()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof PartnerForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = form.name.trim()
    const website = form.website.trim()

    if (!name) {
      setError('Partner name is required.')
      return
    }

    if (website) {
      try {
        new URL(website)
      } catch {
        setError('Enter a valid website URL, including https://.')
        return
      }
    }

    setSaving(true)
    setError(null)

    const partnerTypes = form.partner_types
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean)

    const { supabase, error: authError } = await getAuthenticatedClient()

    if (authError) {
      setSaving(false)
      setError(
        'We could not establish an anonymous session. Please enable Anonymous sign-ins in Supabase Auth.'
      )
      return
    }

    const baseSlug = slugify(name)
    let insertErrorMessage = ''

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data: matchingSlugs, error: slugQueryError } = await supabase
        .from('partners')
        .select('slug')
        .like('slug', `${baseSlug}%`)

      if (slugQueryError) {
        setSaving(false)
        setError('We could not prepare a unique partner URL. Please try again.')
        return
      }

      const usedSlugs = new Set(
        (matchingSlugs ?? []).map((partner) => partner.slug)
      )
      let slug = baseSlug
      let suffix = 2

      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix}`
        suffix += 1
      }

      const { error: currentInsertError } = await supabase.from('partners').insert({
        name,
        slug,
        description: form.description.trim() || null,
        website: website || null,
        country: form.country.trim() || null,
        company_size: form.company_size.trim() || null,
        partner_types: partnerTypes.length ? partnerTypes : null,
      })

      if (!currentInsertError) {
        setSaving(false)
        setSuccess(true)
        window.setTimeout(() => router.replace('/partners'), 900)
        return
      }

      insertErrorMessage = currentInsertError.message

      if (currentInsertError.code !== '23505') {
        break
      }
    }

    setSaving(false)
    setError(
      insertErrorMessage ||
        'We could not create this partner. Please check the details and try again.'
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8">
          <Link
            href="/partners"
            className="text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            &larr; Back to partners
          </Link>
          <p className="mt-8 text-sm font-medium text-blue-400">
            AI Distribution Platform
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Add Partner</h1>
          <p className="mt-2 text-slate-400">
            Add a channel partner to your distribution network.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-6 sm:p-8"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="partner-name" className="text-sm font-medium text-slate-300">
                Partner name <span className="text-blue-400">*</span>
              </label>
              <input
                id="partner-name"
                name="name"
                required
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Northstar Technologies"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="partner-description" className="text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                id="partner-description"
                name="description"
                rows={4}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Describe the partner's focus and channel strengths"
                className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="partner-country" className="text-sm font-medium text-slate-300">
                Country
              </label>
              <input
                id="partner-country"
                name="country"
                value={form.country}
                onChange={(event) => updateField('country', event.target.value)}
                placeholder="e.g. Germany"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="partner-size" className="text-sm font-medium text-slate-300">
                Company size
              </label>
              <input
                id="partner-size"
                name="company_size"
                value={form.company_size}
                onChange={(event) => updateField('company_size', event.target.value)}
                placeholder="e.g.  fifty to two hundred"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="partner-types" className="text-sm font-medium text-slate-300">
                Partner types
              </label>
              <input
                id="partner-types"
                name="partner_types"
                value={form.partner_types}
                onChange={(event) => updateField('partner_types', event.target.value)}
                placeholder="e.g. MSP, Reseller"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-slate-500">Separate multiple types with commas.</p>
            </div>

            <div>
              <label htmlFor="partner-website" className="text-sm font-medium text-slate-300">
                Website
              </label>
              <input
                id="partner-website"
                name="website"
                type="url"
                value={form.website}
                onChange={(event) => updateField('website', event.target.value)}
                placeholder="https://example.com"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-6 rounded-lg border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="mt-6 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4 text-sm text-emerald-300">
              Partner created successfully. Returning to the directory...
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/partners"
              className="rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || success}
              className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving partner...' : success ? 'Partner saved' : 'Save partner'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}