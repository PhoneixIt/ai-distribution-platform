# PortAi Integration & Execution Roadmap

## Objective

PortAi should operate across the technology ecosystem instead of stopping at discovery or mission tracking.

The product primitive is an **objective**. Missions and AI Workforce runs orchestrate objectives, while the capability layer performs work through provider adapters.

## Capability contract

Every integration belongs to a capability. Product code should call:

`capability -> provider adapter -> external system`

and never:

`product feature -> vendor-specific API`

### Core capabilities

| Capability | Current state | Initial providers | Approval |
|---|---|---|---|
| Web research | Ready | Exa, Firecrawl | No |
| Company research | Ready | Firecrawl | No |
| Ecosystem matching | Existing deterministic engine | PortAi data layer | No |
| Company/contact enrichment | Optional | Clay, ZoomInfo, Similarweb, G2 | No |
| CRM synchronization | Adapter contract planned | Salesforce, HubSpot, Dynamics 365 | No |
| Microsoft ecosystem | Adapter contract planned | Microsoft Graph, Partner Center | Depends on action |
| External communication | Approval boundary defined | AgentMail, Gmail, Outlook, Slack, Teams | Yes |
| Meeting scheduling | Adapter contract planned | Google Calendar, Outlook Calendar, Calendly | No |
| Meeting execution | Adapter contract planned | Zoom, Teams | No |
| Commercial preparation | Approval boundary defined | DocuSign, Stripe, CPQ/ERP | Yes |
| Commercial execution | Approval boundary defined | DocuSign, Stripe, CPQ/ERP | Yes |
| Long-tail automation | Adapter contract planned | Zapier, Make, n8n | Yes |

## Role coverage

### Vendor — Grow My Channel

- discover distributors and channel partners
- enrich and verify partner organizations
- identify contacts
- research partner fit
- prepare and send approved outreach
- coordinate meetings
- synchronize CRM
- create and progress opportunities
- monitor partner activation and recovery

### Distributor — Grow My Ecosystem

- identify portfolio gaps
- discover vendors
- discover and recruit resellers/MSPs/MSSPs/SIs
- research vendor and partner fit
- coordinate vendor/partner relationships
- synchronize CRM/ERP/PRM data
- track opportunities and ecosystem revenue

### Partner — Grow My Technology Business

- discover complementary vendors
- discover distributors
- identify customer opportunities
- research prospects
- prepare outreach
- coordinate meetings
- track opportunities
- maintain vendor relationships and enablement

### Customer — Solve My Technology Need

- express a business requirement in natural language
- translate the requirement into technology categories
- research products and vendors
- identify relevant distributors and local implementation partners
- compare evidence-backed options
- coordinate introductions
- progress the commercial workflow with approvals

## Provider strategy

### Native

Use native APIs when PortAi's core product depends on the provider and the integration is simple enough to own directly.

Current examples:
- Supabase
- Exa
- Firecrawl
- Vercel
- Sentry

### Vercel Connect

Use delegated, server-side credentials for user-authorized providers where supported.

Potential examples:
- Salesforce
- HubSpot
- Dynamics 365
- Microsoft
- Slack
- Teams
- Gmail
- Calendly
- Zoom
- DocuSign
- Stripe

Connector IDs must remain server-side.

### Automation

Use Zapier, Make or n8n for long-tail integrations rather than creating dozens of bespoke adapters.

## Execution policy

### Autonomous

Research, classification, qualification, scoring, matching and internal workspace updates.

### Supervised

Actions where the organization policy asks for review but the action is reversible or low-risk.

### Approval required

External communication, commercial commitments, contracts, purchases, pricing commitments and other consequential external actions.

### External-system approval

Some providers may require their own approval/authorization after PortAi prepares the action.

Every consequential action must produce an auditable chain:

`objective -> plan -> recommendation -> approval -> provider action -> result -> audit event`

## Implementation order

### Phase 1 — Foundation (implemented)

- capability registry
- provider catalog
- Vercel Connect token abstraction
- runtime capability/status endpoint
- Exa -> Firecrawl resilient research
- OpenAI/Vercel AI Gateway-compatible model routing
- RLS/tenant isolation

### Phase 2 — First execution adapters

1. AgentMail or Gmail/Outlook outbound email
2. Google/Outlook calendar
3. Salesforce/HubSpot/Dynamics read synchronization
4. CRM write actions behind approval/policy where appropriate
5. response ingestion and follow-up tasks

### Phase 3 — Ecosystem intelligence

1. Clay
2. ZoomInfo
3. Crossbeam
4. G2
5. Similarweb

Premium providers remain optional. Public evidence must continue working without them.

### Phase 4 — Microsoft channel execution

1. Microsoft Graph
2. Partner Center
3. Teams
4. Dynamics 365
5. subscription/renewal signals

This is strategically important for the channel/distribution wedge.

### Phase 5 — Commercial execution

1. quote/CPQ adapters
2. DocuSign
3. ERP/order systems
4. Stripe for PortAi billing
5. approved commercial execution

### Phase 6 — Long-tail ecosystem

Zapier/Make/n8n plus a generic webhook/action adapter.

## Non-negotiables

- Never advertise an integration as connected unless a real credential/configuration is available.
- Never invent contact, company or commercial data.
- Never expose provider secrets to the browser.
- Never bypass RLS to make an integration work.
- Never make a premium enrichment provider mandatory for the core discovery path.
- Never allow consequential external actions to bypass the approval/policy layer.
- Provider failure must degrade gracefully and preserve the mission/workforce state.
- Evidence and source provenance must survive enrichment and synchronization.
