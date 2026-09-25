import { NextResponse } from 'next/server'
import { getPortAiIntegrationStatus, PORTAI_CAPABILITIES } from '@/lib/integrations/registry'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    product: 'PortAi',
    version: 1,
    capabilities: PORTAI_CAPABILITIES,
    integrations: getPortAiIntegrationStatus(),
    policy: {
      consequentialActionsRequireApproval: true,
      credentialsAreServerSideOnly: true,
      providerSpecificSecretsAreNeverReturned: true,
    },
  })
}
