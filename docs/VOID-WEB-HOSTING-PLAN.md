# VOID Network – Web Hosting Plan (Devnet/Mainnet Draft)

## Goals

- Minimize ongoing hosting cost for VOID sites (voidchain.io, nullfeed.io, etc.).
- Keep **all critical logic and secrets on our own VOID nodes**, not on third-party platforms.
- Make the public web presence resilient: static content is easy to mirror; nodes remain the source of truth.

## Core Principles

1. **Static-only on third parties**

   - Free/cheap hosting (e.g. GitHub Pages, Cloudflare Pages, other static hosts) is used **only** for:
     - HTML
     - CSS
     - JS bundles
     - Static images/assets

   - No DB, no server-side code, no secrets, no “real” API hosted there.

2. **Our nodes are the backend**

   - All important traffic goes to our own infrastructure:
     - JSON-RPC for wallets and dapps.
     - REST/HTTP APIs for NullFeed, AI job posting, receipts, metrics views, etc.
   - Those live on our VOID nodes (home lab / servers), behind proper TLS and whatever DoS/proxy layer we choose.

3. **Chain + node = source of truth**

   - On-chain state and our node APIs are authoritative.
   - A compromised static host can at worst ship a malicious JS bundle; it **cannot**:
     - Change chain state.
     - Forge receipts that pass our on-chain checks.
     - Access private keys (wallets sign locally).

4. **Easy fallback**

   - If a free static host censors or dies, we can:
     - Serve the same static bundle directly from our node.
     - Stand up a new static mirror and point users to it.
   - Wallets and power users can always talk directly to `rpc.voidchain.io` (or equivalent) if the pretty site is down.

## Topology (Planned)

- **DNS / Domains**
  - `voidchain.io`
    - Marketing + docs + status -> static host
    - `rpc.voidchain.io` -> our node JSON-RPC endpoint (via reverse proxy).
    - `api.voidchain.io` -> HTTP API gateway on our node(s).
  - `nullfeed.io`
    - SPA front-end (feed UI) -> static host.
    - `api.nullfeed.io` -> backend endpoints on our nodes (posting, fetching feeds, AI jobs, etc.).

- **Front-end hosting**
  - Deployment target is a **free/cheap static host**:
    - Build app -> upload static bundle -> edge CDN serves assets.
    - No backend routes; all dynamic behavior is via fetch/WebSocket to our nodes.

- **Backend hosting**
  - Our VOID nodes expose:
    - JSON-RPC (chain interactions).
    - REST/HTTP APIs (NullFeed, dev dashboards, AI job pipelines).
  - Optionally fronted by a small reverse proxy (Nginx/Caddy) for:
    - TLS termination.
    - Basic rate limiting.
    - IP allowlists/geo-fencing if needed.

## Cost Reasoning

- Static assets are the biggest bandwidth consumer for casual web traffic.
- Offloading them to a free static host means:
  - Our home/colo nodes mainly serve JSON/txs, not megabytes of JS/images per page load.
  - We can run fewer/better-tuned nodes instead of a full web hosting stack.

## Security Reasoning

- Third-party hosts are treated as **untrusted CDNs**:
  - They only serve static content and cannot directly modify on-chain state.
  - No environment secrets, no DB credentials, no admin panels.

- All sensitive behavior happens on:
  - User devices (wallet signing).
  - Our VOID nodes (RPC, AI pipeline, job/receipt handling).

- If we detect a compromised static bundle:
  - Ship a clean bundle somewhere else.
  - Tell users to verify they are using the correct domain / hash-pinned build (future enhancement).

## Implementation Phases

### Phase 1 – Docs & Minimal Status Page

- Keep this document as the canonical plan.
- Build a **minimal static status page** that:
  - Loads from free static host.
  - Fetches basic health from Prometheus/VOID (via a safe public endpoint) and shows green/red lights.

### Phase 2 – App Shell for VOID / NullFeed

- Build SPA shells for:
  - `voidchain.io` (docs + dashboards + link to wallet).
  - `nullfeed.io` (feed UI + posting, eventually).
- Configure them to talk to:
  - `https://rpc.voidchain.io` for JSON-RPC.
  - `https://api.voidchain.io` / `https://api.nullfeed.io` for application APIs.

### Phase 3 – Hardening & Multi-Mirror

- Add:
  - CSP and integrity checks for bundles.
  - Optional secondary static mirrors.
  - Monitoring (Prometheus) for:
    - Static host availability (synthetic checks).
    - Node backend availability and error rates.

This plan keeps our costs low while ensuring all critical logic and authority stays inside VOID nodes we control.
