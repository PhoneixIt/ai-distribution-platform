# PortAi — Testing Phase

## Automated checks

GitHub CI runs:

1. `npm ci`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run build`

Run locally with:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

## Local smoke test

Start the application:

```bash
npm run dev
```

Then, in a second terminal:

```bash
npm run smoke
```

The smoke test checks the dashboard, discovery page, partner directory, partner creation page, and discovery API for server errors.

## Functional acceptance tests

### 1. Discovery

- Open `/discovery`.
- Search a real channel request such as `Cybersecurity / Germany / MSSP / Mid-market`.
- Confirm the response contains multiple candidates.
- Confirm research status, fit score and qualification score are present.
- Confirm evidence URLs are present when the website contains supporting information.
- Confirm unknown facts remain `Unknown` rather than being invented.

### 2. Candidate promotion

- Run discovery.
- Select `Save to partner directory` on a candidate.
- Confirm the candidate appears in `/partners`.
- Repeat the action and confirm a duplicate partner is not created.

### 3. Company intelligence

- Open a saved partner profile.
- Confirm company type, geography, technologies, services, industries, customer segments, certifications, verification status and evidence are displayed when available.
- Confirm source URLs open correctly.

### 4. Partner directory

- Search by name, website, country, company size and partner type.
- Confirm empty and no-match states behave correctly.
- Add a manual partner and confirm it appears in the directory.

### 5. Failure handling

- Temporarily remove/disable the Exa key in a local environment.
- Confirm discovery returns a clear configuration error instead of exposing secrets.
- Use an invalid website candidate and confirm research fails safely.

### 6. Security checks

- Never expose `EXA_API_KEY` to client-side code.
- Confirm server routes require the authenticated Supabase client.
- Confirm discovery has a short cooldown to reduce accidental API spend.
- Review Supabase Security Advisor before public launch.

## Launch gate

The MVP is ready for controlled testing when:

- CI is green.
- Local smoke test passes.
- Discovery returns evidence-backed candidates.
- Candidate promotion works without duplicates.
- Company intelligence renders correctly.
- No secret is exposed to the browser.
- Supabase migrations are applied to the target project.

Public launch should wait until authentication/tenant ownership, abuse protection, production environment variables, and deployment are configured.
