# ForgeOS Browser Agent extension

This Manifest V3 extension is the first browser execution runtime for ForgeOS custom agents.

## Load it locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `extension` directory.
4. Export an agent JSON file from ForgeOS → Deploy.
5. Open the ForgeOS extension, import the JSON, fill any run inputs, and press **Run agent**.

## Current execution scope

The runtime enforces the configured domain allowlist, opens the target in a normal tab, finds a semantic search field, fills it from the run inputs or goal, and submits the search. If it cannot identify a reliable control, it requests user takeover.

Search, click, type, select, filter, scroll, and extraction are represented as permissions in the workflow definition. A planner and page-state verification loop should be connected next to execute multi-step goals across arbitrary page layouts.
