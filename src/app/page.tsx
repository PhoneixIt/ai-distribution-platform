import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const platformLayers = [
  ['01', 'Business System', 'Vendors, distributors, partners, customers, opportunities, pricing, activities, tasks and relationships in one operating workspace.'],
  ['02', 'Discovery & Intelligence', 'Discover companies, vendors, products, channel opportunities and market signals, then turn evidence into useful business context.'],
  ['03', 'Partner Intelligence', 'Understand partner health, activity, capabilities, performance, dormancy, recruitment opportunities and the next action.'],
  ['04', 'Vendor & Product Intelligence', 'Research vendors and products, organize channel context and identify where new distribution opportunities fit.'],
  ['05', 'Sales & Opportunity Intelligence', 'Connect prospects, customers, opportunities, pipeline, follow-ups, meeting preparation and sales priorities.'],
  ['06', 'Commercial Intelligence', 'Bring pricing, margin, discount and opportunity economics into the decision process while keeping commitments controlled.'],
  ['07', 'Operations', 'Coordinate tasks, follow-ups, missing information, approvals, activity and operational bottlenecks.'],
  ['08', 'AI Workforce', 'Coordinate specialized AI work around business objectives, evidence, recommendations, approvals and authorized actions.'],
]

const workforce = [
  ['Distributor CEO / Orchestrator', 'Coordinates the workforce around a business objective and keeps the work within defined boundaries.'],
  ['Vendor Manager', 'Works on vendor and product research, onboarding opportunities and vendor relationships.'],
  ['Partner Manager', 'Analyzes partner health, activation, dormancy, recruitment and channel relationships.'],
  ['Sales Agent', 'Works on opportunities, priorities, next actions, follow-ups and sales context.'],
  ['Market Intelligence', 'Researches markets, competitors, products and external signals.'],
  ['Commercial Agent', 'Analyzes pricing, margins, discounts and commercial risk.'],
  ['Operations Agent', 'Finds overdue work, missing information and workflow bottlenecks.'],
  ['Future specialist workforce', 'Research, verification, channel fit, contact research, outreach and response specialists can extend the operating model as the platform grows.'],
]

const workflow = [
  ['Discover', 'Find relevant companies, vendors, products and market signals.'],
  ['Research & Verify', 'Build evidence and understand whether an opportunity is real and relevant.'],
  ['Qualify & Match', 'Connect vendors, products, partners, customers and channel fit.'],
  ['Engage & Sell', 'Prepare and coordinate outreach, meetings, opportunities and commercial work.'],
  ['Operate', 'Manage tasks, follow-ups, approvals and activity across the business.'],
  ['Learn', 'Use outcomes and business activity to improve future decisions.'],
]

const principles = [
  ['People manage the business', 'Your team owns relationships, commitments, commercial decisions and important actions.'],
  ['AI operates the work', 'AI can research, analyze, coordinate and prepare work without replacing business ownership.'],
  ['Evidence before action', 'The operating layer should distinguish facts, inferences, recommendations, actions and approvals.'],
  ['One connected business context', 'The value comes from connecting vendors, partners, customers, opportunities, intelligence and operations.'],
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && !user.is_anonymous) redirect('/app')

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="sticky top-0 z-50 border-b border-slate-900/90 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-xs font-black">AI</span>
            <span className="text-sm font-semibold">AI Distribution Platform</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate-400 lg:flex">
            <a href="#platform" className="hover:text-white">Platform</a>
            <a href="#workforce" className="hover:text-white">AI Workforce</a>
            <a href="#workflow" className="hover:text-white">How it works</a>
            <a href="#partners" className="hover:text-white">Partners</a>
            <a href="#about" className="hover:text-white">About</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Get started</Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-5 pb-24 pt-20 lg:px-8 lg:pb-32 lg:pt-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
          <div>
            <p className="text-sm font-medium text-blue-400">AI operating platform for software distribution</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Run the distribution business. Let AI operate the work.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
              Connect vendors, distributors, partners, customers, opportunities, market intelligence and commercial operations in one platform. Then give an AI workforce the context to research, prioritize and coordinate the work while people remain in control.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Create your workspace</Link>
              <a href="#platform" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Explore the platform</a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span>Business system</span>
              <span>Intelligence layer</span>
              <span>AI workforce</span>
              <span>Human control</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 lg:p-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Business objective</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">Which partners should I reactivate this week?</p>
                </div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-400">Controlled</span>
              </div>
            </div>
            <div className="my-3 flex justify-center text-xs text-slate-600">↓</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['01', 'Understand context', 'Partner activity · opportunities · history'],
                ['02', 'Coordinate specialists', 'Partner · sales · market intelligence'],
                ['03', 'Produce a recommendation', 'Priorities · evidence · next actions'],
                ['04', 'Keep people in control', 'Approval · action · audit'],
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

      <section id="platform" className="scroll-mt-20 border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">The platform</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">One operating layer for the full software distribution ecosystem.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              This is more than a CRM and more than a chatbot. The platform connects the business system, discovery, intelligence, commercial operations and an AI workforce into one operating model.
            </p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
            {platformLayers.map(([number, title, copy]) => (
              <div key={number} className="bg-slate-950 p-6">
                <span className="text-xs font-semibold text-blue-400">{number}</span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ecosystem" className="scroll-mt-20 mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">The ecosystem</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Built around how software actually reaches customers.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              The operating model connects the commercial relationships between vendors, distributors, resellers, MSPs, partners and customers.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 lg:p-8">
            <div className="grid gap-3 sm:grid-cols-5">
              {['Vendors', 'Distributors', 'Partners / Resellers', 'Customers', 'Opportunities'].map((item, index) => (
                <div key={item} className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
                  <p className="text-sm font-semibold text-slate-200">{item}</p>
                  {index < 4 && <span className="absolute -right-3 top-1/2 hidden text-slate-600 sm:block">→</span>}
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">Relationships, activity, opportunities, intelligence and operations connect these layers rather than living in isolated records.</p>
          </div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-20 border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From discovery to execution, one connected workflow.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              The platform follows the work of a real distribution organization instead of forcing every problem into a generic dashboard.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflow.map(([title, copy], index) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <span className="text-xs font-semibold text-blue-400">0{index + 1}</span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workforce" className="scroll-mt-20 mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">AI Workforce</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A coordinated team of AI specialists around the business.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              Give the workforce an objective. The operating layer can coordinate the relevant specialist roles, use business context and return recommendations for your team to review.
            </p>
            <Link href="/workforce" className="mt-7 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Explore AI Workforce</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workforce.map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="partners" className="scroll-mt-20 border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Partners</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Make the channel relationship part of the operating system.</h2>
            </div>
            <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
              {[
                ['For distributors', 'Coordinate vendors, partners, opportunities and commercial operations from one workspace.'],
                ['For channel teams', 'Understand which relationships need attention, where opportunities exist and what should happen next.'],
                ['For vendors', 'Connect products to channel context, partner capabilities and distribution opportunities.'],
                ['For ecosystem partners', 'Create a structured operating context for relationships, opportunities, activity and collaboration.'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="scroll-mt-20 mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Built for control</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">AI should increase operating capacity without taking ownership away from people.</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="scroll-mt-20 border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">About us</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Built for the people who make software distribution move.</h2>
            </div>
            <div className="space-y-5 text-base leading-7 text-slate-400">
              <p>AI Distribution Platform is being built as an operating platform for software distribution and channel businesses.</p>
              <p>The idea is simple: the business should have one connected context for its ecosystem, while AI takes on more of the research, analysis, coordination and operational work around that context.</p>
              <p>We are building toward a platform where people manage the business and an AI workforce helps operate the work — with evidence, approvals and visibility built into the process.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="start" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-12 text-center sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Start with your real business</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Build the operating layer for your distribution business.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
              Bring your real business context into one workspace. Then use the AI workforce to help your team discover, prioritize and operate the work.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Create your workspace</Link>
              <Link href="/login" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Sign in</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-900">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-xs font-black">AI</span>
                <span className="text-sm font-semibold">AI Distribution Platform</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">The AI operating platform for software distribution and channel businesses.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <a href="#platform" className="block hover:text-slate-300">Platform layers</a>
                <a href="#workflow" className="block hover:text-slate-300">How it works</a>
                <a href="#workforce" className="block hover:text-slate-300">AI Workforce</a>
                <a href="#trust" className="block hover:text-slate-300">Control & governance</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <a href="#about" className="block hover:text-slate-300">About us</a>
                <a href="#partners" className="block hover:text-slate-300">Partners</a>
                <a href="#ecosystem" className="block hover:text-slate-300">Ecosystem</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <Link href="/login" className="block hover:text-slate-300">Sign in</Link>
                <Link href="/signup" className="block hover:text-slate-300">Create workspace</Link>
                <Link href="/workforce" className="block hover:text-slate-300">AI Workforce</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-slate-900 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>AI Distribution Platform</span>
            <span>People manage the business. AI helps operate the work.</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
