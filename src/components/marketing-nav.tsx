import Link from 'next/link'

const links = [
  ['Platform', '/platform'],
  ['AI Workforce', '/ai-workforce'],
  ['How it works', '/how-it-works'],
  ['Solutions', '/solutions'],
  ['Partners', '/partners'],
  ['Resources', '/resources'],
  ['About', '/about'],
]

export default function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-xs font-black shadow-lg shadow-blue-950/30">AI</span>
          <span className="text-sm font-semibold tracking-tight text-white">AI Distribution Platform</span>
        </Link>
        <div className="hidden items-center gap-5 xl:flex">
          {links.map(([label, href]) => <Link key={href} href={href} className="text-sm text-slate-400 transition hover:text-white">{label}</Link>)}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white">Sign in</Link>
          <Link href="/signup" className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">Get started</Link>
        </div>
      </div>
    </nav>
  )
}
