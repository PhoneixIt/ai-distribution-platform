<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PORTAI — PROJECT INSTRUCTIONS

## 1. Product

We are building an AI-native technology distribution ecosystem.

The platform connects:

**Vendors → Distributors → Channel Partners → Customers → Opportunities → AI Matching → Deals/Revenue**

The core problem is helping technology vendors discover the right distributors, resellers, MSPs, SIs and other channel partners for specific markets and opportunities.

The long-term product should allow:

* Vendors to discover qualified channel partners.
* Vendors to discover distributors.
* Distributors to discover relevant vendors.
* Partners to discover relevant vendors and opportunities.
* Users to create channel opportunities.
* The platform to match opportunities with the best partners.
* AI to explain why a partner is a good match and recommend the next action.

The product should eventually become a network rather than simply a CRM.

---

## 2. Current MVP

Keep the MVP focused.

The first major product areas are:

1. Vendor Dashboard
2. Partner Directory
3. Distributor Directory
4. Opportunity Creation
5. Opportunity Details
6. AI Partner Matching
7. Match Results

Do not build advanced CRM functionality, billing, messaging, customer portals, complex analytics, or enterprise administration unless explicitly requested.

---

## 3. Core Matching Concept

The most important product capability is opportunity-to-partner matching.

Example:

A vendor creates:

* Country: Germany
* Industry: Enterprise
* Technology: Cybersecurity
* Customer type: Enterprise
* Opportunity value: €250,000

The platform should eventually analyze available partner data and return results such as:

**Partner A — 94% Match**

Reasons:

* Strong Germany coverage
* Cybersecurity specialization
* Enterprise customer base
* Relevant technology capabilities
* Relevant certifications
* Similar previous opportunities

Recommended action:

**Contact Partner A and associated distributor.**

Matching should initially use deterministic rules and database attributes.

Do not introduce an expensive LLM call for basic matching when normal database logic can solve the problem.

Use AI/LLMs later primarily for:

* explaining matches
* summarizing opportunities
* recommending actions
* natural-language discovery
* intelligent enrichment

---

## 4. Existing Technology Stack

The current stack is:

* Next.js 16
* React
* TypeScript
* App Router
* Tailwind CSS
* Supabase
* PostgreSQL
* Supabase Auth when authentication is implemented
* Supabase Row Level Security
* GitHub
* GitHub Codespaces

Use the existing architecture.

Do not replace the framework or backend without explicit approval.

---

## 5. Existing Supabase Tables

The following channel tables already exist and must be treated as part of the product architecture:

* `partners`
* `distributors`
* `vendor_partners`
* `vendor_distributors`
* `partner_capabilities`
* `opportunities`
* `opportunity_partners`
* `partner_matches`

These tables already have Row Level Security enabled.

Do not delete, rename, drop, or substantially restructure these tables unless explicitly instructed.

Before proposing database changes, inspect the existing schema and understand the current structure.

Prefer using the existing schema before creating new tables.

---

## 6. Supabase Rules

Use the existing Supabase client.

The browser uses the public environment variables:

* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never expose a Supabase secret/service-role key in frontend code.

Never hardcode credentials.

Do not create fake data in production code simply to make the UI look populated.

If test/demo data is needed, clearly separate it from production data.

Respect Row Level Security.

Do not bypass RLS from client-side code.

---

## 7. Existing Supabase Client

The existing browser client is located at:

`src/lib/supabase/client.ts`

Reuse it.

Do not create duplicate Supabase clients unless there is a clear architectural reason.

---

## 8. Coding Principles

Write production-quality TypeScript.

Prefer:

* small reusable components
* clear naming
* simple architecture
* strong typing
* server-side data access where appropriate
* reusable UI components
* accessible HTML
* responsive layouts
* clear loading states
* clear empty states
* clear error states

Avoid:

* unnecessary abstractions
* unnecessary dependencies
* duplicated logic
* giant components
* hardcoded business logic scattered throughout the UI
* fake functionality
* placeholder buttons that imply functionality that does not exist
* excessive animations
* unnecessary complexity

Do not introduce a library when the existing stack can solve the problem cleanly.

---

## 9. UI / Product Design

The product should feel like a serious modern B2B SaaS platform.

Design goals:

* clean
* professional
* modern
* fast
* easy to understand
* information-dense without being cluttered

Use the existing Tailwind setup.

Prefer consistent:

* spacing
* typography
* cards
* buttons
* forms
* tables
* filters
* badges
* empty states
* navigation

The current visual direction is dark SaaS UI with blue accents, but components should remain reusable so the design can evolve.

Do not redesign the entire application when implementing a single feature.

---

## 10. Navigation

As the application grows, use clear product navigation.

The primary areas should eventually include:

* Dashboard
* Partners
* Distributors
* Opportunities
* Matches

Do not create navigation for features that do not exist yet unless explicitly requested.

---

## 11. Partner Directory

The Partner Directory is a core MVP feature.

It should eventually allow users to:

* view partners
* search partners
* filter partners
* view partner details
* see geography
* see capabilities
* see technologies
* see certifications
* see industries
* see customer segments
* see relevant channel information

The data should come from Supabase.

Do not create a fake static partner directory when the database can be queried.

---

## 12. Distributor Directory

The Distributor Directory is another core MVP feature.

It should eventually allow users to:

* discover distributors
* search distributors
* filter distributors
* view distributor details
* understand geographic coverage
* understand vendor/technology focus
* understand relevant markets

Use the existing `distributors` table.

---

## 13. Opportunities

Opportunities are central to the matching engine.

An opportunity may eventually contain information such as:

* vendor
* customer
* country
* region
* industry
* customer segment
* opportunity value
* technologies
* required capabilities
* certifications
* description
* stage
* status

Use the existing `opportunities` table.

Do not invent fields that conflict with the existing schema.

Inspect the schema before implementing forms or database mutations.

---

## 14. Partner Matching

The matching engine should eventually consider attributes such as:

* geography
* partner type
* technologies
* capabilities
* certifications
* industries
* customer segments
* market coverage
* opportunity requirements

The initial matching system should be deterministic and explainable.

Example:

```text
Partner Match Score: 94%

Geography: +25
Technology: +25
Industry: +20
Capabilities: +15
Customer Segment: +9
```

The exact scoring model should be designed deliberately rather than invented randomly.

Do not claim that an AI match exists until an actual matching implementation exists.

---

## 15. AI Usage

AI is an important part of the product, but do not call an external LLM unnecessarily.

Prefer this progression:

### Phase 1

Database + deterministic matching.

### Phase 2

AI explains deterministic matches.

### Phase 3

AI assists with natural-language opportunity discovery.

### Phase 4

AI improves matching using richer signals and historical outcomes.

Keep API costs low during MVP development.

Do not add paid AI APIs unless explicitly requested.

---

## 16. Security

Security is important because this is a B2B platform.

Never:

* expose secrets
* bypass RLS
* trust client-provided authorization
* expose another tenant's private data
* create insecure server endpoints

When authentication and multi-tenancy are implemented, enforce authorization at the database level as well as the application level.

---

## 17. Database Changes

Do not modify the database schema automatically just because a UI feature needs additional information.

Before making a schema change:

1. Inspect the existing table.
2. Determine whether an existing field/table can support the feature.
3. Explain why a schema change is necessary.
4. Make the smallest appropriate change.

Never drop production tables or data.

---

## 18. Testing and Verification

After significant changes:

* run the appropriate lint/type/build checks
* verify the application runs
* verify important database queries
* check loading/error/empty states
* avoid leaving broken imports or unused dependencies

If a build fails, fix the root cause rather than hiding the error.

Do not declare a feature complete until it has been verified.

---

## 19. Git Discipline

Keep changes focused.

Do not modify unrelated files.

Do not remove working infrastructure without a clear reason.

Do not overwrite environment variables.

Never commit `.env.local` or secrets.

Before large changes, inspect the current repository state.

Prefer small logical commits when commits are requested.

---

## 20. Agent Behavior

The coding agent is an implementation agent, not the product owner.

Do not independently invent major product decisions.

When requirements are ambiguous:

* make the smallest reasonable assumption
* preserve existing architecture
* avoid destructive changes
* ask for clarification when the decision materially affects architecture or data

Do not build large features that were not requested.

Do not replace working components merely for stylistic reasons.

Do not introduce a new framework or backend.

Do not rewrite the project unnecessarily.

---

## 21. Current Development Strategy

Build incrementally in this order:

1. Application shell
2. Partner Directory
3. Partner creation/profile
4. Distributor Directory
5. Opportunity creation
6. Opportunity details
7. Deterministic partner matching
8. Match results
9. AI explanation layer
10. Authentication
11. Multi-tenancy
12. Production hardening
13. Deployment

Each stage should work before moving to the next major stage.

---

## 22. Product Principle

The platform should solve a real channel-sales problem.

Every major feature should answer:

**"Does this help a vendor, distributor, or channel partner find the right business opportunity or the right channel relationship faster?"**

Prefer features that create measurable value over cosmetic features.

Build the smallest useful version first.

<!-- END:PORTAI-PROJECT-INSTRUCTIONS -->
