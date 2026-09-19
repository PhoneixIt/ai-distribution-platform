import Link from 'next/link'
import MarketingNav from '@/components/marketing-nav'
import MarketingFooter from '@/components/marketing-footer'

const layers = [
['Business system','Vendors, distributors, partners, customers, opportunities, pricing, activities, tasks and relationships.','The operating record'],
['Discovery & intelligence','External research, market signals, company context, technology and product intelligence.','The context layer'],
['Partner intelligence','Partner health, capabilities, activity, performance, dormancy, recruitment and next actions.','The channel layer'],
['Vendor & product intelligence','Research vendors and products, organize fit and connect them to channel opportunities.','The supply layer'],
['Sales & opportunity intelligence','Pipeline, prospects, opportunities, meeting context, follow-up and commercial priorities.','The revenue layer'],
['Commercial intelligence','Pricing, margins, discounts, proposals, economics and commercial risk.','The decision layer'],
['Operations','Tasks, approvals, missing information, bottlenecks, reminders and execution status.','The execution layer'],
['AI workforce','Coordinated specialist AI work around objectives, evidence, recommendations, approvals and authorized actions.','The operating layer'],
]

export default function PlatformPage() {
 return <main className="min-h-screen bg-slate-950 text-white"><MarketingNav/>
 <section className="mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">
  <p className="text-sm font-medium text-blue-400">The platform</p>
  <h1 className="mt-4 max-w-5xl text-5xl font-semibold tracking-tight sm:text-6xl">One operating layer for the software distribution business.</h1>
  <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-400">Bring the business system, external intelligence, commercial context and AI workforce together. The destination is a platform where business objectives can become coordinated work instead of disconnected searches, records and tools.</p>
  <div className="mt-9 flex flex-wrap gap-3"><Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Create your workspace</Link><Link href="/ai-workforce" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Explore AI Workforce</Link></div>
 </section>
 <section className="border-y border-slate-900 bg-slate-950/70"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
  <div className="grid gap-px overflow-hidden rounded-3xl border border-slate-800 bg-slate-800 md:grid-cols-2 lg:grid-cols-4">
   {layers.map(([title,copy,label],i)=><div key={title} className="bg-slate-950 p-7"><span className="text-xs font-semibold text-blue-400">{String(i+1).padStart(2,'0')}</span><p className="mt-4 text-xs uppercase tracking-wider text-slate-600">{label}</p><h2 className="mt-2 text-lg font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{copy}</p></div>)}
  </div>
 </div></section>
 <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24"><div className="grid gap-10 lg:grid-cols-2">
  <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-400">Not another tool</p><h2 className="mt-3 text-3xl font-semibold">CRM stores the business. The platform coordinates the work.</h2></div>
  <div className="space-y-4 text-sm leading-7 text-slate-400"><p>A CRM is a system of record. A PRM manages partner programs. Ecosystem intelligence exposes relationships. Sales engagement runs sequences. AI sales workers execute specific revenue functions.</p><p>The intended platform connects those operating needs around the specific economics and relationships of software distribution.</p><p className="text-slate-300">The differentiator is not “more AI.” It is a shared operating context in which specialized AI work can coordinate across vendors, partners, customers, opportunities, commercial decisions and operations.</p></div>
 </div></section>
 <section className="border-y border-slate-900 bg-slate-900/30"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 lg:p-12"><p className="text-xs font-semibold uppercase tracking-widest text-blue-400">Product principle</p><h2 className="mt-3 text-3xl font-semibold">People manage the business. AI operates the work.</h2><p className="mt-5 max-w-3xl text-base leading-7 text-slate-500">People define objectives, relationships, rules, permissions and important commitments. AI can progressively take on research, analysis, coordination, communication and authorized operational work, with evidence and approval boundaries visible.</p></div></div></section>
 <MarketingFooter/></main>
}