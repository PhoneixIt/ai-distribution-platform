# PortAi Integration & Capability Architecture

PortAi is an AI-native technology ecosystem operating layer. Missions are objectives/orchestration primitives; they are not the integration architecture.

## Runtime architecture

AI Workforce and Missions call capabilities. Capabilities resolve to provider adapters. Providers may be native, Vercel Connect-backed, or automation-backed.

```
PortAi
  -> Orchestrator
  -> AI Workforce / Missions
  -> Capability Registry
  -> Provider Adapter
  -> Native API | Vercel Connect | Automation
```

Cross-cutting controls apply to every action:
- tenant authorization and RLS
- provider credential isolation
- evidence/provenance
- data freshness
- policy checks
- approval gates for consequential actions
- audit events

## Current runtime

Working now without adding paid integrations:
- Supabase: auth/database/RLS
- Vercel: hosting/runtime
- Exa: web discovery
- Firecrawl: web search/crawling/evidence
- OpenAI: existing Vercel Connect-backed token path
- Sentry: observability already present

The registry exposes these as configured capabilities and keeps future providers optional.

## Provider families

- AI: OpenAI and optional Vercel AI Gateway
- Research: Exa and Firecrawl
- Intelligence: Clay, ZoomInfo, G2, Similarweb, Crossbeam
- CRM: Salesforce, HubSpot, Dynamics 365
- Microsoft: Microsoft Graph and Partner Center
- Communication: AgentMail, Gmail, Outlook, Slack, Teams, Resend
- Scheduling: Google Calendar, Outlook Calendar, Calendly
- Meetings: Zoom and Teams
- Commercial: DocuSign, Stripe, CPQ/ERP/order systems
- Automation: Zapier, Make and n8n

## Security contract

Provider credentials are requested server-side only when a capability needs them. Vercel Connect is the credential broker for supported providers; connector IDs remain in environment variables and are never returned to clients.

Premium enrichment providers are optional. The public-evidence path remains functional.

## Product contract

Every user role consumes the same capability layer:
- Vendor: discover/enrich/match partners, contact, schedule, sync CRM, progress opportunities.
- Distributor: analyze portfolio gaps, discover vendors/partners, coordinate relationships, sync CRM.
- Partner: discover vendors/opportunities, research customers, communicate, schedule and track outcomes.
- Customer: describe a need, research solutions, identify relevant vendors/distributors/partners, coordinate introductions and commercial progression.

Missions orchestrate capabilities, but capabilities are also callable from dashboards, AI Workforce tasks, approvals and future automations.
