# Security Policy

## Supported versions

Security fixes are applied to the current `main` branch and the active production deployment.

## Reporting a vulnerability

Please do not open a public GitHub issue for a suspected security vulnerability.

Use GitHub Security Advisories for private disclosure when available. Include the affected route or component, reproduction steps, impact, and any relevant logs. Do not include secrets or personal data.

## Security design

The platform uses:

- Supabase Row Level Security for workspace data isolation.
- Server-side authentication checks for protected API routes.
- Explicit human approval for external actions.
- Durable, idempotent queuing for approved external actions.
- Audit records for AI runs and tool activity.
- No service-role credentials in browser code.

Please report suspected bypasses of tenant isolation, approval boundaries, authentication, authorization, or secret handling promptly.
