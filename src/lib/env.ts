const REQUIRED_PUBLIC_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
] as const

export function validateEnvironment(): void {
  const missing = REQUIRED_PUBLIC_ENV_VARS.filter((name) => !process.env[name])
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
