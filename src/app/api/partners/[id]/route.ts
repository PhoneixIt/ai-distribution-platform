import { createClient } from '@/lib/supabase/client'
import { getPartnerById, updatePartner, deletePartner } from '@/lib/supabase/services'
import type { NextRequest } from 'next/server'

/**
 * GET /api/partners/[id]
 * Fetch a single partner by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const partner = await getPartnerById(supabase, params.id)

    return Response.json({
      success: true,
      data: partner,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: error instanceof Error && message.includes('not found') ? 404 : 500 }
    )
  }
}

/**
 * PATCH /api/partners/[id]
 * Update a partner
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const partner = await updatePartner(supabase, params.id, body)

    return Response.json({
      success: true,
      data: partner,
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
 * DELETE /api/partners/[id]
 * Delete a partner
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    await deletePartner(supabase, params.id)

    return Response.json({
      success: true,
      message: 'Partner deleted successfully',
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
