import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { Card, ButtonPrimary, EmptyState } from '@/components/ui'

export const metadata = {
  title: 'Opportunities | AI Distribution Platform',
  description: 'Manage sales opportunities for partner matching',
}

export default function OpportunitiesPage() {
  // TODO: Fetch opportunities from Supabase
  // const { data: opportunities } = await getOpportunities(supabase, vendorId)

  const opportunities = []

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Opportunities</h1>
            <p className="mt-1 text-slate-400">
              Define sales opportunities for AI-powered partner matching.
            </p>
          </div>
          <ButtonPrimary href="/opportunities/new">Create Opportunity</ButtonPrimary>
        </div>

        {/* Opportunities List */}
        {opportunities.length === 0 ? (
          <EmptyState
            title="No opportunities yet"
            description="Create your first opportunity to start matching with partners."
            action={
              <ButtonPrimary href="/opportunities/new">
                Create First Opportunity
              </ButtonPrimary>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {opportunities.map((opp: any) => (
              <Card key={opp.id}>
                <h3 className="text-lg font-semibold">{opp.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{opp.description}</p>
                <div className="mt-4 flex gap-2">
                  <ButtonPrimary href={`/opportunities/${opp.id}`}>
                    View
                  </ButtonPrimary>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
