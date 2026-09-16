import { createClient } from '@/lib/supabase/client'
import { getOpportunityById, updateOpportunity, deleteOpportunity } from '@/lib/supabase/services'
import type { NextRequest } from 'next/server'

/**
 * GET /api/opportunities/[id]
 * Fetch a single opportunity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const opportunity = await getOpportunityById(supabase, params.id)

    return Response.json({
      success: true,
      data: opportunity,
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
 * PATCH /api/opportunities/[id]
 * Update an opportunity
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const opportunity = await updateOpportunity(supabase, params.id, body)

    return Response.json({
      success: true,
      data: opportunity,
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
 * DELETE /api/opportunities/[id]
 * Delete an opportunity
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    await deleteOpportunity(supabase, params.id)

    return Response.json({
      success: true,
      message: 'Opportunity deleted successfully',
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
