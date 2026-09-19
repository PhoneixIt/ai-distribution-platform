'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/components/app-shell'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type Opportunity = {
  id: string
  title: string
  description: string | null
  status: string
  stage: string
  estimated_value: number | null
  probability: number
  expected_close_date: string | null
  timeline: string | null
  preferred_region: string | null
  requirements: string[]
  technology_categories: string[]
  customers?: { company_name: string; industry: string | null; company_size: string | null } | null
}

type ProductOption = { id:string; name:string; vendor_id:string|null; vendors?:{name:string}|{name:string}[]|null }
type PricingOption = { id:string; product_id:string|null; vendor_id:string; price_type:string; currency:string; unit_price:number; discount_percent:number|null; status:string; products?:{name:string}|{name:string}[]|null }
type OpportunityProduct = { id:string; product_id:string; pricing_record_id:string|null; quantity:number; unit_price:number; discount_percent:number; currency:string; line_revenue:number; status:string; products?:{name:string}|{name:string}[]|null }

type Match = {
  id: string
  rank: number
  match_score: number
  capability_fit_score: number | null
  industry_fit_score: number | null
  geography_fit_score: number | null
  company_size_fit_score: number | null
  match_reason: string | null
  strengths: string[]
  risks: string[]
  missing_capabilities: string[]
  recommended_action: string | null
  status: string
  partners?: { id: string; name: string; website: string | null; description: string | null; country: string | null; partner_types: string[]; is_verified: boolean } | null
}

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>()
  const opportunityId = params.id
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([])
  const [opportunityProducts, setOpportunityProducts] = useState<OpportunityProduct[]>([])
  const [lineSaving, setLineSaving] = useState(false)
  const [lineError, setLineError] = useState('')
  const [lineForm, setLineForm] = useState({ product_id:'', pricing_record_id:'', quantity:'1', unit_price:'', discount_percent:'0' })
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const [{ data: opportunityData, error: opportunityError }, { data: matchData, error: matchError }, { data: lineData, error: lineQueryError }, { data: productData, error: productQueryError }, { data: pricingData, error: pricingQueryError }] = await Promise.all([
        supabase
          .from('opportunities')
          .select('id,title,description,status,stage,estimated_value,probability,expected_close_date,timeline,preferred_region,requirements,technology_categories,customers(company_name,industry,company_size)')
          .eq('id', opportunityId)
          .eq('org_id', orgId)
          .single(),
        supabase
          .from('partner_matches')
          .select('id,rank,match_score,capability_fit_score,industry_fit_score,geography_fit_score,company_size_fit_score,match_reason,strengths,risks,missing_capabilities,recommended_action,status,partners(id,name,website,description,country,partner_types,is_verified)')
          .eq('opportunity_id', opportunityId)
          .eq('org_id', orgId)
          .order('rank'),
        supabase
          .from('opportunity_products')
          .select('id,product_id,pricing_record_id,quantity,unit_price,discount_percent,currency,line_revenue,status,products(name)')
          .eq('opportunity_id', opportunityId)
          .eq('org_id', orgId)
          .order('created_at'),
        supabase
          .from('products')
          .select('id,name,vendor_id,vendors(name)')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('pricing_records')
          .select('id,product_id,vendor_id,price_type,currency,unit_price,discount_percent,status,products(name)')
          .eq('org_id', orgId)
          .eq('status', 'active')
          .order('created_at', { ascending:false }),
      ])
      if (opportunityError) throw opportunityError
      if (matchError) throw matchError
      if (lineQueryError) throw lineQueryError
      if (productQueryError) throw productQueryError
      if (pricingQueryError) throw pricingQueryError
      const rawOpportunity = opportunityData as Opportunity & { customers?: Opportunity['customers'] | Opportunity['customers'][] }
      setOpportunity({ ...rawOpportunity, customers: Array.isArray(rawOpportunity.customers) ? rawOpportunity.customers[0] ?? null : rawOpportunity.customers })
      setMatches((matchData || []).map((row) => ({ ...row, partners: Array.isArray(row.partners) ? row.partners[0] ?? null : row.partners })) as Match[])
      setOpportunityProducts((lineData || []).map((row) => ({ ...row, products: Array.isArray(row.products) ? row.products[0] ?? null : row.products })) as OpportunityProduct[])
      setProducts((productData || []).map((row) => ({ ...row, vendors: Array.isArray(row.vendors) ? row.vendors[0] ?? null : row.vendors })) as ProductOption[])
      setPricingOptions((pricingData || []).map((row) => ({ ...row, products: Array.isArray(row.products) ? row.products[0] ?? null : row.products })) as PricingOption[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load opportunity.')
    } finally {
      setLoading(false)
    }
  }

  // Data-fetching effect: the async callback owns the state updates after the request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [opportunityId])

  async function runMatching() {
    setMatching(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/opportunities/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunityId }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Matching failed.')
      setMessage(`Matching complete: ${payload.matched} partner candidates ranked.`)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Matching failed.')
    } finally {
      setMatching(false)
    }
  }

  async function addOpportunityProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLineSaving(true)
    setLineError('')
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const quantity = Number(lineForm.quantity)
      const unitPrice = Number(lineForm.unit_price)
      const discount = Number(lineForm.discount_percent || 0)
      if (!lineForm.product_id || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(discount) || discount < 0 || discount > 100) throw new Error('Enter a valid product, quantity, price and discount.')
      const pricing = pricingOptions.find((item) => item.id === lineForm.pricing_record_id)
      const { error: insertError } = await supabase.from('opportunity_products').insert({
        org_id: orgId, opportunity_id: opportunityId, product_id: lineForm.product_id,
        pricing_record_id: lineForm.pricing_record_id || null, quantity, unit_price: unitPrice,
        discount_percent: discount, currency: pricing?.currency || 'USD',
        line_revenue: Number((quantity * unitPrice * (1 - discount / 100)).toFixed(2)),
        status: opportunity?.status === 'won' ? 'won' : 'proposed',
      })
      if (insertError) throw insertError
      setLineForm({ product_id:'', pricing_record_id:'', quantity:'1', unit_price:'', discount_percent:'0' })
      await load()
    } catch (cause) {
      setLineError(cause instanceof Error ? cause.message : 'Could not add product line.')
    } finally { setLineSaving(false) }
  }

  async function selectPartner(partnerId: string) {
    setSelecting(partnerId)
    setError('')
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const { error: insertError } = await supabase.from('opportunity_partners').upsert({ org_id: orgId, opportunity_id: opportunityId, partner_id: partnerId, role: 'partner', status: 'proposed', is_primary: false }, { onConflict: 'opportunity_id,partner_id' })
      if (insertError) throw insertError
      const { error: stageError } = await supabase.from('opportunities').update({ stage: 'partner_selected', status: 'open' }).eq('id', opportunityId).eq('org_id', orgId)
      if (stageError) throw stageError
      setMessage('Partner added to the opportunity. The opportunity is now ready for engagement.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not select partner.')
    } finally {
      setSelecting(null)
    }
  }

  if (loading) return <main className="min-h-screen bg-slate-950 p-8 text-slate-400">Loading opportunity…</main>
  if (!opportunity) return <main className="min-h-screen bg-slate-950 p-8 text-white"><p>Opportunity not found.</p><Link href="/opportunities" className="mt-4 inline-block text-blue-400">← Back to opportunities</Link></main>

  return (
    <AppShell title="Opportunity workspace" subtitle="Connect customer demand, channel matching and partner engagement.">
      <div className="mx-auto max-w-6xl px-0 py-0">
        <Link href="/opportunities" className="text-sm text-blue-400 hover:text-blue-300">← Opportunities</Link>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Opportunity workspace</p>
            <h1 className="mt-2 text-3xl font-bold">{opportunity.title}</h1>
            <p className="mt-2 text-slate-400">{opportunity.customers?.company_name || 'Customer'} · {opportunity.preferred_region || 'Region not set'} · {opportunity.stage.replaceAll('_', ' ')}</p>
          </div>
          <button onClick={() => void runMatching()} disabled={matching} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{matching ? 'Matching partners…' : matches.length ? 'Refresh partner matches' : 'Find matching partners'}</button>
        </div>

        {error && <div className="mt-5 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}
        {message && <div className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-300">{message}</div>}

        <section className="mt-7 grid gap-4 md:grid-cols-4">
          <Metric label="Customer" value={opportunity.customers?.company_name || '—'} />
          <Metric label="Technology" value={opportunity.technology_categories.join(', ') || 'Not set'} />
          <Metric label="Requirements" value={opportunity.requirements.join(', ') || 'Not set'} />
          <Metric label="Value" value={opportunity.estimated_value ? `${Number(opportunity.estimated_value).toLocaleString()}` : 'Not set'} />
          <Metric label="Company size" value={opportunity.customers?.company_size || 'Not set'} />
          <Metric label="Timeline" value={opportunity.timeline || 'Not set'} />
          <Metric label="Expected close" value={opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toLocaleDateString() : 'Not set'} />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Commercial bridge</p><h2 className="mt-2 text-xl font-semibold">Products and deal economics</h2><p className="mt-1 text-sm text-slate-500">Attach real catalog products and workspace pricing. Revenue is calculated from quantity, unit price and discount.</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">{opportunityProducts.length} line items</span></div>
          <form onSubmit={addOpportunityProduct} className="mt-5 grid gap-3 md:grid-cols-5">
            <select value={lineForm.product_id} onChange={e=>setLineForm({...lineForm,product_id:e.target.value,pricing_record_id:''})} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200"><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select value={lineForm.pricing_record_id} onChange={e=>{const p=pricingOptions.find(x=>x.id===e.target.value);setLineForm({...lineForm,pricing_record_id:e.target.value,unit_price:p?String(p.unit_price):lineForm.unit_price,discount_percent:p?.discount_percent==null?lineForm.discount_percent:String(p.discount_percent)})}} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200"><option value="">No pricing record</option>{pricingOptions.filter(p=>!lineForm.product_id||p.product_id===lineForm.product_id).map(p=><option key={p.id} value={p.id}>{p.products&&!Array.isArray(p.products)?p.products.name:'Product'} · {p.price_type} · {p.currency} {Number(p.unit_price).toLocaleString()}</option>)}</select>
            <input type="number" min="0.01" step="0.01" value={lineForm.quantity} onChange={e=>setLineForm({...lineForm,quantity:e.target.value})} placeholder="Quantity" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200"/>
            <input type="number" min="0" step="0.01" value={lineForm.unit_price} onChange={e=>setLineForm({...lineForm,unit_price:e.target.value})} placeholder="Unit price" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200"/>
            <div className="flex gap-2"><input type="number" min="0" max="100" step="0.01" value={lineForm.discount_percent} onChange={e=>setLineForm({...lineForm,discount_percent:e.target.value})} placeholder="Discount %" className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200"/><button disabled={lineSaving||!lineForm.product_id} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{lineSaving?'Adding…':'Add'}</button></div>
          </form>
          {lineError&&<p className="mt-3 text-xs text-red-300">{lineError}</p>}
          {opportunityProducts.length?<div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-600"><th className="px-3 py-3">Product</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Unit</th><th className="px-3 py-3">Discount</th><th className="px-3 py-3">Revenue</th></tr></thead><tbody>{opportunityProducts.map(item=><tr key={item.id} className="border-b border-slate-900"><td className="px-3 py-4 font-medium text-slate-200">{item.products&&!Array.isArray(item.products)?item.products.name:'Product'}</td><td className="px-3 py-4 text-slate-400">{Number(item.quantity).toLocaleString()}</td><td className="px-3 py-4 text-slate-400">{item.currency} {Number(item.unit_price).toLocaleString()}</td><td className="px-3 py-4 text-slate-400">{Number(item.discount_percent).toLocaleString()}%</td><td className="px-3 py-4 font-semibold text-slate-200">{item.currency} {Number(item.line_revenue).toLocaleString()}</td></tr>)}</tbody></table><div className="mt-4 flex justify-end text-sm font-semibold text-slate-200">Product revenue: USD {opportunityProducts.reduce((sum,item)=>sum+Number(item.line_revenue||0),0).toLocaleString()}</div></div>:<div className="mt-5 rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No products attached to this opportunity yet.</div>}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">AI matching layer</p><h2 className="mt-2 text-xl font-semibold">Best channel partners</h2><p className="mt-1 text-sm text-slate-500">Deterministic matching uses the structured partner and opportunity data first. AI explanation can be layered on top later.</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">{matches.length} ranked</span></div>

          {matches.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-slate-800 p-10 text-center"><p className="text-sm text-slate-400">No matches yet.</p><p className="mt-1 text-xs text-slate-600">Run matching to compare your opportunity against active partner profiles.</p></div> : <div className="mt-6 space-y-4">{matches.map((match) => <article key={match.id} className="rounded-xl border border-slate-800 bg-slate-950 p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold">{match.rank}</span><h3 className="text-lg font-semibold">{match.partners?.name || 'Partner'}</h3><span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400">{match.status}</span>{match.partners?.is_verified && <span className="rounded-full border border-emerald-900 px-2 py-1 text-[11px] text-emerald-400">Verified</span>}</div><p className="mt-2 text-sm text-slate-400">{match.match_reason || 'Structured data indicates potential fit.'}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">{match.strengths.slice(0, 4).map((item) => <span key={item} className="rounded-full border border-slate-800 px-2.5 py-1">{item}</span>)}</div></div><div className="w-full lg:w-80"><div className="flex items-end justify-between"><span className="text-xs uppercase tracking-wider text-slate-500">Match</span><span className="text-3xl font-bold text-blue-400">{Math.round(Number(match.match_score))}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, Number(match.match_score)))}%` }} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><Mini label="Capability" value={match.capability_fit_score} /><Mini label="Industry" value={match.industry_fit_score} /><Mini label="Geography" value={match.geography_fit_score} /><Mini label="Size" value={match.company_size_fit_score} /></div></div></div><div className="mt-5 grid gap-4 border-t border-slate-800 pt-4 md:grid-cols-2"><div><p className="text-xs uppercase tracking-wider text-slate-500">Recommended action</p><p className="mt-1 text-sm text-slate-300">{match.recommended_action || 'Review the partner profile before outreach.'}</p></div><div><p className="text-xs uppercase tracking-wider text-slate-500">Risks / missing capabilities</p><p className="mt-1 text-sm text-slate-400">{[...match.risks, ...match.missing_capabilities].slice(0, 3).join(' · ') || 'None recorded'}</p></div></div><div className="mt-5 flex flex-wrap gap-3 border-t border-slate-800 pt-4"><button onClick={() => match.partners && void selectPartner(match.partners.id)} disabled={!match.partners || selecting === match.partners.id} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{selecting === match.partners?.id ? 'Adding…' : 'Select partner'}</button>{match.partners?.website && <a href={match.partners.website} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-blue-500">Visit website</a>}</div></article>)}</div>}
        </section>
      </div>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 truncate text-sm font-medium text-slate-200">{value}</p></div> }
function Mini({ label, value }: { label: string; value: number | null }) { return <div className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-2"><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 text-sm font-semibold text-slate-300">{value == null ? '—' : `${Math.round(Number(value))}%`}</p></div> }
