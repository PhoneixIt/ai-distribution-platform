import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { ButtonPrimary, Card } from '@/components/ui'

export const metadata = {
  title: 'Create Opportunity | AI Distribution Platform',
  description: 'Define a new sales opportunity for partner matching',
}

export default function CreateOpportunityPage() {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Create Opportunity</h1>
          <p className="mt-1 text-slate-400">
            Define a new sales opportunity. AI will find the best channel partners to match.
          </p>
        </div>

        {/* Form */}
        <Card className="max-w-2xl">
          <form className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Opportunity Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Enterprise Cybersecurity Implementation"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                placeholder="Describe the opportunity, customer needs, and requirements..."
                rows={4}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Country *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Germany"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Technology Focus */}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Technology Focus *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Cybersecurity"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Industry
              </label>
              <input
                type="text"
                placeholder="e.g., Enterprise, Financial Services"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Customer Segment */}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Customer Segment
              </label>
              <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none">
                <option value="">Select a segment...</option>
                <option value="SMB">Small/Medium Business</option>
                <option value="Mid-market">Mid-market</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            {/* Opportunity Value */}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Estimated Opportunity Value
              </label>
              <input
                type="number"
                placeholder="e.g., 250000"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <ButtonPrimary type="submit">Create Opportunity</ButtonPrimary>
              <ButtonPrimary
                href="/opportunities"
                className="bg-slate-700 hover:bg-slate-600"
              >
                Cancel
              </ButtonPrimary>
            </div>
          </form>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
