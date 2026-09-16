import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'

export const metadata = {
  title: 'Dashboard | AI Distribution Platform',
  description: 'Vendor dashboard for managing partners, distributors, and opportunities',
}

export default function DashboardPage() {
  return (
    <AuthenticatedLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Welcome to AI Distribution Platform</h1>
          <p className="mt-2 text-lg text-slate-400">
            Discover partners, match opportunities, and build channel relationships.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Partners" value="0" />
          <StatCard label="Distributors" value="0" />
          <StatCard label="Opportunities" value="0" />
          <StatCard label="Matches" value="0" />
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            title="Discover Partners"
            description="Find qualified channel partners by technology, geography, and capability."
            href="/discovery"
            icon="🔍"
          />
          <ActionCard
            title="Browse Partners"
            description="View all partners in your directory with detailed profiles."
            href="/partners"
            icon="👥"
          />
          <ActionCard
            title="Create Opportunity"
            description="Define a new sales opportunity for AI-powered partner matching."
            href="/opportunities/new"
            icon="🎯"
          />
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  )
}

function ActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string
  description: string
  href: string
  icon: string
}) {
  return (
    <a
      href={href}
      className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-blue-600 hover:bg-slate-900"
    >
      <span className="text-3xl">{icon}</span>
      <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-slate-400">{description}</p>
      <span className="mt-4 inline-block text-sm font-medium text-blue-400">
        Get started →
      </span>
    </a>
  )
}
