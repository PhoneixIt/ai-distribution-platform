import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ecosystem = [
  ['Vendors', 'Bring products to the right markets, partners and customers.'],
  ['Distributors', 'Find supply, demand and channel opportunities across the ecosystem.'],
  ['Partners', 'Discover vendors, products, customers and revenue opportunities.'],
  ['Customers', 'Discover technology and the partners that can deliver it.'],
]

const capabilities = [
  ['Discover', 'Find companies, products, partners, customers and market opportunities across the ecosystem.'],
  ['Understand', 'Research companies, people, technologies, capabilities and commercial context.'],
  ['Verify', 'Ground recommendations in evidence and make gaps visible before action.'],
  ['Match', 'Connect the right vendors, distributors, partners, products and customers.'],
  ['Engage', 'Prepare targeted outreach, follow-ups, meetings and relationship workflows.'],
  ['Operate', 'Coordinate opportunities, commercial work, tasks, approvals and next actions.'],
]

const workforce = [
  ['Market Intelligence', 'Maps markets, companies, technologies, competitors and external signals.'],
  ['Partner Manager', 'Finds, qualifies, activates and monitors channel relationships.'],
  ['Vendor Manager', 'Researches vendors, products, fit and distribution opportunities.'],
  ['Sales', 'Turns ecosystem signals into qualified conversations, opportunities and follow-up.'],
  ['Commercial', 'Brings pricing, margin, discounts and commercial context into decisions.'],
  ['Operations', 'Keeps approved work moving and surfaces what needs attention.'],
]

const launchWedge = [
  ['01', 'Define the mission', 'Give the platform a vendor, product, market and ideal partner profile.'],
  ['02', 'Discover the ecosystem', 'AI searches broadly for companies that could fit the channel objective.'],
  ['03', 'Research & verify', 'Build evidence-backed company, capability, technology and contact dossiers.'],
  ['04', 'Score & match', 'Rank candidates against the actual channel requirements and explain the fit.'],
  ['05', 'Prepare engagement', 'Create the next-best action, messaging and context for human review.'],
  ['06', 'Learn from outcomes', 'Feed responses, decisions and results back into the ecosystem intelligence.'],
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && !user.is_anonymous) redirect('/app')

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-xs font-black shadow-lg shadow-blue-200/40">P</span>
            <span className="text-sm font-semibold tracking-tight">PortAi</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate-500 lg:flex">
            <Link href="/platform" className="transition hover:text-slate-900">Platform</Link>
            <Link href="/how-it-works" className="transition hover:text-slate-900">How it works</Link>
            <Link href="/ai-workforce" className="transition hover:text-slate-900">AI Workforce</Link>
            <Link href="/solutions" className="transition hover:text-slate-900">Solutions</Link>
            <Link href="/resources" className="transition hover:text-slate-900">Resources</Link>
            <Link href="/about" className="transition hover:text-slate-900">About</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:text-slate-900">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">Get started</Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(37,99,235,0.10),transparent_34%),radial-gradient(circle_at_15%_60%,rgba(14,165,233,0.06),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-20 lg:grid-cols-[1fr_.92fr] lg:items-center lg:px-8 lg:pb-32 lg:pt-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              AI-native technology distribution
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.035em] sm:text-6xl lg:text-7xl">
              The AI-native ecosystem for technology distribution.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-500">
              Connect vendors, distributors, partners and customers in one intelligent network. Discover opportunities, understand the ecosystem, match the right relationships and let AI progressively operate the work.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200/40 transition hover:bg-blue-500">Create your workspace</Link>
              <Link href="/platform" className="rounded-xl border border-slate-200 bg-white/40 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Explore the platform</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span>Marketplace</span>
              <span>Ecosystem intelligence</span>
              <span>AI workforce</span>
              <span>Human control</span>
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-2xl shadow-slate-200/60 backdrop-blur lg:p-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ecosystem mission</p>
                  <p className="mt-2 text-base font-medium leading-6 text-slate-900">Find 10 qualified cybersecurity MSPs in Germany for a new vendor.</p>
                </div>
                <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">AI + human</span>
              </div>
              <div className="mt-6 space-y-2">
                {[
                  ['01', 'Discover', 'Companies and channel signals'],
                  ['02', 'Research', 'Capabilities, technologies and markets'],
                  ['03', 'Verify', 'Evidence, sources and information gaps'],
                  ['04', 'Match', 'Channel fit and priority'],
                  ['05', 'Engage', 'Next action prepared for approval'],
                ].map(([n, title, copy]) => (
                  <div key={n} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
                    <span className="text-[10px] font-bold text-blue-700">{n}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{title}</p>
                      <p className="text-xs text-slate-500">{copy}</p>
                    </div>
                    <span className="ml-auto text-xs text-slate-500">→</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Network</p><p className="mt-1 text-sm font-semibold">Connected</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Evidence</p><p className="mt-1 text-sm font-semibold">Visible</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Actions</p><p className="mt-1 text-sm font-semibold">Controlled</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/70">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-4 md:grid-cols-4">
            {ecosystem.map(([title, copy], index) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white/40 p-5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-700">0{index + 1}</span>
                <h2 className="mt-4 font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">One ecosystem. One context.</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">The marketplace is the product. AI is the engine.</h2>
          <p className="mt-5 text-base leading-7 text-slate-500">
            Instead of another isolated PRM or another AI assistant, the platform is being built as a connected technology ecosystem. The network brings together supply, channel capability, customer demand and opportunities; the intelligence layer makes that network useful; the AI workforce helps operate it.
          </p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {[
            ['Marketplace', 'A place where vendors, distributors, partners and customers can discover relevant technology, relationships and opportunities.'],
            ['Ecosystem intelligence', 'A living context of companies, people, products, technologies, capabilities, relationships, markets and demand signals.'],
            ['AI workforce', 'Specialized AI capabilities coordinated around missions — from discovery and qualification to engagement, sales support and operations.'],
          ].map(([title, copy], index) => (
            <div key={title} className="rounded-3xl border border-slate-200 bg-white/40 p-7">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-blue-700">0{index + 1}</span>
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">What the platform does</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">From finding the right company to moving the relationship forward.</h2>
              <p className="mt-5 text-base leading-7 text-slate-500">The operating cycle is designed to grow from intelligence into action without losing evidence, permissions or business context.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {capabilities.map(([title, copy], index) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white/40 p-5">
                  <span className="text-[11px] font-semibold text-blue-700">{String(index + 1).padStart(2, '0')}</span>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">AI workforce</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A coordinated workforce built around the ecosystem.</h2>
            <p className="mt-5 text-base leading-7 text-slate-500">People set the objectives, boundaries and commitments. AI handles more of the research, coordination and operational work as capabilities mature.</p>
            <Link href="/ai-workforce" className="mt-7 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500">Explore AI Workforce</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workforce.map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white/40 p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Where we start</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Start with partner discovery. Build toward the full ecosystem.</h2>
            <p className="mt-5 text-base leading-7 text-slate-500">The first product wedge proves the core loop: discover the right organizations, research them, verify the evidence, qualify the fit and prepare the engagement.</p>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {launchWedge.map(([n, title, copy]) => (
              <div key={n} className="rounded-2xl border border-slate-200 bg-white/40 p-6">
                <span className="text-xs font-bold text-blue-700">{n}</span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">The network effect</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">More participants make the ecosystem more useful.</h2>
            <p className="mt-5 text-base leading-7 text-slate-500">As the network grows, the platform can connect more supply, channel capability and customer demand — creating better matches and more opportunities, which in turn create more useful ecosystem intelligence.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/50 p-6 lg:p-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['Vendors', 'Partners', 'Customers', 'Opportunities'].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                  <p className="text-sm font-semibold">{item}</p>
                </div>
              ))}
            </div>
            <div className="my-5 flex items-center justify-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-800" />
              <span>connected intelligence</span>
              <span className="h-px flex-1 bg-slate-800" />
            </div>
            <div className="rounded-2xl border border-blue-200/50 bg-blue-50 p-5 text-center">
              <p className="text-sm font-semibold text-blue-800">Better matching → more relationships → better intelligence</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/70">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-3">
            {[
              ['People stay in control', 'Important decisions, commercial commitments and external actions can remain behind explicit permissions and human approval.'],
              ['Evidence stays visible', 'Facts, evidence, assumptions, recommendations and actions should remain distinguishable.'],
              ['The system grows progressively', 'The public vision is the destination; product capabilities expand in deliberate, verifiable stages.'],
            ].map(([title, copy]) => (
              <div key={title}>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-14 text-center sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Build the network</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Bring your distribution ecosystem into one intelligent workspace.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500">Start with the business context you have today. Build toward an ecosystem where technology, relationships and opportunities can move through one connected network.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500">Create your workspace</Link>
            <Link href="/how-it-works" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300">See how it works</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-xs font-black">P</span>
                <span className="text-sm font-semibold">PortAi</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">An AI-native ecosystem for technology distribution.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform</p>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <Link href="/platform" className="block transition hover:text-slate-700">Platform</Link>
                <Link href="/how-it-works" className="block transition hover:text-slate-700">How it works</Link>
                <Link href="/ai-workforce" className="block transition hover:text-slate-700">AI Workforce</Link>
                <Link href="/solutions" className="block transition hover:text-slate-700">Solutions</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Explore</p>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <Link href="/resources" className="block transition hover:text-slate-700">Resources</Link>
                <Link href="/partners" className="block transition hover:text-slate-700">Partners</Link>
                <Link href="/about" className="block transition hover:text-slate-700">About</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <Link href="/login" className="block transition hover:text-slate-700">Sign in</Link>
                <Link href="/signup" className="block transition hover:text-slate-700">Create workspace</Link>
                <Link href="/workforce" className="block transition hover:text-slate-700">Open AI Workforce</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>PortAi</span>
            <span>People manage the business. AI helps operate the work.</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
