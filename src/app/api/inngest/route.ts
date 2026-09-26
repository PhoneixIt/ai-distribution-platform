import { inngest } from '@/inngest/client'
import { serve } from 'inngest/next'
import { functions } from '@/inngest/functions'

export const runtime = 'nodejs'

export const POST = serve({ client: inngest, functions })
