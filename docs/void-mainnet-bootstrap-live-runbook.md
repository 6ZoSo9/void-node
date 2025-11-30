# VOID Mainnet Bootstrap – LIVE Runbook (SKELETON, DO NOT USE YET)

> **STATUS: SKELETON ONLY – DO NOT USE FOR REAL MAINNET YET**
>
> This document defines the *shape* of the future live bootstrap process for
> VOID mainnet (chainId 2050), but it is **not complete** and **must not be
> followed on a real network** until:
>
> - All council signers, keys, and multisigs are finalized.
> - All addresses are stable and verified on L1.
> - The PLAN pillar is green (plan_health == 1).
> - This file is explicitly marked as READY in a later version.

This doc is meant for the day we actually broadcast the mainnet bootstrap
transactions, not for today.

For now, treat this as a design skeleton tied to:

- docs/void-mainnet-keys-blueprint.md
- docs/void-mainnet-custody-plan-v0.md
- docs/void-mainnet-bootstrap-operator-runbook.md
- docs/void-mainnet-bootstrap-plan.md (and related PLAN docs)

---

## 0. Scope and responsibility

**Network:** VOID mainnet (chainId 2050)  
**Goal:** Execute the one-time *genesis bootstrap* script (or equivalent flow)
safely on real mainnet, wiring:

- UpdateGate / AdminGate / ConfigGate
- ValidatorSet
- VoidToken
- Premine vault / VoidTreasury / OpsTreasury
- RewardEngine
- Validator0 (reward + consensus key)
- Tokenomics invariants (premine, emissions schedule anchor, etc.)

**Out of scope here:**

- Any post-bootstrap governance changes via UpdateGate / AdminGate / ConfigGate.
- Any post-genesis validator or staking changes beyond validator0 bring-up.
- NullFeed, agents, or higher-layer contracts.

---

## 1. Hard preconditions (must be true before even thinking about LIVE)

These are **hard gates**. If any are false, you do **not** run the live bootstrap.

### 1.1 Metrics / health gates

All of the following must be true on Prometheus for at least a stable window
(e.g. 30–60 minutes):

- `void:mainnet_overall:health:last_5m_v2 == 1`
- `void:mainnet_pillars:health:last_5m == 1`
- `void:mainnet_lastmile:health:last_5m == 1`
- `void_safeboot_overall_health == 1`
- `void:mainnet_bootstrap_plan:health:last_5m == 1`

In other words:

- Core node + last-mile + safeboot are healthy.
- Tokenomics pillar is healthy.
- PLAN pillar is green (plan_health == 1).

If PLAN is still red (`plan_health == 0`), this runbook is **not** allowed to
progress. Go back to the PLAN operator runbook and fix that first.

### 1.2 Keys and custody

The following must be *factually true in reality* (not just on paper):

- Council hardware wallets exist and are in the right hands, per:
  - docs/void-mainnet-keys-blueprint.md
  - docs/void-mainnet-custody-plan-v0.md
- The following roles are mapped to *real* signers and devices:
  - CORE_COUNCIL_MSIG (3-of-5 or as finalized)
  - TREASURY_COUNCIL_MSIG
  - OPS_MSIG
  - DEPLOYER_MAINNET
  - VAL0_REWARD
  - VAL0_CONSENSUS (validator0 consensus key)
- Each signer has:
  - Their device physically present.
  - A tested path to sign an Ethereum transaction on the target mainnet.
  - Agreed ceremony rules (no one is signing alone in the dark).

If any of this is still theoretical, stop. Fix keys and custody first.

### 1.3 PLAN JSON and invariants

The live PLAN file must already be:

- Present: `config/void-mainnet-bootstrap-mainnet.live.json`
- Git-ignored (never committed).
- Fully populated with real L1 addresses for:
  - `.roles.*` (no critical zeros)
  - `.contracts.*` (no critical zeros)
  - `.validator0.*` (reward + consensusKey + stakeVOID)

And the following commands must all succeed and report READY:

- `./ops/void-mainnet-bootstrap-mainnet-plan-smoke.sh`
- `./ops/void-mainnet-bootstrap-plan-sim.sh`
- `./ops/void-mainnet-bootstrap-plan-rehearsal.sh`
- `./ops/void-mainnet-bootstrap-plan-health-all.sh`

If `plan_health` is not 1, or simulators complain about missing roles/contracts,
this runbook is **not** allowed to proceed.

---

## 2. Final rehearsal on anvil (exact config freeze)

Before touching live mainnet, we must prove:

1. The *exact same shape* of config works on a dev chain (anvil-2050).
2. The operator knows the full script trace and side-effects.

### 2.1 Clone the PLAN for dev rehearsal

On the operator machine:

- Copy the *shape* of `.live.json` into a dev config file
  (for example `config/void-mainnet-bootstrap-mainnet.dev-final.json`),
  replacing addresses with dev equivalents.  
- This ensures:
  - Same roles layout.
  - Same contracts set.
  - Same validator0 layout.

This step is deliberately vague until we lock the exact script interface and
final contract set. Future versions of this doc will spell out the keys.

### 2.2 Run full dev bootstrap rehearsal

Using the dev bootstrap harness (see existing dev bootstrap docs), run a
*full end-to-end* rehearsal with the dev config:

- Deploy gates, validator set, void token, treasuries, reward engine.
- Move premine to VoidTreasury.
- Wire OpsTreasury / RewardEngine.
- Run validator0 onboarding.

Then:

- Verify invariants via the dev bootstrap health scripts.
- Manually check a few critical contracts on dev (ownerships, thresholds).

If any part of this fails, do **not** progress to mainnet.

---

## 3. LIVE mainnet bootstrap flow (outline only)

> **WARNING:** This section is intentionally incomplete.  
> It will be filled in when:
>
> - The final script interface is frozen.
> - Real mainnet RPC details, gas strategy, and multi-sig flow are confirmed.
> - Council has agreed on ceremony details.

### 3.1 Ceremony setup (humans in a room)

At a high level, we expect something like:

- At least 2–3 trusted operators physically present.
- At least the required threshold of signers for each involved multisig
  reachable (physically or via secure remote).
- A dedicated machine for:
  - Running the bootstrap harness.
  - Talking to the hardware wallets (or multi-sig UI) for DEPLOYER_MAINNET
    and councils.

Details (room setup, airgaps, recording, etc.) will be defined later.

### 3.2 Dry-run “call generation” against mainnet RPC

The bootstrap harness will have a **no-broadcast** mode which:

- Reads `config/void-mainnet-bootstrap-mainnet.live.json`.
- Constructs the full transaction(s) needed to perform the bootstrap.
- Prints:
  - Target addresses.
  - Function signatures.
  - Encoded calldata.
  - Expected side-effects.

Operators will inspect this output and cross-check against the design docs.

### 3.3 Actual broadcast (NOT SPECIFIED YET)

This subsection will eventually spell out:

- Exact commands (e.g. `forge script ... --broadcast` or custom harness).
- Expected number of transactions.
- Required signatures from which multisigs.
- Rollback / abort strategy if something goes wrong mid-ceremony.

For now, this is **intentionally left as a stub** to avoid accidental
“copy/paste → mainnet nuke” incidents.

---

## 4. Post-bootstrap verification

Once we *do* have a real flow, we will require a full verification checklist,
including but not limited to:

- Contract addresses on mainnet match `.live.json`.
- Ownership of gates, treasuries, and validator set match custody plan.
- Premine and emissions anchors match tokenomics spec.
- Validator0 is live and receiving rewards correctly.
- All mainnet health metrics remain green after N blocks post-bootstrap.

This checklist will be drafted when we’re closer to mainnet and have
fully frozen contract code + interface.

---

## 5. Change control and versioning

This file is part of the mainnet-critical documentation set.

Rules:

- Do **not** delete historical runbook versions.
- Meaningful changes should:
  - Be committed with clear messages.
  - Receive a `ckpt-...` tag.
- Before marking this document as READY, we will:
  - Freeze core contracts (v99 or equivalent).
  - Freeze UpdateGate / AdminGate / ConfigGate semantics.
  - Cross-check with legal, governance, and security reviews.

Until then, this remains a **skeleton only**.
