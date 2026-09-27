'use client'

import { FormEvent, useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type Option={id:string;name:string}
type RecordRow={id:string;vendor_id:string;product_id:string|null;partner_id:string|null;price_type:string;currency:string;unit_price:number;discount_percent:number|null;margin_percent:number|null;valid_from:string;valid_to:string|null;status:string;pricing_model:string|null;notes:string|null;vendors:{name:string}|null;products:{name:string}|null;partners:{name:string}|null}
const input='mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500'
const priceTypes=['list','cost','reseller','customer','special']

export default function PricingPage(){
 const [records,setRecords]=useState<RecordRow[]>([]),[vendors,setVendors]=useState<Option[]>([]),[products,setProducts]=useState<Option[]>([]),[partners,setPartners]=useState<Option[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('')
 const [form,setForm]=useState({vendor_id:'',product_id:'',partner_id:'',price_type:'cost',unit_price:'',discount_percent:'',margin_percent:'',valid_from:new Date().toISOString().slice(0,10),valid_to:'',pricing_model:'',notes:''})
 async function load(){
  setLoading(true);setError('')
  try{
   const {supabase,orgId}=await ensureWorkspace()
   const [pr,vr,prod,pa]=await Promise.all([
    supabase.from('pricing_records').select('id,vendor_id,product_id,partner_id,price_type,currency,unit_price,discount_percent,margin_percent,valid_from,valid_to,status,pricing_model,notes,vendors(name),products(name),partners(name)').eq('org_id',orgId).order('created_at',{ascending:false}),
    supabase.from('vendors').select('id,name').eq('is_active',true).order('name'),
    supabase.from('products').select('id,name').eq('is_active',true).order('name'),
    supabase.from('partners').select('id,name').eq('is_active',true).order('name')
   ])
   if(pr.error)throw pr.error;if(vr.error)throw vr.error;if(prod.error)throw prod.error;if(pa.error)throw pa.error
   setRecords((pr.data||[]).map(row=>({...row,vendors:Array.isArray(row.vendors)?row.vendors[0]??null:row.vendors,products:Array.isArray(row.products)?row.products[0]??null:row.products,partners:Array.isArray(row.partners)?row.partners[0]??null:row.partners})) as RecordRow[])
   setVendors(vr.data||[]);setProducts(prod.data||[]);setPartners(pa.data||[])
   setForm(f=>({...f,vendor_id:f.vendor_id||vr.data?.[0]?.id||''}))
  }catch(cause){setError(cause instanceof Error?cause.message:'Could not load pricing workspace.')}finally{setLoading(false)}
 }
 useEffect(()=>{const timer=window.setTimeout(()=>{void load()},0);return()=>window.clearTimeout(timer)},[])
 async function submit(e:FormEvent){e.preventDefault();setError('');if(!form.vendor_id){setError('Select a vendor.');return}if(!form.unit_price||Number(form.unit_price)<0){setError('Enter a valid non-negative unit price.');return}setSaving(true)
  try{
   const {supabase,orgId}=await ensureWorkspace()
   const {error:insertError}=await supabase.from('pricing_records').insert({org_id:orgId,vendor_id:form.vendor_id,product_id:form.product_id||null,partner_id:form.partner_id||null,price_type:form.price_type,currency:'USD',unit_price:Number(form.unit_price),discount_percent:form.discount_percent===''?null:Number(form.discount_percent),margin_percent:form.margin_percent===''?null:Number(form.margin_percent),valid_from:form.valid_from,valid_to:form.valid_to||null,status:'active',pricing_model:form.pricing_model.trim()||null,notes:form.notes.trim()||null})
   if(insertError)throw insertError
   setForm(f=>({...f,unit_price:'',discount_percent:'',margin_percent:'',valid_to:'',pricing_model:'',notes:''}))
   await load()
  }catch(cause){setError(cause instanceof Error?cause.message:'Could not create pricing record.')}finally{setSaving(false)}
 }
 return <AppShell title="Commercial pricing" subtitle="Maintain vendor, reseller and customer pricing inside the workspace. Pricing can feed opportunity economics.">
  <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
   <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
    <Field label="Vendor *"><select required value={form.vendor_id} onChange={e=>setForm({...form,vendor_id:e.target.value})} className={input}><option value="">Select vendor</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
    <Field label="Product"><select value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})} className={input}><option value="">No specific product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Partner"><select value={form.partner_id} onChange={e=>setForm({...form,partner_id:e.target.value})} className={input}><option value="">No specific partner</option>{partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Price type"><select value={form.price_type} onChange={e=>setForm({...form,price_type:e.target.value})} className={input}>{priceTypes.map(v=><option key={v} value={v}>{v}</option>)}</select></Field>
    <Field label="Unit price (USD) *"><input required type="number" min="0" step="0.01" value={form.unit_price} onChange={e=>setForm({...form,unit_price:e.target.value})} className={input}/></Field>
    <Field label="Discount %"><input type="number" min="0" max="100" step="0.01" value={form.discount_percent} onChange={e=>setForm({...form,discount_percent:e.target.value})} className={input}/></Field>
    <Field label="Margin %"><input type="number" min="-100" max="100" step="0.01" value={form.margin_percent} onChange={e=>setForm({...form,margin_percent:e.target.value})} className={input}/></Field>
    <Field label="Valid from"><input type="date" value={form.valid_from} onChange={e=>setForm({...form,valid_from:e.target.value})} className={input}/></Field>
    <Field label="Valid to"><input type="date" value={form.valid_to} onChange={e=>setForm({...form,valid_to:e.target.value})} className={input}/></Field>
    <Field label="Pricing model"><input value={form.pricing_model} onChange={e=>setForm({...form,pricing_model:e.target.value})} placeholder="Annual, monthly, per-user…" className={input}/></Field>
    <label className="text-sm text-slate-700 md:col-span-2">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} className={input}/></label>
   </div>
   {error&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
   <button disabled={saving} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{saving?'Saving…':'Add pricing record'}</button>
  </form>
  <section className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-6">
   <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Price book</p><h2 className="mt-1 text-xl font-semibold">Workspace pricing records</h2></div><span className="text-xs text-slate-500">{records.length} records</span></div>
   {loading?<div className="py-10 text-center text-sm text-slate-500">Loading pricing…</div>:records.length===0?<div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No pricing records yet.</div>:<div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500"><th className="px-3 py-3">Vendor / Product</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Discount</th><th className="px-3 py-3">Margin</th><th className="px-3 py-3">Validity</th></tr></thead><tbody>{records.map(r=><tr key={r.id} className="border-b border-slate-900"><td className="px-3 py-4"><p className="font-medium text-slate-800">{r.products?.name||'Vendor-level price'}</p><p className="mt-1 text-xs text-slate-500">{r.vendors?.name||'Vendor'}</p>{r.partners?.name&&<p className="mt-1 text-xs text-slate-500">Partner: {r.partners.name}</p>}</td><td className="px-3 py-4 capitalize text-slate-500">{r.price_type}</td><td className="px-3 py-4 font-semibold text-slate-800">{r.currency} {Number(r.unit_price).toLocaleString()}</td><td className="px-3 py-4 text-slate-500">{r.discount_percent==null?'—':r.discount_percent+'%'}</td><td className="px-3 py-4 text-slate-500">{r.margin_percent==null?'—':r.margin_percent+'%'}</td><td className="px-3 py-4 text-xs text-slate-500">{r.valid_from+' → '+(r.valid_to||'open')}</td></tr>)}</tbody></table></div>}
  </section>
 </AppShell>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-sm text-slate-700">{label}{children}</label>}
