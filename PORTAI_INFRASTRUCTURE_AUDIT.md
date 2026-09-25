# PortAi Infrastructure Audit — 2026-09-25

## Scope

This audit covers the Git repository, Next.js routing, Vercel deployment/runtime signals, Supabase schema/RLS, mission execution path, AI workforce integration layer, and the product architecture required by the PortAi vision.

## Findings

### P0 — fixed: duplicate Next.js app roots
The repository contained both a root `app/` tree and the canonical `src/app/` tree. This created an unnecessary competing route root and made the codebase ambiguous to engineers and agents.

The root duplicate contained an older dashboard implementation. It has been removed. `src/app` is now the single application route tree.

### P0 — fixed: mission creation was blocked by RLS helper resolution
Vercel runtime traffic showed `POST /api/missions` returning 500. Supabase PostgreSQL logs identified the exact cause:

`permission denied for function is_org_member`

The legacy public SECURITY DEFINER helper had execution revoked, while several newer RLS policies still referenced the unqualified/public helper.

All affected policies were rewritten to use `private.is_org_member`, `private.is_org_admin`, and `private.is_org_owner`. Verification query now reports zero affected policies.

The correction is recorded in:
`supabase/migrations/20260925093000_fix_rls_helper_policy_resolution.sql`

### P1 — fixed: dark/legacy mission UI
The mission creation page contained a dark-gradient workspace UI inconsistent with the current PortAi light product system. It has been converted to the unified white/light workspace treatment.

### P1 — fixed: Sentry Next.js integration warnings
The build was successful but emitted Sentry deprecation/action-required warnings. The integration now uses the current `@sentry/nextjs/config` import and exports `onRouterTransitionStart`.

### P1 — addressed: integrations were previously architecture-only
PortAi now has a capability/integration registry and server-side Vercel Connect token abstraction. Missions and the AI Workforce can evolve toward capability-based execution rather than provider-specific application code.

## Current architecture

```
PortAi UI
  -> Workspace / Role
  -> Missions + AI Workforce
  -> Capability Registry
  -> Provider Adapter
  -> Native API | Vercel Connect | Automation
```

Cross-cutting controls:
- tenant authorization / RLS
- server-side credentials
- evidence/provenance
- policy checks
- approval gates
- auditability
- optional enrichment providers

## Current low-cost runtime

The core path remains functional without requiring premium enrichment:
- Supabase
- Vercel
- Exa
- Firecrawl
- existing OpenAI Connect path
- Sentry

Premium systems such as Clay, ZoomInfo, Salesforce, HubSpot, Dynamics, Slack, Teams, DocuSign and Stripe remain optional adapters until authorized/configured.

## Known non-P0 advisor findings

Supabase security advisors still report anonymous-access warnings on several legacy/business tables because Supabase treats anonymous users as part of the `authenticated` Postgres role when anonymous sign-in is enabled. The project already has restrictive deny-anonymous policies on a broad business-data set. These warnings need a separate table-by-table policy review; they should not be "fixed" by blindly changing all public intake flows.

## Verification status

- Repository route root: consolidated to `src/app`.
- Latest Vercel deployment inspected: build completed successfully.
- Current Vercel runtime inspection identified the mission 500 root cause.
- Supabase RLS helper audit after correction: 0 policies with unqualified helper references.
- Supabase project status: ACTIVE_HEALTHY.
- Production data was not deleted or reset.
- No premium external integration was made mandatory.

## Definition of done for this cleanup

A change is not considered complete merely because `next build` succeeds. It must also:
1. build successfully;
2. expose the intended route;
3. return successful API responses for the supported authenticated path;
4. enforce tenant/RLS boundaries;
5. degrade cleanly when optional integrations are not configured;
6. avoid legacy/duplicate route implementations;
7. preserve the PortAi product vision and role model.
