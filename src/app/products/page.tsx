'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/app-shell'
import { createClient } from '@/lib/supabase/client'

type Product = { id:string; vendor_id:string|null; name:string; category_name:string|null; description:string|null; core_capabilities:string[]|null; pricing_model:string|null; is_active:boolean; vendors?:{name:string}|{name:string}[]|null }

export default function ProductsPage() {
  const [items,setItems]=useState<Product[]>([]), [q,setQ]=useState(''), [loading,setLoading]=useState(true), [error,setError]=useState('')
  useEffect(()=>{let active=true; void createClient().from('products').select('id,vendor_id,name,category_name,description,core_capabilities,pricing_model,is_active,vendors(name)').eq('is_active',true).order('name').then(({data,error})=>{if(!active)return;if(error)setError('Could not load products.');setItems((data||[]).map(row=>({...row,vendors:Array.isArray(row.vendors)?row.vendors[0]??null:row.vendors})) as Product[]);setLoading(false)});return()=>{active=false}},[])
  const filtered=useMemo(()=>{const term=q.trim().toLowerCase();return term?items.filter(x=>[x.name,x.category_name,x.description,x.pricing_model,...(x.core_capabilities||[])].filter(Boolean).join(' ').toLowerCase().includes(term)):items},[items,q])
  return <AppShell title="Product catalog" subtitle="Manage the product layer that connects vendors, pricing and customer opportunities.">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products, vendors, categories or capabilities" className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-500"/><Link href="/products/new" className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold hover:bg-blue-500">Add product</Link></div>
    {error&&<div className="mb-5 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}
    {loading?<div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">Loading products…</div>:filtered.length===0?<div className="rounded-xl border border-dashed border-slate-800 p-10 text-center"><p className="text-sm text-slate-400">No products yet.</p><p className="mt-1 text-xs text-slate-600">Add a real product to the shared catalog before using it in pricing or opportunities.</p></div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(item=><article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-xs text-slate-500">{item.vendors?item.vendors.name:'Vendor not assigned'}</p></div>{item.category_name&&<span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400">{item.category_name}</span>}</div><p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">{item.description||'No product description recorded.'}</p><div className="mt-4 flex flex-wrap gap-2">{(item.core_capabilities||[]).slice(0,4).map(v=><span key={v} className="rounded-full bg-slate-950 px-2.5 py-1 text-xs text-slate-500">{v}</span>)}</div>{item.pricing_model&&<p className="mt-4 text-xs text-slate-500">Pricing model: <span className="text-slate-300">{item.pricing_model}</span></p>}</article>)}</div>}
  </AppShell>
}
