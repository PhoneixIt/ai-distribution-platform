import type { IntegrationLayer, PortAiCapability, PortAiIntegration } from './types'

export type IntegrationAction =
  | 'read'
  | 'search'
  | 'create'
  | 'update'
  | 'send'
  | 'schedule'
  | 'execute'

export type IntegrationContext = {
  orgId: string
  userId: string
  capability: PortAiCapability
  integration: PortAiIntegration
}

export type ProviderAdapter = {
  integrationId: string
  supports: IntegrationAction[]
  isAvailable: () => boolean
  execute: (action: IntegrationAction, input: Record<string, unknown>, context: IntegrationContext) => Promise<unknown>
}

/**
 * Provider adapters are intentionally capability-oriented.
 *
 * Missions, dashboards and the AI workforce must depend on a capability
 * (for example crm.sync or communication.outbound), not on Salesforce,
 * HubSpot, Slack, etc. This keeps provider replacement and multi-provider
 * fallback possible without changing product workflows.
 */
export type CapabilityResolution = {
  capabilityId: string
  layer: IntegrationLayer
  providerIds: string[]
  readyProviderIds: string[]
  requiresApproval: boolean
}

export function resolveCapability(
  capability: PortAiCapability,
  integrations: PortAiIntegration[],
  adapters: ProviderAdapter[] = [],
): CapabilityResolution {
  const providerIds = capability.integrations
  const readyProviderIds = providerIds.filter((id) => {
    const integration = integrations.find((item) => item.id === id)
    if (!integration) return false
    const adapter = adapters.find((item) => item.integrationId === id)
    if (adapter) return adapter.isAvailable()
    return integration.status === 'configured' || integration.status === 'ready'
  })

  return {
    capabilityId: capability.id,
    layer: capability.layer,
    providerIds,
    readyProviderIds,
    requiresApproval: capability.requiresApproval,
  }
}

export function assertActionAllowed(
  capability: PortAiCapability,
  action: IntegrationAction,
  approved: boolean,
) {
  const externalAction = ['send', 'create', 'update', 'schedule', 'execute'].includes(action)

  if (externalAction && capability.requiresApproval && !approved) {
    throw new Error('This action requires explicit approval before external execution.')
  }
}
