# AI Operating Layer

The business foundation is the source of truth. The AI layer does not replace the business model.

## Agent team

1. **Distributor CEO / Orchestrator** — routes objectives, delegates specialist work, synthesizes results and enforces approval boundaries.
2. **Vendor Manager Agent** — vendor/product research, onboarding opportunities and missing information.
3. **Partner Manager Agent** — dormant partners, activation, recruitment and partner health.
4. **Sales Agent** — opportunity analysis, prioritization, follow-up and meeting/outreach preparation.
5. **Market Intelligence Agent** — competitors, products, markets and external signals.
6. **Commercial Agent** — pricing, margin, discounts and deal structure analysis.
7. **Operations Agent** — overdue tasks, missing information and workflow bottlenecks.

The smallest useful set is selected per objective. The orchestrator is not a generic chatbot and specialists are not independent databases.

## Control model

Every result is classified as:

- **FACT** — verified database or source-backed web information.
- **INFERENCE** — conclusion derived from available facts.
- **RECOMMENDATION** — proposed business decision.
- **ACTION** — controlled internal state change, such as creating a task.
- **APPROVAL** — explicit human authorization required before a sensitive action.

External email, pricing commitments, contractual terms and other sensitive external actions are never executed by this layer.

## Server-side tools

Tools are implemented behind an authenticated server boundary. Agents receive only the tools allowed for their role.

Read tools:
- query_partners
- query_vendors
- query_products
- query_customers
- query_opportunities
- query_tasks
- query_pricing
- search_market
- analyze_opportunity

Controlled state-changing tools:
- create_task
- generate_recommendation
- request_human_approval

The server forces the active workspace ID and relies on Supabase RLS as the final authorization boundary.

## State and audit

- agent_runs — one user objective / orchestration run.
- agent_tasks — root orchestration task plus specialist tasks.
- agent_tool_calls — tool request/result audit trail.
- agent_approvals — pending human authorization records.
- agent_memories — durable per-agent workspace memory.
- agent_definitions — role, instructions, allowed tools and access policy.
- Existing business tables remain the source of truth for vendors, partners, customers, opportunities, products, pricing and operational work.

## AI provider

The runtime supports:

- Vercel Connect OpenAI credentials via `CONNECTOR_OPENAI` (the current connector ID is used as the default).
- `OPENAI_AGENT_MODEL` as an optional model override; the default is `gpt-5.6-luna`.
- Deterministic rules for routing and other safe fallback behavior where explicitly implemented.

The first production model integration uses the OpenAI Responses API with structured outputs and controlled function tools. The architecture keeps the domain tool registry independent so it can move to the OpenAI Agents SDK without changing the business database contract.

## UI

/workforce is the central AI operating workspace. It accepts natural-language objectives and shows:

- selected agents
- facts
- inferences
- recommendations
- actions
- information gaps
- approval requirements
- confidence
- delegation trace

No UI capability is advertised as an external action unless a real backend tool exists for it.

## First proof workflows

1. **Partner reactivation** — route to Partner Manager, inspect tenant partner state, identify dormant relationships, create reviewable recommendations and follow-up tasks.
2. **Vendor approach** — route to Vendor Manager, inspect vendor/product state and identify the next research/onboarding action.
3. **Revenue risk** — route to Sales Agent, inspect open opportunities and product-line revenue, identify risk signals and create follow-up actions.

When OpenAI is configured, the orchestrator selects specialists and specialists can call their permitted tools. Without a key, the same state transitions can be exercised through the explicit rules fallback so the UI does not pretend an unavailable model is running.
