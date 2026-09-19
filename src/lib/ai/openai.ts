import { getToken } from '@vercel/connect'

const DEFAULT_OPENAI_CONNECTOR = 'scl_PnZFdI8k6MkbNAAkw6TQ'

export function getOpenAIConnector() {
  return process.env.CONNECTOR_OPENAI || DEFAULT_OPENAI_CONNECTOR
}

export async function getOpenAIToken() {
  return getToken(getOpenAIConnector(), {
    subject: { type: 'app' },
  })
}
