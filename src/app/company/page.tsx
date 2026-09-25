'use client'

import AppShell, { useWorkspaceRole } from '@/components/app-shell'
import { getPartnerSubtypeLabel } from '@/lib/organization-roles'

function CompanyContent() {
  const profile = useWorkspaceRole()
  return (
    <div>
      <CompanyContent />
    </AppShell>
  )
}
