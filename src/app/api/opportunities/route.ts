import { createClient } from '@/lib/supabase/client'
import { getOpportunities, createOpportunity } from '@/lib/supabase/services'
import type { NextRequest } from 'next/server'

/**
 * GET /api/opportunities
 * Fetch all opportunities for the authenticated vendor
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // TODO: Get vendor ID from authenticated user
    const vendorId = 'temp-vendor-id'

    // Get optional filters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '100')

    const opportunities = await getOpportunities(supabase, vendorId, {
      status,
      limit,
    })

    return Response.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/opportunities
 * Create a new opportunity
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    // TODO: Get vendor ID from authenticated user
    const vendorId = 'temp-vendor-id'

    // Validate required fields
    if (!body.title) {
      return Response.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!body.country) {
      return Response.json(
        { success: false, error: 'Country is required' },
        { status: 400 }
      )
    }

    const opportunity = await createOpportunity(supabase, {
      vendor_id: vendorId,
      title: body.title,
      description: body.description,
      country: body.country,
      region: body.region,
      industry: body.industry,
      customer_segment: body.customer_segment,
      opportunity_value: body.opportunity_value,
      currency: body.currency || 'USD',
      technologies: body.technologies,
      required_capabilities: body.required_capabilities,
      required_certifications: body.required_certifications,
      status: body.status || 'open',
      stage: body.stage || 'lead',
    })

    return Response.json(
      {
        success: true,
        data: opportunity,
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
