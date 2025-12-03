# Obelisk Wallet — MVP Spec (Phase 1)

Status: DRAFT (Phase 1 mainnet-ready, wallet still CLI-only)
Chain: VOID (chainId 2050)

This doc defines the **first usable version** of Obelisk Wallet that we will actually ship and dogfood on VOID mainnet Phase 1. It’s deliberately small and biased toward **reliability + security** over features.

---

## 1. Scope for Phase 1

**Goal:** Give a single operator (you) a clean way to:

- Hold and move VOID (VoidStones).
- Interact with core VOID contracts:
  - VoidToken
  - VoidTreasury / OpsTreasury
  - RewardEngine
  - ValidatorSet (for validator0)
- Observe balance, pending rewards, and basic validator status.
- Do everything **without** depending on SaaS infra or random third-party wallets.

Phase 1 is **solo validator mainnet**:
- 1 validator (validator0), staked according to `config/void-mainnet-bootstrap-mainnet.live.json`.
- You run the only validator + safeboot node.
- Wallet UX can assume a **power user on Linux** with access to your local nodes and /mnt/voidkey.

---

## 2. Tiers in this phase

Long-term we have three tiers:

1. **Obelisk Lite (browser extension)**
2. **Obelisk Mobile (Android/iOS)**
3. **Obelisk Titan (desktop heavy wallet)**

For **Phase 1**, we only care about:

- A **CLI-based Obelisk “proto-wallet”** that uses:
  - `cast` / `forge` + small shell wrappers, or
  - a minimal Node/TypeScript CLI that talks to your local VOID RPC.
- Design choices that make it easy to later wrap this logic into:
  - Titan (desktop app) and
  - Lite/Mobile frontends.

Think of Phase 1 as: **“Obelisk Titan Core (headless)”**.

---

## 3. Environments

We will treat wallets as talking to one of:

- **devnet (“Dead Zone”)**
  - RPC: http://127.0.0.1:8545 (anvil/foundry devnet)
  - Contracts: from `docs/VOID-DEVNET-PROTOCOL-STATE.json`
  - Purpose: agent/JobQueue experiments and protocol iteration.

- **mainnet (Phase 1, solo validator)**
  - RPC: `MAINNET_RPC_URL` (will be your real VOID node / a public endpoint)
  - Contracts + roles: from `config/void-mainnet-bootstrap-mainnet.live.json`
  - Keys: from `/mnt/voidkey` (LUKS-encrypted stick, NEVER in the repo).

For now, **Obelisk MVP must at minimum support**:

- `--network devnet`
- `--network mainnet-phase1`

---

## 4. Core wallet operations (MVP)

These are the **hard requirements** for the MVP:

### 4.1. Account & key handling

Phase 1 assumptions:

- Keys are generated and stored by your existing key ceremony (LUKS stick).
- Obelisk Wallet CLI **does not** generate or export keys.
- It only:
  - Reads **public addresses** from a mapping (for READ operations).
  - Uses external signing (hardware / `cast send --private-key` or a small signer helper) for WRITE ops.

Minimal operations:

1. **List known roles for mainnet** (read from live JSON + roles mapping):
   - deployer
   - treasuryAdmin / opsTreasuryAdmin
   - validatorAdmin
   - adminGateOwner / updateGateOwner / configGateOwner
   - treasuryOwner / opsTreasuryOwner / rewardEngineOwner / validatorSetOwner

2. **Show public addresses** for:
   - `wallet account list --network mainnet-phase1`
   - Output: role, address, notes (cold/hot, allowed scope).

We explicitly **do not** bake private keys into Obelisk in Phase 1.

---

### 4.2. Basic VOID balance + transfer

Required flows:

1. **View VOID balance**:
   - `wallet balance <address> --network {devnet|mainnet-phase1}`
   - Under the hood: ERC-20 `balanceOf`.

2. **Send VOID**:
   - `wallet send <from-role> <to-address> <amount-void> --network ...`
   - Phase 1: driven by an external signer (e.g., `cast send` or a small TS signer that reads a key from `/mnt/voidkey` when explicitly pointed to it).
   - CLI prints:
     - from role + address
     - to address
     - amount (in VOID and raw wei)
     - tx hash and status.

We can keep this ugly at first; correctness > polish.

---

### 4.3. Validator0 status & rewards (Phase 1)

We want **one comfort panel** to see if your solo validator is actually alive.

Operations:

1. **Show validator0 status**:
   - `wallet validator status --network mainnet-phase1`
   - Pulls:
     - validator0 address + consensusKey + stakeVOID from the live JSON.
     - On-chain view from `ValidatorSet`:
       - isActive / jailed / stake / maybe lastRewardEpoch.
     - Node metrics (optional later): head, last sealed, last non-empty gap.

2. **Show validator rewards position** (READ ONLY for MVP):
   - `wallet validator rewards --network mainnet-phase1`
   - Reads RewardEngine/EmissionsController view functions:
     - total allocated to validator0,
     - claimed vs unclaimed (if available).

Write operations (claiming rewards, restaking, etc.) can be **Phase 2**, but we should design the CLI interface now so we don’t break it later.

---

### 4.4. Treasury visibility (READ ONLY for Phase 1)

We don’t want to move treasury funds casually yet, but we want visibility.

MVP read operations:

- `wallet treasury info --network mainnet-phase1`
  - Show:
    - VoidTreasury address
    - OpsTreasury address
    - Treasury VOID balance
    - OpsTreasury VOID balance
    - Any basic config (if exposed via view functions).

Write operations like `treasury -> ops -> hot` are intentionally **not part of Phase 1 UI** beyond low-level `cast` usage.

---

## 5. Implementation strategy (Phase 1)

### 5.1. CLI shape

We’ll use a staged approach:

**Stage A — Shell wrappers + cast (fastest, good enough):**

- Add an `ops/obelisks/` directory with simple scripts:
  - `obelisk-balance.sh`
  - `obelisk-send.sh`
  - `obelisk-validator-status.sh`
  - `obelisk-treasury-info.sh`

These will:

- Read config from:
  - `config/void-mainnet-bootstrap-mainnet.live.json` (mainnet roles, contracts).
  - `docs/VOID-DEVNET-PROTOCOL-STATE.json` (devnet addresses).
- Call `cast call` / `cast send` with the right ABI signatures.

**Stage B — Minimal TS CLI (“obelisk-cli”):**

- A Node/TypeScript script (single file to start) that:
  - Uses `ethers` or a minimal JSON-RPC client.
  - Reads the same JSON config files.
  - Exposes nicer commands but still keeps all key material external.

Stage B can come after we’re happy with Stage A.

---

## 6. Security posture (Phase 1)

Design rules:

1. **No hot storage of premine / treasury keys in Obelisk.**
   - Those keys live on LUKS and/or hardware wallets, and are used in tightly controlled ceremonies only.

2. **Minimal signing scope in the wallet:**
   - For Phase 1, Obelisk can be allowed to sign:
     - Validator0 maintenance txs (claim rewards, rotate gossip key later).
     - Regular user transfers from a “hot” Ops wallet (when we actually have one).

3. **Explicit “danger mode” for any treasury / governance actions:**
   - Even if we add those later, they must be:
     - Separate commands.
     - Loudly documented.
     - Guarded by extra confirmations.

4. **No third-party RPC or infra by default.**
   - Default endpoints are your local VOID nodes or your own public endpoints.

---

## 7. Roadmap out of Phase 1

After Phase 1 mainnet is live and stable:

- **Phase 2: Multi-validator & remote users**
  - Add support for multiple validator accounts.
  - Ship a read-only Obelisk Lite (browser extension) that:
    - Connects to public VOID RPC.
    - Shows balances / tx history.
    - Signs simple txs using browser-managed keys (for non-treasury roles).

- **Phase 3: Mobile validator (Obelisk Mobile)**
  - Light client or semi-light mode on phone.
  - Staking interface for regular users.
  - Push notifications for rewards / slashing risk.

- **Phase 4: Full Titan**
  - Desktop app wrapping:
    - VOID node control.
    - Validator status + rewards dashboards.
    - Agent/JobQueue tooling.
  - Integrates with your Prometheus/Grafana metrics.

For now, Phase 1’s job is simple: **you can safely operate VOID mainnet and see your balances + validator status without drowning in raw `cast` calls.**
