type ApolloResponse = Record<string, unknown>

const APOLLO_BASE = 'https://api.apollo.io/api/v1'

function apiKey() {
  const key = process.env.APOLLO_API_KEY
  if (!key) throw new Error('APOLLO_API_KEY is not configured in this environment.')
  return key
}

async function request(path: string, init?: RequestInit): Promise<ApolloResponse> {
  const response = await fetch(APOLLO_BASE + path, {
    ...init,
    headers: {
      'x-api-key': apiKey(),
      'accept': 'application/json',
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  const raw = await response.text()
  let payload: ApolloResponse = {}
  try { payload = raw ? JSON.parse(raw) as ApolloResponse : {} } catch { payload = { raw } }
  if (!response.ok) {
    const error = payload.error && typeof payload.error === 'object' ? payload.error as Record<string, unknown> : {}
    throw new Error(String(error.message || payload.message || `Apollo request failed (${response.status}).`))
  }
  return payload
}

export async function enrichOrganizations(items: { name: string; website?: string | null; domain?: string | null }[]) {
  const details = items.slice(0, 10).map((item) => ({
    name: item.name,
    ...(item.domain ? { domain: item.domain } : {}),
    ...(item.website ? { website: item.website } : {}),
  }))
  return request('/organizations/bulk_enrich', { method: 'POST', body: JSON.stringify({ details }) })
}

export async function searchPeople(domains: string[]) {
  return request('/mixed_people/api_search', {
    method: 'POST',
    body: JSON.stringify({
      q_organization_domains_list: domains.slice(0, 1000),
      person_titles: ['Partner','Partnerships','Channel','Sales','Business Development','Managing Director','Founder','CEO','Head of IT','IT Director'],
      person_seniorities: ['owner','c_suite','vp','head','director','partner','manager'],
      include_similar_titles: true,
      per_page: 100,
      page: 1,
    }),
  })
}

export async function enrichPeople(ids: string[]) {
  return request('/people/bulk_match?reveal_personal_emails=false&reveal_phone_number=false', {
    method: 'POST',
    body: JSON.stringify({ details: ids.slice(0, 10).map((id) => ({ id })) }),
  })
}

export async function getApolloCreditUsage() {
  return request('/usage_stats/credit_usage_stats', { method: 'POST', body: JSON.stringify({}) })
}