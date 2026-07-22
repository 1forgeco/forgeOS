# ForgeOS Browser Agent extension

This Manifest V3 extension is the browser execution runtime for ForgeOS custom agents. ForgeOS detects it from the deployment screen, pairs the local installation securely, and delivers immutable agent versions without a JSON import.

## Load it locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `extension` directory.
4. Open an agent in ForgeOS and choose **Deploy to extension**.
5. Open the ForgeOS extension, select the delivered agent, fill any run inputs, and press **Run agent**.

## Current execution scope

The runtime enforces the configured domain allowlist, opens the target in a normal tab, finds a semantic search field, fills it from the run inputs or goal, and submits the search. If it cannot identify a reliable control, it requests user takeover.

The runtime supports semantic search, typing, visible field matching, selecting, filtering, sorting, scrolling, result opening, extraction, multi-page continuation, approval pauses, stop/pause controls, integrity validation, multiple installed agents, and synchronized run history. Website changes can still require human takeover; passwords, payment fields, CAPTCHA and two-factor authentication are deliberately excluded.
