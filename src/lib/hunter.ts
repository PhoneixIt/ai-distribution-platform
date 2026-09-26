type HunterEmail = Record<string, unknown>
type HunterResponse = { data?: { emails?: HunterEmail[]; organization?: Record<string, unknown>; company?: Record<string, unknown> }; meta?: Record<string, unknown> }

const HUNTER_BASE = 'https://api.hunter.io/v2'

function apiKey() {
  const key = process.env.HUNTER_API_KEY
  if (!key) throw new Error('HUNTER_API_KEY is not configured in this environment.')
  return key
}

async function request(path: string): Promise<HunterResponse> {
  const response = await fetch(HUNTER_BASE + path + (path.includes('?') ? '&' : '?') + 'api_key=' + encodeURIComponent(apiKey()), {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  })
  const raw = await response.text()
  let payload: HunterResponse = {}
  try { payload = raw ? JSON.parse(raw) as HunterResponse : {} } catch { payload = { meta: { raw } } }
  if (!response.ok) {
    const errors = Array.isArray((payload as Record<string, unknown>).errors)
      ? (payload as Record<string, unknown>).errors as Record<string, unknown>[]
      : []
    const detail = errors.length ? String(errors[0].details || errors[0].code || '') : ''
    throw new Error(detail || `Hunter request failed (${response.status}).`)
  }
  return payload
}

function scoreContact(email: HunterEmail) {
  const position = String(email.position || '').toLowerCase()
  const seniority = String(email.seniority || '').toLowerCase()
  const department = String(email.department || '').toLowerCase()
  let score = Number(email.confidence_score || 0)
  if (/(partner|partnership|channel|business development|sales director|sales manager|managing director|founder|ceo|chief executive|owner|head of sales|head of partnerships)/.test(position)) score += 100
  if (/(c_suite|executive|owner|director|head|manager)/.test(seniority)) score += 40
  if (/(sales|business development|executive|management)/.test(department)) score += 20
  if (String(email.verification?.status || email.verification_status || '').toLowerCase() === 'valid') score += 50
  return score
}

export async function searchContacts(domains: string[]) {
  const uniqueDomains = [...new Set(domains)]
  const results: { domain: string; emails: HunterEmail[]; credits: number }[] = []
  let credits = 0

  for (let index = 0; index < uniqueDomains.length; index += 5) {
    const batch = uniqueDomains.slice(index, index + 5)
    const batchResults = await Promise.all(batch.map(async (domain) => {
      const payload = await request('/domain-search?domain=' + encodeURIComponent(domain) + '&limit=10')
      const emails = Array.isArray(payload.data?.emails) ? payload.data!.emails as HunterEmail[] : []
      return {
        domain,
        emails,
        credits: Number(payload.meta?.credits_used || payload.meta?.credits_consumed || (emails.length ? 1 : 0)),
      }
    }))
    results.push(...batchResults)
    credits += batchResults.reduce((sum, item) => sum + (Number.isFinite(item.credits) ? item.credits : 0), 0)
  }

  return { results, credits }
}

export function pickBestContact(emails: HunterEmail[]) {
  return [...emails].sort((a, b) => scoreContact(b) - scoreContact(a))[0] || null
}
