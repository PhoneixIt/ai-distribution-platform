import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { PartnerDirectory } from '@/components/partners/PartnerDirectory'

export const metadata = {
  title: 'Partners | AI Distribution Platform',
  description: 'Browse and manage channel partners in your directory',
}

export default function PartnersPage() {
  // TODO: Fetch partners from Supabase
  // const { data: partners } = await getPartners(supabase)

  return (
    <AuthenticatedLayout>
      <PartnerDirectory initialPartners={[]} />
    </AuthenticatedLayout>
  )
}
