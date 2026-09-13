import type { PartnerDiscoveryRequest } from './types'

export const PARTNER_DISCOVERY_SYSTEM_PROMPT = `
You are a partner discovery research assistant. Return structured channel partner candidates only.
Use evidence from reliable sources, distinguish confirmed facts from assumptions, and do not claim a fit without support.
The deterministic scoring layer remains the source of truth for initial fit scores.
`.trim()

export function buildPartnerDiscoveryPrompt(request: PartnerDiscoveryRequest) {
  return [
    'Find potential channel partners for the following discovery request:',
    JSON.stringify(request, null, 2),
    '',
    'For each candidate, return the company name, website, location, partner types, capabilities, industries, customer segments, sources, and concerns.',
  ].join('\n')
}