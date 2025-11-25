# VOID Mainnet Genesis & Keys Spec (v0)

Status: draft v0  
Branch: feat/mainnet-core-20251120  
ChainId: **2050**  
Docs: this file is the top-level genesis + keys plan and ties into mainnet-core, tokenomics, and ops docs.

---

## 1. Purpose

This document defines:

- What **VOID mainnet** looks like at **genesis** (block 0 / first sealed blocks).
- How **premine, treasury, and keys** are structured and protected.
- Which **health gates** must be green before we flip the switch on chainId 2050.
- What is **in scope** for mainnet-core vs. deferred to later layers (NullFeed, etc.).

VOID core is treated as **sacred**: minimal, stable, and hardened. Changes after mainnet should be done via controlled upgrades and on-top systems, not casual rewrites of the core.

---

## 2. Network Identity

- **Network name:** VOID Mainnet  
- **ChainId:** `2050` (canonical, never reused elsewhere).  
- **Native token:** VoidStones (`$VOID`)  
- **Smallest unit:** 10^18 base units per VOID (standard ERC-20 style).

### 2.1 Canonical contracts (conceptual)

The exact addresses and deployment flow are defined in the tokenomics + contracts docs. At a high level, mainnet expects:

- `VoidToken` — ERC-20 style base asset for VOID.
- `VoidTreasury` — contract-based treasury that holds the premine and anchors long-term funds.
- `VoidOpsTreasury` — operational treasury that receives controlled flows from `VoidTreasury`.
- `ValidatorSet` / staking contracts — control validator set and rewards.
- `UpdateGate` — controls protocol-level upgrades to core.
- `ConfigGate` — controls configuration switches and safety toggles.
- `JobQueue` — job posting for agents and AI workloads (already used on devnet).
- `ReceiptRegistry` — receipt record of work done by agents.
- `ModelRegistry` — registry of AI models available to agents.
- `DatasetRegistry` — registry of datasets.
- `AgentRegistry` — registry of agents.

Genesis does **not** have to deploy every on-top product (e.g. NullFeed) but the base contracts above are expected to exist at or very near genesis so that VOID is "AI-first" from day one.

---

## 3. Premine & Supply Layout (Conceptual)

The exact numbers live in the **tokenomics spec** (separate doc). This spec defines how the premine and supply **must be wired** conceptually at genesis.

### 3.1 High-level buckets

All initial VOID supply should be allocated into **contract-based buckets**, never left sitting in a hot EOA long-term:

- **VoidTreasury (Premine Treasury)**  
  - Receives the **entire premine** from the premine EOA in a single early transaction.
  - Owns long-term reserves for:
    - Ecosystem growth and grants.
    - Validator incentives / staking rewards top-ups.
    - Future AI infrastructure and agent incentives.
    - Emergency / long-term runway.

- **VoidOpsTreasury (Ops Treasury)**  
  - Receives controlled streaming / tranche transfers from `VoidTreasury`.
  - Pays:
    - Infra costs (servers, bandwidth, storage, monitoring).
    - Engineering, ops, and security expenses.
    - Bounties and operational rewards.

- **Other controlled pools** (as defined in tokenomics doc):
  - Community / airdrop allocations.
  - Strategic partnerships.
  - Validator bootstrap programs.
  - Any special-purpose funds (e.g., AI research pool).

### 3.2 Rule: Premine EOA is one-shot

- A **single premine EOA** can be used to fund the initial `VoidTreasury` and any other required genesis-time contracts.
- After its job is done, **all significant funds must live in contracts** (`VoidTreasury`, `VoidOpsTreasury`, etc.), not that EOA.
- The premine EOA is then **effectively retired**:
  - No day-to-day spending.
  - No use as a hot wallet.
  - Only kept for cryptographic proofs if absolutely needed.

---

## 4. Keys & Governance Structure

This section locks in the **key and governance shape** we will enforce before mainnet.

### 4.1 Core roles

1. **Premine Key**
   - Purpose: one-shot funding transaction(s) to seed `VoidTreasury` and other initial contracts.
   - Lifetime:
     - Generated offline.
     - Used once at or near genesis.
     - Then **retired** (never used as a hot wallet).
   - Storage:
     - Seed/keys stored on a **LUKS-encrypted USB** and/or hardware wallet.
     - No plain-text copies on online machines.

2. **AdminGate Master Key / Signer Set**
   - Purpose: controls **AdminGate**, which in turn controls:
     - System-level administration for core contracts.
     - Adding/removing secondary admin signers.
   - Requirements:
     - Never a single-person forever-key; must be a **rotatable signer set**.
     - Implemented as a multi-sig or similar pattern.
     - Keys/seed material stored on **hardware wallets** and/or LUKS-encrypted storage, not laptops.

3. **UpdateGate Signers**
   - Purpose: control **protocol upgrades**, config changes with on-chain impact.
   - Requirements:
     - Independent from day-to-day ops.
     - Rotatable and governed by clear process (e.g., on-chain vote or multi-sig policy).
     - Strong separation between:
       - People who write code.
       - People who approve upgrades.
       - People who operate validators.

4. **Ops Hot Wallets**
   - Purpose: small, limited-balance wallets used to pay routine expenses.
   - Funding flow:
     - `VoidTreasury` → `VoidOpsTreasury` → **Ops hot wallets** (small, replenished as needed).
   - Rule:
     - Hot wallets should **never** hold a significant fraction of supply.
     - Loss of one hot wallet must be survivable without threatening the network.

---

## 5. Storage & Backup Plan

Before mainnet, we must have:

1. **LUKS-encrypted USB(s)**:
   - At least one USB drive with:
     - Premine key (if still needed for historical reasons).
     - AdminGate/UpdateGate signer seed backups.
     - Any one-shot genesis keys.
   - Recommended:
     - 2–3 copies stored in different safe locations.

2. **Hardware Wallets**
   - Where supported, critical signers (AdminGate, UpdateGate, Treasury multi-sigs) should be hosted on hardware wallets.
   - Seed phrases only stored offline with strong operational discipline.

3. **No devnet/mainnet key reuse**
   - **Hard rule:** devnet keys are **never** reused on mainnet.
   - Mainnet gets **fresh, never-used keys** for:
     - Premine.
     - Treasury.
     - AdminGate / UpdateGate.
     - Validator operators (as needed).

---

## 6. Genesis State Requirements

At or near block 0, mainnet must satisfy:

1. **VoidToken deployed**
   - Total supply and decimals defined per tokenomics spec.
   - Ownership / admin roles tied into AdminGate/ConfigGate as appropriate.

2. **Treasury contracts ready**
   - `VoidTreasury` deployed and funded by premine EOA.
   - `VoidOpsTreasury` deployed and wired to receive controlled flows from `VoidTreasury`.

3. **Gates wired**
   - `AdminGate` and `UpdateGate` deployed.
   - Initial signer sets configured with:
     - Clear policy for rotations.
     - Multi-sig or equivalent guardrails.

4. **AI / Agent core contracts**
   - `JobQueue`, `ReceiptRegistry`, `ModelRegistry`, `DatasetRegistry`, `AgentRegistry`:
     - Deployed, configured, and able to be called by agents.
     - Admin roles tied into AdminGate/UpdateGate as appropriate.
   - This ensures mainnet is **AI-first from day one**, not bolted on later.

5. **Validator and consensus configuration**
   - `ValidatorSet` or equivalent contract(s) configured:
     - Initial validators and stakes.
     - Reward parameters.
     - Any slashing / penalty parameters.

6. **Genesis manifest**
   - A machine-readable genesis manifest (JSON or CBOR) that includes:
     - chainId (2050).
     - List of initial validators + weights.
     - Addresses and roles of all core contracts.
     - Hashes of key config files and parameters.
   - Node startup should validate this manifest (as per VOID chain design goals) before participating.

---

## 7. Launch Health Gates (Pre-Mainnet Checklist)

Mainnet should not launch (or should not be considered "open to the world") unless the following are green and stable:

1. **Core health**
   - `void_mainnet_core_health == 1` (recording rule).
   - txroot + header3 + seals exporters all indicate:
     - `void_txroot_health == 1`
     - Header roots match computed roots.
     - Seals pipeline healthy and advancing.

2. **Last-mile health**
   - `void:mainnet_lastmile:health:last_5m == 1`
   - Last non-empty block gap within target (e.g. `<= 5` blocks under normal usage).

3. **Pillars health**
   - `void:mainnet_pillars:health:last_5m == 1` (or equivalent)
   - Safeboot, devnet, and mainnet-core health gauges all at 1.
   - Safeboot head reasonably close to mainnet head (gap monitored and bounded).

4. **Monitoring & SLOs**
   - Prometheus and Grafana up and scraping:
     - Core node.
     - Safeboot node(s).
     - Mainnet pillars exporters.
   - SLO-style alerts:
     - Proposer uptime above target thresholds (1h, 24h).
     - Txroot/header3/seals integrity health.
     - Pillars all green for sustained windows (e.g. 24h).

If any of these are failing, the network should be treated as **not ready** for public mainnet launch.

---

## 8. Non-Goals for Genesis

The following are **explicitly** out of scope for genesis and can come after mainnet is live, assuming the above structure is in place:

- NullFeed full deployment and UI.
- Full website frontends and marketing stack.
- Additional AI products built on top of VOID nodes.
- Any experimental features that risk core stability.

Genesis is about:

- A clean core.
- A safe treasury and key structure.
- AI-first contracts ready to use.
- Monitoring and SLOs that keep us honest.

---

## 9. Next Steps After This Spec

1. Fill in exact tokenomics numbers and link this spec to the tokenomics doc.
2. Finalize the list of contracts and addresses for genesis.
3. Implement the key and treasury plan in real hardware (LUKS USB, hardware wallets).
4. Bake the health gates into:
   - Pillars scripts.
   - Prometheus rules.
   - Alerting policies.

Once those steps are done and enforced, VOID mainnet on chainId 2050 can move from "design" to "launch execution" with a clear, written plan.
