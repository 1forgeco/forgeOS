# ForgeOS Agent Studio

ForgeOS is 1forge Studio's visual environment for assembling, testing, and eventually deploying custom AI agents. The public landing page remains at `/`; the working agent studio lives at `/app`.

The first product slice is a **Service Finder & Booking Agent**. Users can drag capability blocks onto a canvas, connect them, configure each step, simulate a realistic booking request, and see execution travel through the workflow.

## Local development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run build
npm run lint
```

## Project structure

```text
src/
  components/                    Existing landing-page components
  pages/MarketingPage.tsx        Preserved public landing page
  features/agent-builder/
    components/                  Independent builder UI components
    data/                        Node registry and starter workflow
    pages/                       Agent Studio route composition
    styles/                      Product-specific visual system
    types.ts                     Shared workflow types
  App.tsx                        Route and metadata boundary

worker/index.js                  Cloudflare-compatible SPA worker
scripts/                         Repeatable build preparation
public/                          Static media and social preview
```

## Extending the node library

Most new capability blocks require only three focused changes:

1. Add the node kind to `src/features/agent-builder/types.ts`.
2. Add its label, icon, defaults, and configuration fields to `data/nodeRegistry.ts`.
3. Add it to a starter workflow or expose it through the palette.

The canvas, inspector, persistence, simulation UI, and drag-and-drop behavior are shared automatically.

## Current persistence

This first slice intentionally saves workflow drafts in browser storage. It is suitable for product exploration and demos, not multi-user production data. The next backend milestone should introduce workspaces, versioned workflows, encrypted connections, and durable execution history.
