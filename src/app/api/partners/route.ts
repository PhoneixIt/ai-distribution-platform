import { createClient } from '@/lib/supabase/client'
import { getPartners, createPartner } from '@/lib/supabase/services'
import type { NextRequest } from 'next/server'

/**
 * GET /api/partners
 * Fetch all partners with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || undefined
    const partnerType = searchParams.get('type') || undefined
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '100', 10)
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 100

    const partners = await getPartners(supabase, {
      country,
      partnerType,
      limit,
    })

    return Response.json({
      success: true,
      data: partners,
      count: partners.length,
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
 * POST /api/partners
 * Create a new partner
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    if (!body.name) {
      return Response.json(
        { success: false, error: 'Partner name is required' },
        { status: 400 }
      )
    }

    if (!body.country) {
      return Response.json(
        { success: false, error: 'Country is required' },
        { status: 400 }
      )
    }

    const partner = await createPartner(supabase, {
      name: body.name,
      website: body.website,
      country: body.country,
      description: body.description,
      partner_types: body.partner_types,
      technologies: body.technologies,
      industries: body.industries,
      customer_segments: body.customer_segments,
      services: body.services,
      certifications: body.certifications,
      company_size: body.company_size,
    })

    return Response.json(
      {
        success: true,
        data: partner,
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
