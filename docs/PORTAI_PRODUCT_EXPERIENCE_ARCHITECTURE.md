# PortAi Product & Experience Architecture

## Product contract

PortAi is an AI operating platform for the technology distribution ecosystem.

Users express a business outcome. PortAi executes the internal workflow automatically. Users do not approve discovery, research, verification, qualification, scoring, contact research or drafting stage by stage.

Human intervention is reserved for meaningful business decisions and external/consequential actions, subject to the organization's AI autonomy policy.

## Ecosystem identity

Every organization has:

- a primary organization type
- optional additional ecosystem roles
- capabilities
- products/services
- markets
- relationships
- users and permissions
- AI autonomy preferences
- onboarding state

Supported primary types:

- Vendor
- Distributor
- Reseller
- VAR
- MSP
- MSSP
- System Integrator
- Technology Partner
- Service Provider
- Customer

An organization may have multiple roles. A distributor can also be a reseller or system integrator, for example.

## Experience contract

The organization type and the individual user's role determine:

- onboarding questions
- dashboard KPIs
- navigation
- available features
- terminology
- settings
- AI workforce
- recommendations
- permissions
- empty states
- default workflows

A customer must never be presented with a vendor's partner-recruitment workspace simply because both use the same application.

## Workspace principles

1. Outcome-first: users start from what they want accomplished.
2. Progressive disclosure: collect only what is needed now; learn more over time.
3. Automatic internal execution: no stage-by-stage approvals.
4. Evidence-first recommendations: show why PortAi reached an important recommendation.
5. Human control at meaningful boundaries: external or consequential actions can require approval.
6. Context persistence: business context is reused instead of repeatedly requested.
7. Role-specific settings: irrelevant settings are hidden.
8. Polished states: every workflow has loading, progress, success, empty, partial, retry and failure states.
9. Accessible and responsive by default.
10. The internal agent/workflow machinery is implementation detail, not the primary UX.

## Mission execution contract

A mission's requested result count is the number of results the user wants returned, not the number of companies PortAi is allowed to discover.

Discovery should use a broad, adaptive candidate universe:

Search → collect → deduplicate → identify gaps → expand queries/sources → verify → qualify → score → select top N.

The engine must be asynchronous/batched for large-country or high-coverage missions. A single request must not attempt to search and research an entire country synchronously.

## Workspace examples

### Vendor
Prioritize partners, partner recruitment, channel coverage, partner health, products, markets, campaigns and channel pipeline.

### Distributor
Prioritize vendor portfolio, reseller network, territory coverage, downstream opportunities, products and commercial operations.

### Reseller / VAR
Prioritize vendors, products, customers, opportunities, quotes/engagements and renewals.

### MSP / MSSP
Prioritize vendor ecosystem, services, customer opportunities, recurring relationships and renewals.

### System Integrator
Prioritize technology ecosystem, solutions, projects, customers and delivery opportunities.

### Customer
Prioritize requirements, solution discovery, evaluations, vendors, projects, purchases and support.

These are product principles, not separate applications. They share the PortAi ecosystem graph, AI operating layer, security model and core infrastructure.
