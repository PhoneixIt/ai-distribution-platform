export type IntegrationLayer =
  | 'ai' | 'research' | 'intelligence' | 'crm' | 'microsoft' | 'communication'
  | 'calendar' | 'meetings' | 'commercial' | 'automation' | 'infrastructure'

export type IntegrationMode = 'native' | 'connect' | 'automation' | 'planned'
export type IntegrationStatus = 'ready' | 'configured' | 'available' | 'planned'

export type PortAiCapability = {
  id: string
  name: string
  description: string
  layer: IntegrationLayer
  integrations: string[]
  status: IntegrationStatus
  mode: IntegrationMode
  userScoped: boolean
  requiresApproval: boolean
}

export type PortAiIntegration = {
  id: string
  name: string
  layer: IntegrationLayer
  mode: IntegrationMode
  status: IntegrationStatus
  capabilities: string[]
  env?: string
  connectorEnv?: string
  notes?: string
}
