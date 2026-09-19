import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

function normalize(values: unknown): string[] {
  if (Array.isArray(values)) return values.flatMap((value) => normalize(value))
  if (typeof values === 'string') return values.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
  return []
}

function overlapScore(needles: string[], haystack: string[]) {
  if (!needles.length || !haystack.length) return 0
  const matches = needles.filter((needle) =>
    haystack.some((value) => value.includes(needle) || needle.includes(value)),
  )
  return Math.min(100, Math.round((matches.length / needles.length) * 100))
}

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user) return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })

  let opportunityId = ''
  try {
    const body = await request.json()
    opportunityId = String(body?.opportunityId || '').trim()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
  if (!opportunityId) return NextResponse.json({ error: 'Opportunity ID is required.' }, { status: 400 })

  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (membershipError || !membership?.org_id) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 })

  const orgId = membership.org_id
  const { data: opportunity, error: opportunityError } = await supabase
    .from('opportunities')
    .select('id,org_id,title,description,preferred_region,requirements,technology_categories,customer_id,customers(company_name,industry,company_size)')
    .eq('id', opportunityId)
    .eq('org_id', orgId)
    .single()
  if (opportunityError || !opportunity) return NextResponse.json({ error: opportunityError?.message || 'Opportunity not found.' }, { status: 404 })

  const customer = Array.isArray(opportunity.customers) ? opportunity.customers[0] : opportunity.customers
  const requirementTerms = normalize(opportunity.requirements)
  const technologyTerms = normalize(opportunity.technology_categories)
  const descriptionTerms = String(opportunity.description || '').toLowerCase().split(/[^a-z0-9]+/).filter((value) => value.length > 3).slice(0, 20)
  const capabilityNeeds = [...new Set([...technologyTerms, ...requirementTerms])]
  const industryNeeds = normalize(customer?.industry)
  const companySizeNeeds = normalize(customer?.company_size)
  const geographyNeed = String(opportunity.preferred_region || '').trim().toLowerCase()

  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('id,name,website,description,partner_types,country,regions,industries,company_size,employee_range,specializations,certifications,technologies,services,customer_segments,deployment_capabilities,sales_regions,is_verified,verification_status,is_active')
    .eq('is_active', true)
    .limit(500)
  if (partnersError) return NextResponse.json({ error: partnersError.message }, { status: 500 })

  const scored = (partners || []).map((partner) => {
    const capabilities = normalize([
      ...normalize(partner.specializations),
      ...normalize(partner.technologies),
      ...normalize(partner.services),
      ...normalize(partner.deployment_capabilities),
      ...normalize(partner.partner_types),
      ...normalize(partner.certifications),
    ])
    const geography = normalize([
      partner.country,
      ...normalize(partner.regions),
      ...normalize(partner.sales_regions),
    ])
    const industries = normalize(partner.industries)

    const capabilityFit = overlapScore(capabilityNeeds, capabilities)
    const geographyFit = geographyNeed ? overlapScore([geographyNeed], geography) : 50
    const industryFit = industryNeeds.length ? overlapScore(industryNeeds, industries) : 50
    const partnerSizes = normalize([partner.company_size, partner.employee_range])
    const companySizeFit = companySizeNeeds.length ? overlapScore(companySizeNeeds, partnerSizes) : 50
    const verificationFit = partner.is_verified || partner.verification_status === 'verified' ? 100 : 50
    const matchScore = Math.round(capabilityFit * 0.40 + geographyFit * 0.25 + industryFit * 0.20 + companySizeFit * 0.05 + verificationFit * 0.10)

    const strengths: string[] = []
    const risks: string[] = []
    if (capabilityFit >= 70) strengths.push('Strong technology and capability alignment')
    else if (capabilityFit > 0) strengths.push('Partial capability alignment')
    else risks.push('No direct capability overlap found')
    if (geographyFit >= 70) strengths.push('Good geographic coverage')
    else if (geographyNeed) risks.push('Geographic coverage needs verification')
    if (industryFit >= 70) strengths.push('Relevant industry experience')
    if (companySizeFit >= 70) strengths.push('Customer-size alignment')
    if (partner.is_verified) strengths.push('Verified partner profile')
    else risks.push('Partner profile is not verified')

    const missingCapabilities = capabilityNeeds.filter((need) => !capabilities.some((value) => value.includes(need) || need.includes(value)))
    const reason = strengths.length ? strengths.slice(0, 3).join('; ') : 'Limited structured data match; review the evidence before engagement.'
    const recommendedAction = matchScore >= 75 ? 'Review and contact this partner.' : matchScore >= 55 ? 'Verify capabilities before outreach.' : 'Keep as a lower-priority candidate.'

    if (descriptionTerms.some((term) => capabilities.some((value) => value.includes(term)))) strengths.push('Opportunity description contains relevant capability terms')

    return {
      partner,
      matchScore,
      capabilityFit,
      industryFit,
      geographyFit,
      companySizeFit,
      strengths,
      risks,
      missingCapabilities,
      reason,
      recommendedAction,
    }
  }).sort((a, b) => b.matchScore - a.matchScore)

  const top = scored.slice(0, 25)
  const { error: clearError } = await supabase
    .from('partner_matches')
    .delete()
    .eq('org_id', orgId)
    .eq('opportunity_id', opportunityId)
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 })

  if (top.length) {
    const rows = top.map((item, index) => ({
      org_id: orgId,
      opportunity_id: opportunityId,
      partner_id: item.partner.id,
      match_score: item.matchScore,
      capability_fit_score: item.capabilityFit,
      industry_fit_score: item.industryFit,
      geography_fit_score: item.geographyFit,
      company_size_fit_score: item.companySizeFit,
      vendor_fit_score: null,
      match_reason: item.reason,
      strengths: item.strengths,
      risks: item.risks,
      missing_capabilities: item.missingCapabilities,
      recommended_action: item.recommendedAction,
      status: 'suggested',
      rank: index + 1,
    }))
    const { error: upsertError } = await supabase
      .from('partner_matches')
      .upsert(rows, { onConflict: 'opportunity_id,partner_id' })
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    opportunityId,
    matched: top.length,
    matches: top.map((item, index) => ({
      rank: index + 1,
      partner: {
        id: item.partner.id,
        name: item.partner.name,
        website: item.partner.website,
        description: item.partner.description,
        country: item.partner.country,
        partnerTypes: item.partner.partner_types,
        verified: item.partner.is_verified,
      },
      matchScore: item.matchScore,
      capabilityFit: item.capabilityFit,
      industryFit: item.industryFit,
      geographyFit: item.geographyFit,
      strengths: item.strengths,
      risks: item.risks,
      missingCapabilities: item.missingCapabilities,
      recommendedAction: item.recommendedAction,
    })),
  })
}
