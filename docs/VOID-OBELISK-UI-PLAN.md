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

### 1. Operator layer (what exists now)

- `ops/obelisk-console.sh` is the "operator TUI".
- Menus:

  - **Devnet tools**
    - View devnet protocol summary (JobQueue, AgentRegistry, ModelRegistry, DatasetRegistry).
    - Check balances (given token + address).
    - Transfer VOID on devnet (best-effort, may revert depending on devnet state).
    - Fund devnet caller with ETH (gas faucet).
    - *(Later)* Deploy / upgrade devnet protocol stack.

  - **Mainnet Phase 1 tools**
    - Phase 1 launch health (docs + keys + PLAN + pillars).
    - Dump roles mapping vs live JSON.
    - `run()` stub dry-run (MAINNET bootstrap script).
    - Inspect planned balances by role (once VoidToken is live on mainnet).

### 2. Wallet layer (future Obelisk Wallet UI)

- Top-level sections:

  - **[Node]**  
    - Basic node status + health summary.  
    - Mostly read-only for normal users.

  - **[Wallet]**  
    - Balances.  
    - Transfers (VOID + future assets).  
    - Contract deploy/call helpers.

  - **[NullFeed]**  
    - Embedded client for the on-chain/off-chain feed.

- Network selector:
  - devnet, safeboot (if exposed), mainnet Phase 1, future networks.
- Simple user flows:
  - “Send VOID”.
  - “Deploy contract” (with gas estimate and confirmation).
  - “View validators / staking” (later).

### 3. NullFeed integration (concept phase)

- NullFeed is treated as another module:

  - **Read**: board / channel / thread view.
  - **Write**: post / reply / image upload flow using Obelisk Wallet keys.

- Wallet responsibilities:

  - Sign posts/actions with the user’s key.
  - Handle compression + encryption when needed.
  - Route data either:
    - Directly on-chain (short posts), or
    - Via VOID’s off-chain storage + on-chain commitments.

- Navigation model:

  - From wallet UI:
    - `[NullFeed] -> [Board List] -> [Thread] -> [Post]`
  - From operator console:
    - Phase 1: diagnostics only (addresses, health, basic counts).
    - Later: admin/maintenance flows (moderation, repair jobs, etc.).

## Menu structure constraints

- All menus:

  - Nested, not a flat wall of options.
  - Extensible: new features come in as new menu entries, not redesigns.
  - Consistent between operator console and wallet UI:
    - Operator console: numbers + keyboard.
    - Wallet UI: panels + buttons, same conceptual grouping.

## Phase 1 scope

- Lock in operator console structure:

  - `ops/obelisk-console.sh` is canonical “TUI shell”.
  - Devnet + Mainnet Phase 1 menus stable and additive.

- Do **not** overbuild NullFeed UI yet:

  - Keep it as a defined module in this plan.
  - Implement real client views after VOID mainnet Phase 1 is live and stable.

## Future additions (after mainnet Phase 1)

- Add “Deploy contract” flows to:

  - Devnet menu (for rehearsal / testing).
  - Wallet UI (for mainnet users).

- Add NullFeed menu entries:

  - Operator console: diagnostics first, posting tools later.
  - Wallet UI: full client experience.

- Add Obelisk Wallet GUI:

  - Reuse the same structure and scripts under the hood where possible.
  - Keep retro feel (nested menus, clear sections) even in graphical form.
