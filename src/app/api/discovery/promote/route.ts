import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

type Evidence = {
  title?: string
  url?: string
  sourceType?: string
  excerpt?: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'partner'
}

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user) {
    return NextResponse.json({ error: authError?.message || 'Authentication is unavailable.' }, { status: 401 })
  }

  let candidateId = ''
  try {
    const body = await request.json()
    candidateId = String(body.candidateId || '').trim()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (!candidateId) return NextResponse.json({ error: 'candidateId is required.' }, { status: 400 })

  const { data: candidate, error: candidateError } = await supabase
    .from('discovery_candidates')
    .select('*')
    .eq('id', candidateId)
    .single()

  if (candidateError || !candidate) {
    return NextResponse.json({ error: candidateError?.message || 'Candidate not found.' }, { status: 404 })
  }

  if (!candidate.website) {
    return NextResponse.json({ error: 'Candidate has no website and cannot be promoted safely.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('partners')
    .select('id,name,website')
    .eq('website', candidate.website)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ partner: existing, existing: true })
  }

  const baseSlug = slugify(candidate.company_name)
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const { data: slugMatch } = await supabase.from('partners').select('id').eq('slug', slug).maybeSingle()
    if (!slugMatch) break
    slug = `${baseSlug}-${suffix++}`
  }

  const { data: partner, error: insertError } = await supabase
    .from('partners')
    .insert({
      name: candidate.company_name,
      slug,
      website: candidate.website,
      description: candidate.description,
      partner_types: candidate.partner_types,
      country: candidate.country,
      industries: candidate.industries,
      specializations: candidate.technologies,
      technologies: candidate.technologies,
      services: candidate.services,
      customer_segments: candidate.customer_segments,
      certifications: candidate.certifications,
      is_verified: false,
      verification_status: 'pending',
      source_reference: candidate.website,
      source_type: 'ai-discovery',
      last_verified: new Date().toISOString(),
    })
    .select('id,name,website,verification_status')
    .single()

  if (insertError || !partner) {
    return NextResponse.json({ error: insertError?.message || 'Could not promote candidate.' }, { status: 500 })
  }

  const evidence = Array.isArray(candidate.evidence) ? (candidate.evidence as Evidence[]) : []
  const evidenceRows = evidence
    .filter((item) => item.url)
    .map((item) => ({
      company_type: 'partner',
      company_id: partner.id,
      claim_type: 'discovery-evidence',
      claim_value: candidate.company_name,
      source_url: item.url!,
      source_title: item.title || null,
      source_type: item.sourceType || 'search-result',
      excerpt: item.excerpt || null,
      confidence: candidate.research_confidence || 0,
      verification_status: candidate.research_status === 'researched' ? 'observed' : 'disputed',
      last_verified: new Date().toISOString(),
    }))

  if (evidenceRows.length) {
    await supabase.from('company_evidence').insert(evidenceRows)
  }

  return NextResponse.json({ partner, existing: false })
}
