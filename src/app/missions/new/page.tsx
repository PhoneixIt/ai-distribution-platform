'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/app-shell'

const presets = [
  {
    label: 'Cybersecurity MSPs',
    objective: 'Find 10 qualified cybersecurity MSPs in Germany for a new vendor that serve mid-market customers.',
    partnerTypes: ['MSP', 'MSSP'],
    technologyFocus: 'Cybersecurity',
    customerSegment: 'Mid-market',
    country: 'Germany',
  },
  {
    label: 'Cloud partners',
    objective: 'Find 10 qualified cloud and managed service partners in Germany for a new technology vendor.',
    partnerTypes: ['MSP', 'Reseller'],
    technologyFocus: 'Cloud',
    customerSegment: 'Mid-market',
    country: 'Germany',
  },
]

export default function NewMissionPage() {
  const router = useRouter()
  const [objective, setObjective] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [productName, setProductName] = useState('')
  const [technologyFocus, setTechnologyFocus] = useState('')
  const [customerSegment, setCustomerSegment] = useState('')
  const [country, setCountry] = useState('')
  const [partnerTypes, setPartnerTypes] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  function applyPreset(preset: typeof presets[number]) {
    setObjective(preset.objective)
    setPartnerTypes(preset.partnerTypes)
    setTechnologyFocus(preset.technologyFocus)
    setCustomerSegment(preset.customerSegment)
    setCountry(preset.country)
  }

  function togglePartnerType(type: string) {
    setPartnerTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const clean = objective.trim()
    if (!clean || clean.length > 4000) return
    setRunning(true)
    setError('')
    try {
      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: clean,
          vendorName,
          productName,
          technologyFocus,
          customerSegment,
          country,
          partnerTypes,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.mission?.id) throw new Error(payload.error || 'Could not create mission.')
      router.push('/missions/' + payload.mission.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create mission.')
      setRunning(false)
    }
  }

  return (
    <AppShell title="Start a mission" subtitle="Tell PortAi what you want to accomplish. You can use normal business language — the platform handles the workflow underneath.">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 lg:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Mission brief</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">What should PortAi accomplish for you?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Start with the outcome. PortAi can turn a sentence like “Find 20 cybersecurity MSPs in Germany for my product” into discovery, verification, matching and a reviewable shortlist.</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700">
                Use {preset.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Your objective <span className="text-blue-700">*</span></span>
              <textarea required maxLength={4000} rows={5} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Example: Find 20 qualified cybersecurity MSPs in Germany that could sell my product." className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500" />
              <span className="mt-1 block text-right text-[11px] text-slate-600">{objective.length}/4000</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vendor name" value={vendorName} setValue={setVendorName} placeholder="Optional" />
              <Field label="Product / solution" value={productName} setValue={setProductName} placeholder="Optional" />
              <Field label="Technology focus" value={technologyFocus} setValue={setTechnologyFocus} placeholder="e.g. Cybersecurity" />
              <Field label="Customer segment" value={customerSegment} setValue={setCustomerSegment} placeholder="e.g. Mid-market" />
              <Field label="Target country" value={country} setValue={setCountry} placeholder="e.g. Germany" />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">Partner types <span className="text-xs font-normal text-slate-600">optional</span></p>
              <div className="mt-2 flex flex-wrap gap-2">
                {['MSP', 'MSSP', 'Reseller', 'Distributor', 'Integrator', 'VAR'].map((type) => {
                  const selected = partnerTypes.includes(type)
                  return <button key={type} type="button" onClick={() => togglePartnerType(type)} className={selected ? 'rounded-full border border-blue-500 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700' : 'rounded-full border border-slate-200 px-3.5 py-2 text-xs text-slate-600 hover:border-slate-500'}>{type}</button>
                })}
              </div>
            </div>

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-xs leading-5 text-slate-500">Creating a mission starts the controlled workflow; it does not contact anyone. External communication and consequential actions remain behind explicit approval.</p>
              <button disabled={running || !objective.trim()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{running ? 'Creating mission…' : 'Create mission →'}</button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  )
}

function Field({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" /></label>
}
