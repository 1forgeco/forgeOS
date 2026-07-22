# ForgeOS Agent Studio

ForgeOS is 1forge Studio’s visual environment for creating, testing, and deploying custom browser agents. The preserved marketing page remains at `/`; the working studio is at `/app`.

The default product workflow is intentionally general:

```text
Start manually → Choose website → Describe goal → Ask for inputs
               → Browser agent → Ask for approval → Return result
                                ↘ Let me take over
```

Users configure outcomes, permissions, safeguards, and outputs instead of manually creating a node for every possible click. The browser agent chooses among reusable capabilities such as search, click, type, select, filter, sort, scroll, and extract.

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
    components/                  Independent builder, test, and deploy UI
    data/                        Node registry and starter workflow
    pages/                       Agent Studio route composition
    runtime/browserWorkflow.ts   Graph validation and compiled agent definition
    runtime/bookingAgent.ts      Preserved booking-template runtime
    styles/                      Product-specific visual system
    types.ts                     Shared workflow and deployment types

extension/                       Manifest V3 Chrome execution runtime
worker/index.ts                  Cloudflare-compatible API and SPA worker
db/ and drizzle/                 Existing booking-template persistence
public/                          Static media, widget, and social preview
```

## Testing a custom browser agent

1. Open `/app` and edit the **Choose website**, **Describe the goal**, **Ask for inputs**, **Browser agent**, and **Ask for approval** nodes.
2. Use **Test** to validate the actual saved graph and its compiled settings.
3. Use **Deploy** to download the versioned agent JSON file.
4. Download the Chrome extension ZIP from Deploy (or use the repository’s `extension` directory), unzip it, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**.
5. Open the ForgeOS side panel, import the JSON file, provide run inputs, and press **Run agent**.

The first extension runtime enforces the domain allowlist, opens a normal HTTPS tab, identifies a semantic search field, fills it, and submits a search. It asks for user takeover when a reliable control cannot be found. Login, CAPTCHA, two-factor authentication, payment details, and protected actions remain human-controlled.

## Runtime boundary

The graph compiler is the contract between the visual builder and every runtime. It produces a stable definition containing the website allowlist, goal, changing inputs, permitted browser capabilities, approval policy, step limit, completion rule, and fallback instructions.

Multi-step arbitrary browsing still needs a page-state planner and verification loop. The extension intentionally reports its current search-only execution scope instead of pretending that the website preview is being controlled by the web application.
