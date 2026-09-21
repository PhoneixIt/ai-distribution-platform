# PortAi — AI Workforce v1

## Purpose

The platform is evolving from a channel-data application into an AI-operated distribution workspace.

The first workforce workflow is **partner recruitment**:

1. Receive a business objective.
2. Research potential channel partners.
3. Verify company and capability evidence.
4. Evaluate channel fit.
5. Research decision-maker contacts.
6. Prepare personalized outreach.
7. Pause for explicit approval before external outreach.
8. Send through the connected email provider.
9. Capture responses and feed them back into the workspace.

## Architecture

```text
User
  |
  v
CEO / Control Agent
  |
  +--> Partner Research
  +--> Verification
  +--> Channel Fit
  +--> Contact Research
  +--> Outreach Preparation
  |
  v
MCP / API Toolbox
  |
  +--> Web discovery
  +--> Website research
  +--> Contact data
  +--> Email
  +--> Supabase
  |
  v
Supabase
  |
  +--> partners
  +--> company_evidence
  +--> company_contacts
  +--> company_relationships
  +--> discovery_runs
  +--> discovery_candidates
  +--> agent_runs
  +--> agent_tasks
  +--> partner_matches
  +--> opportunities
```

## Existing capabilities reused

The repository already has a deterministic partner-discovery pipeline with:

- web discovery
- company research
- evidence capture
- scoring
- qualification
- candidate ranking
- parallel research workers

The workforce layer should orchestrate these capabilities rather than duplicate them.

## Agents

### CEO Agent

Role: control/orchestration.

Responsibilities:

- understand the user objective
- decompose work
- delegate specialist analysis
- inspect results
- maintain uncertainty
- decide the next internal action
- stop at approval boundaries
- return a concise executive report

### Research Agent

Role: partner discovery.

Responsibilities:

- discover companies in the requested market
- identify partner types and services
- collect source evidence
- avoid duplicate companies

### Verification Agent

Role: evidence validation.

Responsibilities:

- confirm company identity
- verify partner claims against sources
- reject unsupported assumptions
- assign confidence

### Channel Fit Agent

Role: commercial/channel qualification.

Responsibilities:

- compare partner capabilities with vendor/opportunity needs
- inspect geography, customer segment, technology, services and certifications
- use the existing deterministic scoring model where possible
- explain gaps and risks

### Contact Research Agent

Role: decision-maker discovery.

Responsibilities:

- identify relevant channel, alliances, sales or business-development contacts
- capture contact source and confidence
- avoid inventing contact information

### Outreach Agent

Role: communication preparation.

Responsibilities:

- personalize partner recruitment messages
- reference verified facts only
- create follow-up plans
- never send external outreach without an approved task

### Response Agent

Role: post-outreach classification.

Responsibilities:

- classify replies
- identify interest, objections, requests, wrong contacts and opt-outs
- update the related task/company/contact state
- create the next internal task for the CEO agent

## Task model

`agent_runs` represents one user objective or campaign.

`agent_tasks` represents a unit of work within that objective.

Important relationships:

```text
agent_run
  |
  +--> root task
         |
         +--> specialist tasks
               |
               +--> evidence / contacts / outreach
```

Tasks support parent-child relationships and dependency IDs so the system can evolve from a single CEO session into a resumable task graph.

## Approval policy

Internal activities do not require approval:

- research
- browsing
- enrichment
- qualification
- scoring
- drafting
- classification
- database updates within the user's authorized workspace

External activities require explicit approval:

- sending a new external email
- sending a follow-up to a prospect
- inviting a partner/customer to an external meeting
- publishing externally
- executing commercial commitments

The approval state belongs to the task that performs the external action, not the root orchestration task.

## Current API seam

`POST /api/ai/workforce`

Creates a workforce run, creates its root orchestration task, and starts an OpenAI managed agent session.

`GET /api/ai/workforce/[id]`

Returns the run and its tasks for UI polling and future event rendering.

## OpenAI integration

The current implementation uses the OpenAI Agents API directly through server-side `fetch` so the repository does not need an additional client dependency solely for the first integration.

Configuration:

- `CONNECTOR_OPENAI` — optional connector identifier; the current Vercel Connect connector is used by default
- `OPENAI_AGENT_MODEL` — optional; defaults to `gpt-5.6-luna`

OpenAI credentials are requested server-side through Vercel Connect. The workforce no longer uses the legacy `/v1/agents/sessions` endpoint.

The current session uses `environment.type = none`. Hosted sandboxes and additional MCP tools are a later step and should only be added when the corresponding production integration is actually configured.

## Tool strategy

Preferred order:

1. Reuse existing application functions.
2. Expose a focused function as a tool.
3. Expose external services through MCP when the service is already configured.
4. Use an API directly when MCP adds unnecessary complexity.

Do not add multiple orchestration frameworks. OpenAI Agents is the primary agent runtime. n8n can later act as the scheduling/automation layer. Supabase remains the system of record.

## Cost strategy

The workforce is designed to be free-first during development.

Use deterministic database logic for simple work. Reserve paid model/tool calls for work where reasoning or external research is valuable.

Do not scale the workflow above a small controlled pilot until result quality, source reliability and operating cost are measured.

## Next implementation stages

### V1.1 — Tool wiring

Connect the existing partner-discovery functions and safe Supabase operations as explicit agent tools.

### V1.2 — Contact research

Persist contacts and evidence from real research runs.

### V1.3 — Outreach approval

Create an approval queue in the application and connect the approved action to AgentMail.

### V1.4 — Response loop

Ingest replies, classify them, and create follow-up tasks.

### V1.5 — Scheduling

Add a scheduler/automation layer for recurring research and follow-up work.

### V1.6 — Multi-agent production runtime

Replace the first direct session-only orchestration with reusable saved agents and explicit specialist delegation once the workflows and tools are stable.
