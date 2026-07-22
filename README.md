# ForgeOS

ForgeOS is 1forge’s product for choosing, customizing, testing, versioning, and deploying browser agents. The marketing site lives at `/`; authenticated product routes include `/projects`, `/templates`, `/runs`, `/approvals`, `/connections`, and `/settings`.

## Product model

- Agent templates are shared structured data, not separate hard-coded products.
- Guided creation converts a user’s website, goal, changing inputs, and approval policy into an editable graph.
- Agents and immutable deployment versions are stored in D1 under an authenticated workspace.
- The Chrome extension imports a deployed agent definition and operates only on allowed HTTPS domains.
- Available, Beta, and Coming soon labels describe actual runtime support.

The core workflow remains:

```text
Start manually → Choose website → Describe goal → Ask for inputs
               → Browser agent → Ask for approval → Return result
                                ↘ Let me take over
```

## Local development

```bash
npm install
npm run dev
```

`npm run dev` now prepares the local D1 database and starts both services:

- ForgeOS UI: `http://localhost:5173`
- Local Worker API: `http://localhost:8787`

Vite proxies `/api/*` to the Worker, so registration, sign-in, saved agents, and other account-backed features work from the normal `localhost:5173` URL. Local data is stored under `.wrangler/` and is intentionally excluded from Git.

Validation:

```bash
npm run db:generate
npm run build
npm run lint
```

If an older frontend-only development process is already running, stop it once and rerun `npm run dev` so the API process and proxy are started too.

## Project structure

```text
src/
  pages/MarketingPage.tsx
  features/product/
    components/      Product shell, cards, and landing discovery
    data/            Shared agent-template registry
    pages/           Projects, templates, creation, runs, approvals, settings
    styles/          Product UI system
    api.ts            Typed product API client
  features/agent-builder/
    components/      Canvas, test, and deploy surfaces
    data/            Node registry and base workflow
    runtime/         Graph compiler and preserved booking template

db/schema.ts         Users, workspaces, agents, versions, runs, approvals, connections
drizzle/             Deployable D1 migrations
worker/index.ts      Identity-aware product API and static application worker
extension/           Manifest V3 browser execution runtime
public/              Extension package, media, and social preview
```

## Current browser execution scope

The extension enforces the domain allowlist, opens a normal HTTPS tab, identifies a semantic search field, fills it from run inputs or the goal, and submits the search. Multi-step filtering, sorting, page-state planning, and result verification remain Beta. Login, CAPTCHA, two-factor authentication, payment details, legal acceptance, and protected actions remain user-controlled.
