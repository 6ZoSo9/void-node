# VOID / Obelisk / NullFeed UI Plan (Phase 1)

## Goals

- Retro, terminal-style UX that still feels organized and future-proof.
- Single mental model across:
  - Node operator console (Obelisk console in ops/).
  - Obelisk Wallet (desktop/mobile).
  - NullFeed client embedded into the wallet.
- Menus must always support:
  - Viewing balances.
  - Transferring funds.
  - Deploying contracts (where appropriate).
  - Toggling between devnet / mainnet environments.

## Layers

1. **Operator layer (what exists now)**
   - `ops/obelisk-console.sh` is the "operator TUI".
   - Menus:
     - **Devnet tools**
       - View devnet protocol summary (JobQueue, AgentRegistry, etc.).
       - Check balances (given token + address).
       - Transfer VOID on devnet (best-effort, may revert until tokenomics wiring is final).
       - Fund devnet caller with ETH (gas faucet).
       - *(Later)* Deploy / upgrade devnet protocol stack.
     - **Mainnet Phase 1 tools**
       - Phase 1 launch health (docs + keys + PLAN + pillars).
       - Dump roles mapping vs live JSON.
       - run() stub dry-run (MAINNET bootstrap script).
       - Inspect planned balances by role (once VoidToken live on mainnet).

2. **Wallet layer (future Obelisk Wallet UI)**
   - Top-level sections:
     - **[Node]** basic node status + health summary (read-only for most users).
     - **[Wallet]** balances, transfers, and contract deploy/call helpers.
     - **[NullFeed]** client for the on-chain/off-chain feed.
   - For human users:
     - Clear separation: "Network" selector (devnet, mainnet Phase 1, etc.).
     - Simple flows:
       - "Send VOID"
       - "Deploy contract" (with gas estimate and confirmation).
       - "View validators / staking" (later phases).

3. **NullFeed integration (concept)**
   - NullFeed is treated as another module:
     - **Read**: timeline / board view (per channel / board).
     - **Write**: post / reply / image upload flow, using Obelisk Wallet keys.
   - Wallet responsibilities:
     - Sign posts / actions with the user’s key.
     - Handle compression + encryption when needed (future).
     - Route data either:
       - Directly on-chain (short posts), or
       - Via VOID’s off-chain storage + on-chain commitments.
   - Integration must share the same navigation model:
     - From the wallet UI:
       - `[NullFeed] -> [Board List] -> [Thread] -> [Post]`
     - From operator console:
       - (Phase 1) Observability only (e.g., NullFeed contract address, post counts).
       - (Later) Admin/maintenance flows (e.g., moderation hooks, repair jobs).

## Menu structure constraints

- All menus should be:
  - Nested, never flat “wall of options”.
  - Easy to extend: each new feature == new submenu item, not a redesign.
- Console and wallet should mirror each other conceptually:
  - Operator console: text-only, keyboard-driven.
  - Wallet UI: same sections, but with buttons and panels instead of numbered prompts.

## Phase 1 scope

- Lock in the operator console structure we have now:
  - `ops/obelisk-console.sh` as the canonical “TUI shell”.
  - Devnet + Mainnet Phase 1 menus stable and additive.
- Do **not** overbuild NullFeed UI yet:
  - Keep it as a defined module in the plan.
  - Implement real client views after VOID mainnet Phase 1 is live and stable.

## Future additions (after mainnet Phase 1)

- Add "Deploy contract" flows to:
  - Devnet menu (for testing deployments).
  - Wallet UI (for mainnet users).
- Add NullFeed menu to Obelisk console:
  - At first: diagnostics + meta (addresses, health).
  - Later: basic posting tools for power users.
- Add Obelisk Wallet GUI:
  - Reuse the same structure and scripts under the hood where possible.
