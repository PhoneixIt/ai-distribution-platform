import { getToken } from '@vercel/connect'

const DEFAULT_OPENAI_CONNECTOR = 'scl_PnZFdI8k6MkbNAAkw6TQ'

export function getOpenAIConnector() {
  return process.env.CONNECTOR_OPENAI || DEFAULT_OPENAI_CONNECTOR
}

export function isAiGatewayEnabled() {
  return Boolean(process.env.CONNECTOR_AI_GATEWAY)
}

export function getOpenAIBaseUrl() {
  return isAiGatewayEnabled() ? 'https://ai-gateway.vercel.sh/v1' : 'https://api.openai.com/v1'
}

export function getOpenAIModel() {
  const configured = process.env.OPENAI_AGENT_MODEL || 'gpt-5.6-luna'
  return isAiGatewayEnabled() ? (process.env.AI_GATEWAY_MODEL || 'openai/' + configured) : configured
}

export async function getOpenAIToken() {
  const connector = isAiGatewayEnabled() ? process.env.CONNECTOR_AI_GATEWAY : getOpenAIConnector()
  if (!connector) throw new Error('AI Gateway connector is not configured.')
  return getToken(connector, {
    subject: { type: 'app' },
  })
}
