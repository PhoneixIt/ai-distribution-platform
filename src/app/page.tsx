import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const capabilities = [
  ['01', 'Partners', 'Track partner relationships, health, activation opportunities and next actions.'],
  ['02', 'Vendors', 'Organize vendors and products around the markets and channel relationships that matter.'],
  ['03', 'Sales', 'Keep customers, opportunities, matching and commercial work connected.'],
  ['04', 'AI workforce', 'Ask the operating layer to research, prioritize and coordinate work while people stay in control.'],
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && !user.is_anonymous) redirect('/app')

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-xs font-black">AI</span>
          <span className="text-sm font-semibold">AI Distribution Platform</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">Sign in</Link>
          <Link href="/signup" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Get started</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-16 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="max-w-4xl">
          <p className="text-sm font-medium text-blue-400">AI operating platform for software distribution and channel teams</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Run the work behind your channel business.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-400">
            Connect vendors, partners, customers, opportunities and market intelligence in one workspace.
            Use AI to research, prioritize and coordinate the work — with people in control of important decisions.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Create your workspace</Link>
            <Link href="/login" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Sign in</Link>
          </div>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 lg:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI workforce</p>
                <h2 className="mt-2 text-xl font-semibold">Ask the team to work on a business objective.</h2>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">Human controlled</span>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-5">
              <p className="text-sm text-slate-300">Which partners should I reactivate this week?</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Partner signals', 'Sales context', 'Tasks', 'Approvals'].map(item => (
                  <span key={item} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs text-slate-400">{item}</span>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {['Understand the data', 'Prioritize the work', 'Review next actions'].map((item, index) => (
                <div key={item} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs font-semibold text-blue-400">0{index + 1}</span>
                  <p className="mt-2 text-sm font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">One operating workspace</p>
            <div className="mt-5 space-y-3">
              {['Partners and relationships', 'Vendors and products', 'Customers and opportunities', 'Market and sales intelligence', 'Tasks, approvals and activity'].map(item => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {capabilities.map(([number, title, copy]) => (
            <div key={number} className="rounded-2xl border border-slate-900 bg-slate-900/30 p-5">
              <span className="text-xs font-semibold text-blue-400">{number}</span>
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-10 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span>AI Distribution Platform</span>
        <span>People manage the business. AI helps operate the work.</span>
      </footer>
    </main>
  )
}
