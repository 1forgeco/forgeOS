# ForgeOS Agent Studio

ForgeOS is 1forge Studio's visual environment for assembling, testing, and eventually deploying custom AI agents. The public landing page remains at `/`; the working agent studio lives at `/app`.

The first product slice is a **Service Finder & Booking Agent**. Users can drag clear business steps onto a canvas, connect them, configure each step, hold a complete test conversation, and install the agent on a website with one script tag.

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

worker/index.ts                  Agent API and Cloudflare-compatible SPA worker
scripts/                         Repeatable build preparation
public/                          Static media and social preview
```

## Extending the node library

Most new capability blocks require only three focused changes:

1. Add the node kind to `src/features/agent-builder/types.ts`.
2. Add its label, icon, defaults, and configuration fields to `data/nodeRegistry.ts`.
3. Add it to a starter workflow or expose it through the palette.

The canvas, inspector, persistence, simulation UI, and drag-and-drop behavior are shared automatically.

## Agent runtime and persistence

Workflow drafts remain device-local while the product is still single-user. Test conversations and confirmed booking requests use the deployed agent endpoint and D1 database. The embeddable widget is served from `public/forgeos-widget.js` and calls the same runtime used by the in-product Test screen.

The current agent saves a booking **request** using example 1forge services and availability. It does not yet create a Google Calendar event or send email. Those connectors should be added after workspace authentication and encrypted connection storage.
