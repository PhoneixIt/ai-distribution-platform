import Link from 'next/link'
import MarketingNav from '@/components/marketing-nav'
import MarketingFooter from '@/components/marketing-footer'

const resources = [
  ['Product overview', 'Understand the platform layers, AI workforce and intended operating model.', '/platform'],
  ['How it works', 'See the Discover → Research → Verify → Match → Engage → Learn mission loop.', '/how-it-works'],
  ['AI Workforce', 'Explore the specialist workforce and the objective-driven interaction model.', '/ai-workforce'],
  ['Solutions', 'See how the platform maps to distributors, vendors, channel, sales, commercial and operations teams.', '/solutions'],
  ['Partners', 'Explore the partner intelligence and ecosystem operating model.', '/partners'],
  ['Workspace', 'See the complete product vision, with live workflows and clearly marked capabilities that are still being built.', '/app'],
]

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MarketingNav />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">
        <p className="text-sm font-medium text-blue-400">Resources</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-semibold tracking-tight sm:text-6xl">
          Everything you need to understand the platform before you enter the workspace.
        </h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-400">
          Start with the product model, then explore the AI workforce, workflows, solutions and partner operating model.
        </p>
      </section>

      <section className="border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources.map(([title, copy, href]) => (
              <Link key={href} href={href} className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-7 transition hover:-translate-y-0.5 hover:border-slate-700">
                <p className="text-xs uppercase tracking-widest text-blue-400">Guide</p>
                <h2 className="mt-4 text-lg font-semibold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{copy}</p>
                <span className="mt-6 inline-block text-sm font-medium text-slate-300 group-hover:text-white">Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 lg:p-12">
          <p className="text-xs uppercase tracking-widest text-blue-400">Product reality</p>
          <h2 className="mt-3 text-3xl font-semibold">Vision outside. Evidence inside.</h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-500">
            The public website communicates the full destination so visitors understand where the platform is going. The product experience shows the complete destination. Live capabilities are usable today; future capabilities are visible but clearly marked so visitors can understand where PortAi is going.
          </p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  )
}
