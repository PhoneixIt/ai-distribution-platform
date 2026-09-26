import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { calculateOpportunityPartnerMatch } from '@/lib/matching/opportunity-partner'

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

  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('id,name,website,description,partner_types,country,regions,industries,company_size,employee_range,specializations,certifications,technologies,services,customer_segments,deployment_capabilities,sales_regions,is_verified,verification_status,is_active')
    .eq('is_active', true)
    .limit(500)
  if (partnersError) return NextResponse.json({ error: partnersError.message }, { status: 500 })

  const scored = (partners || [])
    .map((partner) => calculateOpportunityPartnerMatch(
      {
        requirements: opportunity.requirements,
        technologyCategories: opportunity.technology_categories,
        description: opportunity.description,
        preferredRegion: opportunity.preferred_region,
        customerIndustry: customer?.industry,
        customerCompanySize: customer?.company_size,
      },
      {
        id: partner.id,
        name: partner.name,
        website: partner.website,
        description: partner.description,
        partnerTypes: partner.partner_types,
        country: partner.country,
        regions: partner.regions,
        industries: partner.industries,
        companySize: partner.company_size,
        employeeRange: partner.employee_range,
        specializations: partner.specializations,
        certifications: partner.certifications,
        technologies: partner.technologies,
        services: partner.services,
        customerSegments: partner.customer_segments,
        deploymentCapabilities: partner.deployment_capabilities,
        salesRegions: partner.sales_regions,
        isVerified: partner.is_verified,
        verificationStatus: partner.verification_status,
      },
    ))
    .sort((left, right) =>
      right.matchScore - left.matchScore ||
      right.verificationFit - left.verificationFit ||
      right.capabilityFit - left.capabilityFit ||
      left.partner.name.localeCompare(right.partner.name),
    )
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
      companySizeFit: item.companySizeFit,
      verificationFit: item.verificationFit,
      strengths: item.strengths,
      risks: item.risks,
      missingCapabilities: item.missingCapabilities,
      recommendedAction: item.recommendedAction,
    })),
  })
}
