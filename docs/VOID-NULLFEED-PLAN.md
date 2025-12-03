# VOID NullFeed UI Plan (Phase 1)

NullFeed is the image / media board for VOID Network. It must:

- Feel like a retro IRC / imageboard hybrid.
- Let users switch channels like mIRC (think: #global, #dev, #alpha, #nsfw, etc.).
- Work in two modes:
  - Node-baked UI: integrated into Obelisk / void-node for power users.
  - Browser-lite UI: a lightweight web front-end that can talk to nodes and wallets.

This document defines the Phase 1 plan for the UI and channel model. It is intentionally simple and future-proof.

---

## 1. Core Concepts

- **Channel**: A named stream of posts, like `#global` or `#dev-ai`.
- **Board**: Optional grouping of channels (e.g. `public`, `dev`, `internal`).
- **Post**: A message with optional media (image/GIF) and on-chain/off-chain metadata.
- **Identity**: Wallet-based identity (Obelisk or EVM wallet). Anonymous/ephemeral handles may be allowed, but signing is preferred.

Initial channels (examples only):

- `#global` – general chat and posts.
- `#void-dev` – protocol / node dev.
- `#ai-lab` – AI / agents discussion.
- `#nullfeed-meta` – feedback about NullFeed itself.

Channel definitions will live in a simple JSON file for now, e.g.:

- `docs/NULLFEED-CHANNELS.json`

The node UI and browser UI will both read from this same list, so adding/removing channels is a data change, not a code change.

---

## 2. UI Modes

### 2.1 Node-Baked Obelisk UI

Goal: let node operators and Obelisk users browse/post without leaving their terminal or node dashboard.

Phase 1 (TUI / console):

- Obelisk console gets a top-level menu item:
  - `[3] NullFeed (channels, posts, browser hints)`
- NullFeed submenu (Phase 1 stub):
  - `[1] List channels (from NULLFEED-CHANNELS.json)`
  - `[2] Describe posting flow (PLAN ONLY; no real API calls yet)`
  - `[3] Browser-lite URL hints (how to open NullFeed in a browser later)`
  - `[0] Back`

Future phases (beyond Phase 1):

- Wire console options into real HTTP APIs exposed by void-node:
  - `GET /nullfeed/channels`
  - `GET /nullfeed/channel/:name`
  - `POST /nullfeed/channel/:name/post`
- Support filtering by:
  - `channel`
  - `since_block`
  - `since_timestamp`

### 2.2 Browser-Lite UI

Goal: a **cheap to host**, resource-light web UI for NullFeed that can be:

- Served directly from the dev box, or
- Served by one or more VOID nodes, or
- Hosted on a minimal VPS/CDN.

Requirements:

- Single-page app or very small set of static pages (HTML + JS + CSS).
- Talks to:
  - `void-node` HTTP APIs (for posts / channels).
  - Wallets:
    - Obelisk Wallet (custom integration later).
    - Metamask / generic EVM wallets via standard RPC.

Key design points:

- **Channel list** on the left, like mIRC:
  - Click a channel to focus it.
- **Message list** in the middle.
- **Composer** at the bottom:
  - Text input.
  - Optional upload field (off-chain media with on-chain commitments later).
- **Wallet status** in a small status bar:
  - Connected wallet address.
  - Active network (devnet / mainnet).

---

## 3. Hosting & Cost Model

We want NullFeed to be **cheap**:

- Phase 1:
  - Serve static assets from the dev box or from the main node machine.
  - No heavy backend; use void-node HTTP as the “API”.
- Later:
  - Optionally let nodes opt-in as NullFeed “relay” hosts.
  - Use VOID chain commitments for important posts, but keep bulk media off-chain.

NOTES:

- This plan is UI-focused and intentionally ignores tokenomics / moderation details for now.
- Future docs:
  - `docs/VOID-NULLFEED-MODERATION.md`
  - `docs/VOID-NULLFEED-ONCHAIN-COMMITMENTS.md`
