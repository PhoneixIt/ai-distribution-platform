import type { PortAiCapability, PortAiIntegration } from './types'

export const PORTAI_INTEGRATIONS: PortAiIntegration[] = [
  { id: 'openai', name: 'OpenAI', layer: 'ai', mode: 'connect', status: 'configured', capabilities: ['reasoning', 'structured-output', 'agent-orchestration'], connectorEnv: 'CONNECTOR_OPENAI' },
  { id: 'ai-gateway', name: 'Vercel AI Gateway', layer: 'ai', mode: 'connect', status: 'available', capabilities: ['model-routing', 'provider-failover', 'cost-observability'], connectorEnv: 'CONNECTOR_AI_GATEWAY', notes: 'Optional Gateway connector; direct OpenAI remains the safe fallback.' },
  { id: 'exa', name: 'Exa', layer: 'research', mode: 'native', status: 'configured', capabilities: ['web-discovery', 'semantic-search'], env: 'EXA_API_KEY' },
  { id: 'firecrawl', name: 'Firecrawl', layer: 'research', mode: 'native', status: 'configured', capabilities: ['web-search', 'website-crawling', 'evidence-extraction'], env: 'FIRECRAWL_API_KEY' },
  { id: 'clay', name: 'Clay', layer: 'intelligence', mode: 'connect', status: 'planned', capabilities: ['company-enrichment', 'contact-enrichment', 'technographics'], connectorEnv: 'CONNECTOR_CLAY' },
  { id: 'zoominfo', name: 'ZoomInfo', layer: 'intelligence', mode: 'connect', status: 'planned', capabilities: ['company-enrichment', 'contact-enrichment'], connectorEnv: 'CONNECTOR_ZOOMINFO' },
  { id: 'g2', name: 'G2', layer: 'intelligence', mode: 'connect', status: 'planned', capabilities: ['product-intelligence', 'reviews'], connectorEnv: 'CONNECTOR_G2' },
  { id: 'similarweb', name: 'Similarweb', layer: 'intelligence', mode: 'connect', status: 'planned', capabilities: ['company-intelligence', 'web-intelligence'], connectorEnv: 'CONNECTOR_SIMILARWEB' },
  { id: 'crossbeam', name: 'Crossbeam', layer: 'intelligence', mode: 'connect', status: 'planned', capabilities: ['ecosystem-overlap', 'partner-intelligence'], connectorEnv: 'CONNECTOR_CROSSBEAM' },
  { id: 'salesforce', name: 'Salesforce', layer: 'crm', mode: 'connect', status: 'planned', capabilities: ['accounts', 'contacts', 'leads', 'opportunities', 'activities'], connectorEnv: 'CONNECTOR_SALESFORCE' },
  { id: 'hubspot', name: 'HubSpot', layer: 'crm', mode: 'connect', status: 'planned', capabilities: ['companies', 'contacts', 'deals', 'activities'], connectorEnv: 'CONNECTOR_HUBSPOT' },
  { id: 'dynamics365', name: 'Microsoft Dynamics 365', layer: 'crm', mode: 'connect', status: 'planned', capabilities: ['accounts', 'leads', 'opportunities', 'quotes'], connectorEnv: 'CONNECTOR_DYNAMICS365' },
  { id: 'microsoft-graph', name: 'Microsoft Graph', layer: 'microsoft', mode: 'connect', status: 'planned', capabilities: ['outlook', 'calendar', 'teams', 'sharepoint', 'onedrive'], connectorEnv: 'CONNECTOR_MICROSOFT' },
  { id: 'partner-center', name: 'Microsoft Partner Center', layer: 'microsoft', mode: 'connect', status: 'planned', capabilities: ['customers', 'subscriptions', 'orders', 'billing-events'], connectorEnv: 'CONNECTOR_PARTNER_CENTER' },
  { id: 'agentmail', name: 'AgentMail', layer: 'communication', mode: 'connect', status: 'planned', capabilities: ['agent-email', 'threading', 'replies'], connectorEnv: 'CONNECTOR_AGENTMAIL' },
  { id: 'gmail', name: 'Gmail', layer: 'communication', mode: 'connect', status: 'planned', capabilities: ['email-read', 'email-send'], connectorEnv: 'CONNECTOR_GMAIL' },
  { id: 'outlook', name: 'Outlook', layer: 'communication', mode: 'connect', status: 'planned', capabilities: ['email-read', 'email-send'], connectorEnv: 'CONNECTOR_OUTLOOK' },
  { id: 'slack', name: 'Slack', layer: 'communication', mode: 'connect', status: 'planned', capabilities: ['messages', 'notifications', 'events'], connectorEnv: 'CONNECTOR_SLACK' },
  { id: 'teams', name: 'Microsoft Teams', layer: 'communication', mode: 'connect', status: 'planned', capabilities: ['messages', 'notifications', 'meetings'], connectorEnv: 'CONNECTOR_TEAMS' },
  { id: 'resend', name: 'Resend', layer: 'communication', mode: 'connect', status: 'planned', capabilities: ['system-email', 'email-events'], connectorEnv: 'CONNECTOR_RESEND' },
  { id: 'google-calendar', name: 'Google Calendar', layer: 'calendar', mode: 'connect', status: 'planned', capabilities: ['events', 'availability'], connectorEnv: 'CONNECTOR_GOOGLE_CALENDAR' },
  { id: 'outlook-calendar', name: 'Outlook Calendar', layer: 'calendar', mode: 'connect', status: 'planned', capabilities: ['events', 'availability'], connectorEnv: 'CONNECTOR_OUTLOOK_CALENDAR' },
  { id: 'calendly', name: 'Calendly', layer: 'calendar', mode: 'connect', status: 'planned', capabilities: ['scheduling', 'availability', 'webhooks'], connectorEnv: 'CONNECTOR_CALENDLY' },
  { id: 'zoom', name: 'Zoom', layer: 'meetings', mode: 'connect', status: 'planned', capabilities: ['meeting-create', 'meeting-details'], connectorEnv: 'CONNECTOR_ZOOM' },
  { id: 'docusign', name: 'DocuSign', layer: 'commercial', mode: 'connect', status: 'planned', capabilities: ['contracts', 'signatures'], connectorEnv: 'CONNECTOR_DOCUSIGN', notes: 'Consequential actions are approval-gated.' },
  { id: 'stripe', name: 'Stripe', layer: 'commercial', mode: 'connect', status: 'planned', capabilities: ['subscriptions', 'billing', 'payments'], connectorEnv: 'CONNECTOR_STRIPE', notes: 'Commercial execution is approval-gated.' },
  { id: 'zapier', name: 'Zapier', layer: 'automation', mode: 'connect', status: 'planned', capabilities: ['long-tail-actions'], connectorEnv: 'CONNECTOR_ZAPIER' },
  { id: 'make', name: 'Make', layer: 'automation', mode: 'connect', status: 'planned', capabilities: ['workflow-execution'], connectorEnv: 'CONNECTOR_MAKE' },
  { id: 'n8n', name: 'n8n', layer: 'automation', mode: 'connect', status: 'planned', capabilities: ['workflow-execution'], connectorEnv: 'CONNECTOR_N8N' },
  { id: 'supabase', name: 'Supabase', layer: 'infrastructure', mode: 'native', status: 'configured', capabilities: ['auth', 'database', 'rls', 'storage'] },
  { id: 'vercel', name: 'Vercel', layer: 'infrastructure', mode: 'native', status: 'configured', capabilities: ['hosting', 'connect', 'workflows', 'queues'] },
  { id: 'sentry', name: 'Sentry', layer: 'infrastructure', mode: 'native', status: 'configured', capabilities: ['errors', 'tracing', 'observability'] },
]

export const PORTAI_CAPABILITIES: PortAiCapability[] = [
  { id: 'research.web', name: 'Web research', description: 'Discover and gather public ecosystem evidence.', layer: 'research', integrations: ['exa', 'firecrawl'], status: 'ready', mode: 'native', userScoped: false, requiresApproval: false },
  { id: 'research.company', name: 'Company research', description: 'Crawl company sites and extract evidence-backed attributes.', layer: 'research', integrations: ['firecrawl'], status: 'ready', mode: 'native', userScoped: false, requiresApproval: false },
  { id: 'intelligence.enrich', name: 'Company/contact enrichment', description: 'Enrich entities through optional customer-authorized data providers.', layer: 'intelligence', integrations: ['clay', 'zoominfo', 'similarweb', 'g2'], status: 'planned', mode: 'connect', userScoped: true, requiresApproval: false },
  { id: 'crm.sync', name: 'CRM synchronization', description: 'Read and write customer-authorized CRM records.', layer: 'crm', integrations: ['salesforce', 'hubspot', 'dynamics365'], status: 'planned', mode: 'connect', userScoped: true, requiresApproval: false },
  { id: 'communication.outbound', name: 'External communication', description: 'Prepare and, where policy allows, send authorized communications.', layer: 'communication', integrations: ['agentmail', 'gmail', 'outlook', 'slack', 'teams'], status: 'planned', mode: 'connect', userScoped: true, requiresApproval: true },
  { id: 'calendar.schedule', name: 'Meeting scheduling', description: 'Find availability and coordinate meetings.', layer: 'calendar', integrations: ['google-calendar', 'outlook-calendar', 'calendly'], status: 'planned', mode: 'connect', userScoped: true, requiresApproval: false },
  { id: 'meeting.execute', name: 'Meeting execution', description: 'Create and coordinate online meetings.', layer: 'meetings', integrations: ['zoom', 'teams'], status: 'planned', mode: 'connect', userScoped: true, requiresApproval: false },
  { id: 'commercial.prepare', name: 'Commercial preparation', description: 'Prepare quotes, contracts and billing actions without executing them.', layer: 'commercial', integrations: ['docusign', 'stripe'], status: 'planned', mode: 'connect', userScoped: true, requiresApproval: true },
  { id: 'commercial.execute', name: 'Commercial execution', description: 'Execute approved consequential commercial actions with an audit trail.', layer: 'commercial', integrations: ['docusign', 'stripe'], status: 'planned', mode: 'connect', userScoped: true, requiresApproval: true },
  { id: 'automation.execute', name: 'Long-tail automation', description: 'Delegate non-core integrations to approved automation providers.', layer: 'automation', integrations: ['zapier', 'make', 'n8n'], status: 'planned', mode: 'automation', userScoped: true, requiresApproval: true },
  { id: 'ai.route', name: 'Model routing', description: 'Route AI work through a provider abstraction and optional Vercel AI Gateway.', layer: 'ai', integrations: ['openai', 'ai-gateway'], status: 'configured', mode: 'connect', userScoped: false, requiresApproval: false },
]

export function getPortAiIntegrationStatus() {
  return PORTAI_INTEGRATIONS.map((integration) => {
    const configured = integration.env
      ? Boolean(process.env[integration.env])
      : integration.connectorEnv
        ? Boolean(process.env[integration.connectorEnv])
        : integration.status === 'configured'
    const runtimeStatus = integration.env
      ? (configured ? 'configured' : 'unavailable')
      : configured
        ? 'configured'
        : integration.status
    return { ...integration, runtimeStatus }
  })
}
