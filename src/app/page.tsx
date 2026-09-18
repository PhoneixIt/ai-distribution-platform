import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const businessAreas = [
  ['Partners', 'Relationships, activation, health signals and next actions.', '/partners'],
  ['Vendors & products', 'Vendor context, products and channel relationships.', '/vendors'],
  ['Customers & opportunities', 'Customer records, opportunities and commercial activity.', '/opportunities'],
  ['Intelligence', 'Market, partner and sales signals for better decisions.', '/discovery'],
]

const workflow = [
  ['01', 'Discover', 'Find relevant companies, products and market signals.'],
  ['02', 'Build relationships', 'Organize partners and vendor relationships around the channel.'],
  ['03', 'Create opportunities', 'Connect customers, partners and commercial activity.'],
  ['04', 'Prioritize', 'Use business context to decide what deserves attention.'],
  ['05', 'Engage', 'Coordinate the next actions across the team.'],
  ['06', 'Operate', 'Keep tasks, approvals and activity visible.'],
]

const trustPoints = [
  ['Recommendations', 'AI can surface priorities and proposed next actions without turning a recommendation into an external action.'],
  ['Human approvals', 'Important decisions stay with the people responsible for the business.'],
  ['Visible activity', 'Runs, tasks and recommendations provide a clear record of coordinated work.'],
  ['Real workspace data', 'The product is designed around your organization’s records, not invented demo companies or metrics.'],
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

      <section className="mx-auto max-w-7xl px-5 pb-24 pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
          <div>
            <p className="text-sm font-medium text-blue-400">AI operating platform for software distribution and channel teams</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Run your software distribution business with an AI operating layer.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
              Bring vendors, partners, customers, opportunities and commercial operations into one workspace.
              Then use AI to research, prioritize and coordinate the work while your team stays in control.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Create your workspace</Link>
              <Link href="/workforce" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">See the AI workforce</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span>Real business records</span>
              <span>Human-controlled actions</span>
              <span>AI-coordinated work</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/20 lg:p-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">AI workforce</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">Business objective</p>
                </div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-400">Human controlled</span>
              </div>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-4">
                <p className="text-sm text-slate-200">Which partners should I reactivate this week?</p>
              </div>
            </div>
            <div className="my-3 flex justify-center text-xs text-slate-600">↓</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['01', 'Coordinate specialist work', 'Partner signals · Sales context'],
                ['02', 'Review business evidence', 'Records · Activity · Opportunities'],
                ['03', 'Return recommendations', 'Priorities · Next actions'],
                ['04', 'Keep people in control', 'Approval · Action · Audit'],
              ].map(([number, title, copy]) => (
                <div key={number} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-[11px] font-semibold text-blue-400">{number}</span>
                  <p className="mt-2 text-sm font-medium text-slate-200">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">The problem</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Software distribution gets fragmented as the business grows.</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-slate-400">
              Vendor information lives in one place. Partner relationships in another. Customer conversations, opportunities, pricing and market research move through spreadsheets, CRM records, email and meetings.
              The result is context scattered across the commercial workflow.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {businessAreas.map(([title, copy, href]) => (
              <Link key={title} href={href} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700 hover:bg-slate-900">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
                <span className="mt-5 inline-flex text-xs font-medium text-slate-600 group-hover:text-blue-400">Open area ↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">One operating workflow</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Connect the commercial work from discovery to execution.</h2>
          <p className="mt-5 text-base leading-7 text-slate-400">
            The platform is built around how a distribution and channel business actually moves: discover, build relationships, create opportunities, prioritize, engage and operate.
          </p>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800 sm:grid-cols-2 lg:grid-cols-3">
          {workflow.map(([number, title, copy]) => (
            <div key={number} className="bg-slate-950 p-6">
              <span className="text-xs font-semibold text-blue-400">{number}</span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">AI workforce</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">You ask. The workforce coordinates. Your team decides.</h2>
              <p className="mt-5 text-base leading-7 text-slate-400">
                This is not another chatbot sitting beside your business system. Give the workforce an objective and it can coordinate the relevant specialist work, use the available business context and return concise recommendations for review.
              </p>
              <Link href="/workforce" className="mt-7 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Open AI workforce</Link>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 lg:p-7">
              <div className="grid gap-3">
                {[
                  ['Objective', 'Which partners should I reactivate this week?', 'You define the business question.'],
                  ['Workforce', 'Partner + sales context', 'Specialists coordinate around the objective.'],
                  ['Recommendation', 'Priorities + next actions', 'The result stays visible for review.'],
                  ['Decision', 'Human review or approved action', 'Important actions remain controlled.'],
                ].map(([label, value, copy], index) => (
                  <div key={label} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-[120px_1fr]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">0{index + 1} · {label}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{value}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Business system first</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A serious SaaS workspace with intelligence built in.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              Start with the records and workflows your team needs. Add AI where it creates leverage, without turning the product into an AI-only interface.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {trustPoints.map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-900">
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-12 text-center sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Start with your real workspace</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Run your channel business from one operating layer.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
              Start with your real partners, vendors, customers and opportunities. Add AI when you need the business to move faster.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Create your workspace</Link>
              <Link href="/login" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Sign in</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-10 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span>AI Distribution Platform</span>
        <span>People manage the business. AI helps operate the work.</span>
      </footer>
    </main>
  )
}
