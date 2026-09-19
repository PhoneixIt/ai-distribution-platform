# Release Readiness

## Release objective

AI Distribution Platform is a production SaaS foundation for software-distribution operations where humans define objectives, permissions and approvals while AI coordinates authorized work.

## Verified

- [x] GitHub PR #9 merged to `main`.
- [x] CI passes on the release branch: dependency audit, lint, TypeScript, production build, server startup and smoke tests.
- [x] Vercel preview build passes on the validated branch.
- [x] Smoke suite verifies public health, protected API methods and core application routes.
- [x] Google OAuth flow was previously verified end-to-end in a protected Preview deployment.
- [x] Anonymous database table privileges are revoked.
- [x] Anonymous access to business data is denied by RLS.
- [x] Public security-definer helper execution is revoked.
- [x] RLS policy calls use init-plan friendly `(select auth.uid())` / `(select auth.jwt())` forms where hardened.
- [x] AI approval decisions are atomic and idempotently queued.
- [x] Approved external actions cannot be executed merely by changing approval state.
- [x] Agent action queue writes are locked behind the guarded approval transaction.
- [x] Agent tool calls and operating runs have audit coverage.
- [x] AI memory is workspace-scoped and rejects secret-like content.
- [x] Application security headers are configured.
- [x] No service-role credential references, `eval`, `new Function`, or `dangerouslySetInnerHTML` were found in repository search.
- [x] Supabase Security Advisor no longer reports the previous table-grant, helper-function, RLS-init-plan or duplicate-index findings.

## Explicit production dependencies

These are configuration/integration dependencies, not hidden product functionality:

1. Supabase Auth still has anonymous sign-ins enabled. The application and database explicitly reject anonymous access, but the project-level Auth setting should be disabled when anonymous sign-in is not a product requirement.
2. Supabase Auth leaked-password protection is still disabled and should be enabled when the project plan supports it.
3. The deployed AI runtime uses the Vercel Connect OpenAI connector for runtime credentials. The connector must be linked to the project/environment and have a valid OpenAI credential; `OPENAI_AGENT_MODEL` is optional and defaults to `gpt-5.6-luna`.
4. External action execution is not yet connected to an email/calendar/CRM provider. Approved actions are durably queued with provider `unconfigured`; they are not silently sent or executed.
5. The repository does not contain the full historical 2026-07/2026-08 Quentra-era migration chain that existed in the current live Supabase project. The live environment is healthy, but a brand-new Supabase environment cannot currently be reproduced from repository migrations alone.
6. Supabase performance advisor still reports informational unindexed-foreign-key and unused-index findings. These are optimization items and should be revisited after the database has real workload rather than removed blindly from an empty workspace.

## Current operating posture

- Real network data is empty by design; no fake vendor, partner, product or customer records are seeded.
- Human approval remains mandatory for external commercial/communication actions.
- The product is suitable for controlled pilot usage after the explicit project-level/Auth/integration dependencies above are configured.
