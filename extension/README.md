# ForgeOS Browser Agent extension

This Manifest V3 extension is the browser execution runtime for ForgeOS custom agents. ForgeOS detects it from either localhost or the hosted deployment screen, pairs the installation securely, and delivers immutable agent versions without a JSON import. It does not open or depend on ChatGPT.

## Load it locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `extension` directory.
4. Start ForgeOS with `npm run dev`, open `http://localhost:5173`, and refresh that tab after loading or reloading the extension.
5. Sign in, open an agent, and choose **Deploy to extension**.
6. Open the ForgeOS extension, select the delivered agent, fill any run inputs, and press **Run agent**.

## Current execution scope

The runtime enforces the configured domain allowlist, opens the target in a normal tab, finds semantic controls, fills them from the run inputs or goal, and gathers visible page evidence. Product Research collects a bounded candidate set, inspects up to five leading product pages, and scores budget fit, requested features, review confidence, availability, and launch-date evidence when the site exposes it. Other specialist modes send their visible evidence through the server-side reasoning runtime before returning the final result.

The runtime supports semantic search, typing, visible field matching, selecting, filtering, sorting, scrolling, result opening, extraction, specialist synthesis, multi-page research, evidence-backed briefs, approval pauses, stop/pause controls, integrity validation, multiple installed agents, and synchronized run history. Website changes can still require human takeover; passwords, payment fields, CAPTCHA and two-factor authentication are deliberately excluded. Live inbox, calendar, publishing, CMS, and phone actions also require their provider connection.
