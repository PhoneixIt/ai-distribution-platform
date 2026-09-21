import Link from 'next/link'
import MarketingNav from '@/components/marketing-nav'
import MarketingFooter from '@/components/marketing-footer'

const agents = [
  ['Distributor CEO / Orchestrator', 'Turns a business objective into coordinated specialist work and keeps the process within defined boundaries.'],
  ['Vendor Manager', 'Researches vendors and products, supports fit evaluation and vendor relationship workflows.'],
  ['Partner Manager', 'Works on partner health, activation, recruitment, dormancy and relationship priorities.'],
  ['Sales Agent', 'Works across prospects, opportunities, next actions, follow-up and sales context.'],
  ['Market Intelligence', 'Researches markets, competitors, companies, technologies and external signals.'],
  ['Commercial Agent', 'Supports pricing, margin, discount, proposal and commercial-risk analysis.'],
  ['Operations Agent', 'Finds missing information, overdue work, approvals and operational bottlenecks.'],
  ['Future specialist workforce', 'Research, verification, channel fit, contact research, outreach, response and meeting specialists can extend the system as capabilities mature.'],
]

const workflow = ['Discover', 'Research', 'Verify', 'Match', 'Engage', 'Learn']

export default function AIWorkforcePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MarketingNav />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">
        <p className="text-sm font-medium text-blue-400">AI Workforce</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-semibold tracking-tight sm:text-6xl">
          Don&apos;t just ask AI a question. Give the workforce a business objective.
        </h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-400">
          PortAi is designed around coordinated specialist work. An orchestrator can delegate ecosystem research, partner and vendor analysis, sales work, commercial analysis and operations while preserving one shared business context.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/workforce" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Open AI Workforce</Link>
          <Link href="/how-it-works" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold">See how it works</Link>
        </div>
      </section>

      <section className="border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map(([title, copy], index) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <span className="text-xs font-semibold text-blue-400">{String(index + 1).padStart(2, '0')}</span>
                <h2 className="mt-4 font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">A different interaction model</p>
            <h2 className="mt-3 text-3xl font-semibold">Mission → discovery → intelligence → match → approved action → learning.</h2>
          </div>
          <div className="space-y-5 text-sm leading-7 text-slate-400">
            <p>The AI workforce should not expose hidden reasoning or pretend certainty. It should return useful evidence, information gaps, recommendations, actions taken and approval requirements.</p>
            <p>External communication, commercial commitments and sensitive actions can remain behind explicit permissions and human approval. The workforce increases operating capacity without taking ownership of the business away from people.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 lg:p-12">
            <p className="text-xs uppercase tracking-widest text-slate-500">Illustrative objective</p>
            <p className="mt-4 max-w-4xl text-2xl font-medium leading-9">“Find cybersecurity vendors for our EMEA channel, qualify the best ones and prepare the next outreach.”</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {workflow.map((step) => (
                <span key={step} className="rounded-full border border-slate-800 px-3 py-1.5 text-xs text-slate-400">{step}</span>
              ))}
            </div>
            <p className="mt-7 text-xs leading-5 text-slate-600">
              Illustrative future-state workflow. The public site communicates the destination; product capabilities will expand toward it progressively.
            </p>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  )
}
