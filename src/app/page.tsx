import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const pillars = [
  ['01', 'Discover', 'Find vendors, distributors, partners and customers across the open market.'],
  ['02', 'Understand', 'Turn public evidence into structured company intelligence you can inspect.'],
  ['03', 'Match', 'Connect the right vendors, distributors and channel partners to each opportunity.'],
  ['04', 'Operate', 'Keep opportunities, relationships and next actions in one workspace.'],
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && !user.is_anonymous) redirect('/app')

  return <main className="min-h-screen bg-slate-950 text-white">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-black">AI</span><span className="text-sm font-semibold">AI Distribution Platform</span></Link>
      <div className="flex items-center gap-3"><Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">Sign in</Link><Link href="/signup" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Get started</Link></div>
    </nav>
    <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:pt-24">
      <div>
        <div className="inline-flex rounded-full border border-blue-900/70 bg-blue-950/30 px-3 py-1 text-xs font-medium text-blue-300">Evidence-backed channel intelligence</div>
        <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl">Build the right channel ecosystem, faster.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">Discover relevant companies, verify what they do, find the strongest partner relationships and move channel opportunities forward from one operating workspace.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Create your workspace</Link><Link href="/login" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Sign in</Link></div>
        <p className="mt-5 text-xs text-slate-600">Built for vendors, distributors, resellers, MSPs, MSSPs, SIs and channel teams.</p>
      </div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-slate-500">Market search</p><p className="mt-1 font-semibold">Germany · Cybersecurity · MSSP</p></div><span className="rounded-full bg-emerald-950 px-2.5 py-1 text-[11px] text-emerald-300">Live intelligence</span></div><div className="mt-5 grid grid-cols-3 gap-3"><Metric label="Companies" value="247" /><Metric label="Verified" value="181" /><Metric label="Matches" value="36" /></div><div className="mt-5 space-y-3">{['Bechtle Security', 'Computacenter Germany', 'Controlware'].map((name, i) => <div key={name} className="rounded-xl border border-slate-800 bg-slate-900 p-3"><div className="flex items-center justify-between"><span className="text-sm font-medium">{name}</span><span className="text-xs text-blue-300">{92-i*5}% match</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-blue-500" style={{width:`${92-i*5}%`}} /></div></div>)}</div></div>
      </div>
    </section>
    <section className="border-y border-slate-900 bg-slate-950/60"><div className="mx-auto grid max-w-7xl gap-4 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">{pillars.map(([num,title,copy]) => <div key={num} className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5"><span className="text-xs font-semibold text-blue-400">{num}</span><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p></div>)}</div></section>
    <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>AI Distribution Platform</span><span>Discovery · Company intelligence · Channel matching · Opportunities</span></footer>
  </main>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-900 p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div> }
