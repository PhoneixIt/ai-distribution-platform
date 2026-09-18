import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const capabilities = [
  ['01', 'Partners', 'Manage partner relationships, activation, health signals and next actions from one operating view.'],
  ['02', 'Vendors & products', 'Keep vendors, products and channel relationships connected so commercial work has the right context.'],
  ['03', 'Customers & opportunities', 'Connect customers, opportunities, matching and sales activity instead of managing them in separate workflows.'],
  ['04', 'Market intelligence', 'Use discovery and market signals to identify relevant companies, products and commercial opportunities.'],
]

const operatingAreas = [
  ['Partner intelligence', 'Understand which relationships need attention, where activation has stalled and what the team should review next.', '/partners'],
  ['Vendor operations', 'Keep vendor and product information organized around the channel business you are actually running.', '/vendors'],
  ['Sales operations', 'Bring customers, opportunities and matching into the same operating workspace as your partner network.', '/opportunities'],
  ['AI workforce', 'Give the workforce a business objective and let the platform coordinate research, prioritization and recommendations.', '/workforce'],
]

const trustPoints = [
  ['Recommendations', 'AI can surface priorities and proposed next actions without turning a recommendation into an external action.'],
  ['Approvals', 'Important actions can remain with people through explicit approval steps.'],
  ['Activity', 'Work is represented through tasks, recommendations and run information so the team can understand what happened.'],
  ['Real data', 'The workspace is designed around your organization’s actual records rather than pre-filled demo companies or invented results.'],
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

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid items-end gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-sm font-medium text-blue-400">AI operating platform for software distribution and channel teams</p>
            <h1 className="mt-5 max-w-5xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Run your software distribution business with an AI operating layer.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-400">
              Manage vendors, partners, customers, opportunities and commercial operations in one workspace.
              AI helps your team research, prioritize and coordinate the work without taking control away from people.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Create your workspace</Link>
              <Link href="/workforce" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Explore AI workforce</Link>
            </div>
            <p className="mt-4 text-xs text-slate-600">People manage the business. AI helps operate the work.</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 lg:p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Operating workspace</p>
                <p className="mt-1 text-sm font-medium">One place for the channel business</p>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">Human controlled</span>
            </div>
            <div className="mt-4 space-y-2">
              {['Partners and relationships', 'Vendors and products', 'Customers and opportunities', 'Market and sales intelligence', 'Tasks, approvals and activity'].map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <span className="text-sm text-slate-300">{item}</span>
                  <span className="text-xs text-slate-600">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Built around the work</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The operating layer sits across your commercial workflows.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              The platform brings the core records and workflows of a software distribution business together, then adds an AI workforce that can work across that context.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {operatingAreas.map(([title, copy, href], index) => (
              <Link key={title} href={href} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-900">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <span className="text-xs font-semibold text-blue-400">0{index + 1}</span>
                    <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{copy}</p>
                  </div>
                  <span className="text-slate-600 transition group-hover:text-slate-300">↗</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">AI workforce</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Give the team an objective, not another chatbot.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              Ask a business question and the AI workforce can coordinate the relevant specialist work, use the available business context and return recommendations your team can review.
            </p>
            <Link href="/workforce" className="mt-7 inline-flex rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Open AI workforce</Link>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 lg:p-7">
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Business objective</p>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">Ready to run</span>
              </div>
              <p className="mt-4 text-base text-slate-200">Which partners should I reactivate this week?</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Partner signals', 'Sales context', 'Tasks', 'Approvals'].map(item => (
                  <span key={item} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs text-slate-400">{item}</span>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {['Objective', 'Specialist work', 'Recommendations', 'Human review'].map((item, index) => (
                <div key={item} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs font-semibold text-blue-400">0{index + 1}</span>
                  <p className="mt-2 text-sm font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Product foundation</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A serious business system first. AI where it adds leverage.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              Start with the operating records your team already needs. Add intelligence and coordinated work on top instead of replacing the system with an AI conversation.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(([number, title, copy]) => (
              <div key={number} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <span className="text-xs font-semibold text-blue-400">{number}</span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Control & visibility</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">AI works with your team, not around it.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              The operating layer is designed so recommendations, tasks, approvals and activity remain visible to the people responsible for the business.
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
        <div className="mx-auto max-w-7xl px-5 py-20 text-center lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Start with your real workspace</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Bring the business records together. Let the AI workforce help operate the work.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
            Create a workspace, connect your business data and start with the workflows that matter to your team.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Get started</Link>
            <Link href="/login" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Sign in</Link>
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
