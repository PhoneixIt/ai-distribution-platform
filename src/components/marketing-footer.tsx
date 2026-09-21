import Link from 'next/link'

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-xs font-black">AI</span>
              <span className="text-sm font-semibold">AI Distribution Platform</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-slate-500">An AI-native ecosystem for technology distribution — connecting supply, channel capability, customer demand and intelligent execution.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform</p>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <Link className="block hover:text-white" href="/platform">Platform</Link>
              <Link className="block hover:text-white" href="/how-it-works">How it works</Link>
              <Link className="block hover:text-white" href="/ai-workforce">AI Workforce</Link>
              <Link className="block hover:text-white" href="/solutions">Solutions</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Explore</p>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <Link className="block hover:text-white" href="/resources">Resources</Link>
              <Link className="block hover:text-white" href="/partners">Partners</Link>
              <Link className="block hover:text-white" href="/about">About</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <Link className="block hover:text-white" href="/signup">Create workspace</Link>
              <Link className="block hover:text-white" href="/app">Open workspace</Link>
              <Link className="block hover:text-white" href="/workforce">AI Workforce workspace</Link>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-slate-900 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>AI Distribution Platform</span>
          <span>People manage the business. AI helps operate the work.</span>
        </div>
      </div>
    </footer>
  )
}
