'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type Customer = {
  id: string
  company_name: string
}

type Opportunity = {
  id: string
  title: string
  status: string
  stage: string
  estimated_value: number | null
  probability: number
  customer_id: string
  customers?: Customer | null
  created_at: string
}

const stages = [
  'new',
  'qualified',
  'partner_matching',
  'partner_selected',
  'engagement',
  'proposal',
  'negotiation',
  'won',
  'lost',
]

type FormState = {
  title: string
  customer_id: string
  description: string
  estimated_value: string
  probability: string
  stage: string
  status: string
  preferred_region: string
  requirements: string
}

const initialForm: FormState = {
  title: '',
  customer_id: '',
  description: '',
  estimated_value: '',
  probability: '20',
  stage: 'new',
  status: 'open',
  preferred_region: '',
  requirements: '',
}

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [orgId, setOrgId] = useState('')
  const [form, setForm] = useState<FormState>(initialForm)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const { supabase, orgId } = await ensureWorkspace()
        if (!active) return

        setOrgId(orgId)

        const [opportunitiesResult, customersResult] = await Promise.all([
          supabase
            .from('opportunities')
            .select(
              'id,title,status,stage,estimated_value,probability,customer_id,customers(id,company_name),created_at',
            )
            .eq('org_id', orgId)
            .order('created_at', { ascending: false }),
          supabase
            .from('customers')
            .select('id,company_name')
            .eq('org_id', orgId)
            .order('company_name'),
        ])

        if (opportunitiesResult.error) throw opportunitiesResult.error
        if (customersResult.error) throw customersResult.error

        const normalized = (opportunitiesResult.data ?? []).map((row) => {
          const customer = Array.isArray(row.customers)
            ? row.customers[0] ?? null
            : row.customers
          return { ...row, customers: customer } as Opportunity
        })

        if (active) {
          setItems(normalized)
          setCustomers(customersResult.data ?? [])
          setForm((current) => ({
            ...current,
            customer_id: current.customer_id || customersResult.data?.[0]?.id || '',
          }))
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Could not load opportunities.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  async function createOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.customer_id) {
      setError('Add a customer before creating an opportunity.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { supabase } = await ensureWorkspace()
      const { data, error: insertError } = await supabase
        .from('opportunities')
        .insert({
          org_id: orgId,
          customer_id: form.customer_id,
          title: form.title,
          description: form.description || null,
          estimated_value: form.estimated_value
            ? Number(form.estimated_value)
            : null,
          probability: Number(form.probability) || 0,
          stage: form.stage,
          status: form.status,
          preferred_region: form.preferred_region || null,
          requirements: form.requirements
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        })
        .select('id,title,status,stage,estimated_value,probability,customer_id,created_at')
        .single()

      if (insertError) throw insertError

      setItems((current) => [
        {
          ...(data as Opportunity),
          customers:
            customers.find((customer) => customer.id === form.customer_id) ?? null,
        },
        ...current,
      ])
      setForm((current) => ({
        ...initialForm,
        customer_id: current.customer_id,
      }))
      setShow(false)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not create opportunity.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function updateStage(id: string, stage: string) {
    try {
      const { supabase } = await ensureWorkspace()
      const status = stage === 'won' ? 'won' : stage === 'lost' ? 'lost' : 'open'
      const probability = status === 'won' ? 100 : status === 'lost' ? 0 : undefined

      const { error: updateError } = await supabase
        .from('opportunities')
        .update({
          stage,
          status,
          ...(probability === undefined ? {} : { probability }),
        })
        .eq('id', id)
        .eq('org_id', orgId)

      if (updateError) throw updateError

      setItems((current) =>
        current.map((opportunity) =>
          opportunity.id === id
            ? {
                ...opportunity,
                stage,
                status,
                probability: probability ?? opportunity.probability,
              }
            : opportunity,
        ),
      )
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not update opportunity.',
      )
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Opportunities</h1>
            <p className="mt-1 text-sm text-slate-400">
              Track customer demand and route the right channel partners.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShow((visible) => !visible)}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
          >
            {show ? 'Close' : 'Create opportunity'}
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {show ? (
          <form
            onSubmit={createOpportunity}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Opportunity title"
                value={form.title}
                required
                onChange={(value) => setForm({ ...form, title: value })}
              />
              <Select
                label="Customer"
                value={form.customer_id}
                onChange={(value) => setForm({ ...form, customer_id: value })}
                options={customers.map((customer) => [
                  customer.id,
                  customer.company_name,
                ])}
              />
              <Input
                label="Estimated value (USD)"
                value={form.estimated_value}
                onChange={(value) => setForm({ ...form, estimated_value: value })}
              />
              <Input
                label="Probability %"
                value={form.probability}
                onChange={(value) => setForm({ ...form, probability: value })}
              />
              <Select
                label="Stage"
                value={form.stage}
                onChange={(value) => setForm({ ...form, stage: value })}
                options={stages.map((stage) => [
                  stage,
                  stage.replaceAll('_', ' '),
                ])}
              />
              <Input
                label="Preferred region"
                value={form.preferred_region}
                onChange={(value) =>
                  setForm({ ...form, preferred_region: value })
                }
              />
              <Input
                label="Requirements (comma separated)"
                value={form.requirements}
                onChange={(value) => setForm({ ...form, requirements: value })}
              />
              <label className="text-sm text-slate-300 md:col-span-2">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create opportunity'}
            </button>
          </form>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
            Loading pipeline…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center">
            <p className="font-medium">No opportunities yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Create a customer first, then create your first channel opportunity.
            </p>
            <Link
              href="/customers"
              className="mt-4 inline-block text-sm text-blue-400"
            >
              Go to customers →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((opportunity) => (
              <article
                key={opportunity.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{opportunity.title}</h2>
                      <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400">
                        {opportunity.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {opportunity.customers?.company_name ??
                        customers.find((customer) => customer.id === opportunity.customer_id)
                          ?.company_name ??
                        'Customer'}{' '}
                      ·{' '}
                      {opportunity.estimated_value
                        ? `$${Number(opportunity.estimated_value).toLocaleString()}`
                        : 'Value not set'}{' '}
                      · {opportunity.probability}% probability
                    </p>
                  </div>
                  <select
                    value={opportunity.stage}
                    onChange={(event) => void updateStage(opportunity.id, event.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm capitalize text-slate-200"
                  >
                    {stages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, opportunity.probability))}%`,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}

function Input({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[][]
}) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      >
        <option value="">Select…</option>
        {options.map(([valueOption, labelOption]) => (
          <option key={valueOption} value={valueOption}>
            {labelOption}
          </option>
        ))}
      </select>
    </label>
  )
}
