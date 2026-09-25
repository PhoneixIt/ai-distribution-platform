import { getToken } from '@vercel/connect'

export type ConnectorSubject = { type: 'app' } | { type: 'user'; id: string }

export async function getPortAiConnectorToken(
  connectorEnv: string,
  subject: ConnectorSubject = { type: 'app' },
) {
  const connector = process.env[connectorEnv]
  if (!connector) throw new Error(connectorEnv + ' is not configured.')
  return getToken(connector, { subject })
}
