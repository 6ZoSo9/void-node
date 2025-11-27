# VOID Network – Validator Onboarding (v1)

This document explains how validators plug into VOID mainnet in v1:

- **VoidToken** – the mainnet VOID ERC-20.
- **VoidTreasury** – cold premine treasury.
- **OpsTreasury** – hot operational treasury.
- **ValidatorSet** – on-chain view of the active validator set and voting power.
- **RewardEngine** – emissions budget + per-validator reward accrual/claims.

It is aligned with:

- `docs/VOID-TOKENOMICS-SPEC-V1.md`
- `docs/VOID-EMISSIONS-SCHEDULE.md`
- `docs/VOID-MONETARY-SPEC-V1.md`
- `docs/VOID-VALIDATOR-SET-SPEC-V1.md`
- `docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md`
- `docs/VOID-MAINNET-GENESIS-SPEC.md`
- `docs/VOID-MAINNET-GENESIS-PLAN.md`

This file is for **human validators** and future **AI/agent validators** who want to operate nodes and receive emissions.

---

## 1. Roles and moving pieces

At a high level, validator rewards work like this:

1. **Tokenomics & emissions**
   - MAX_SUPPLY = 666,666,666 VOID
   - PREMINE (Treasury) = 333,333,333 VOID
   - EMISSIONS (for validators / long-term incentives) = 333,333,333 VOID across 4 eras.
   - Emission curve is locked in `docs/VOID-EMISSIONS-SCHEDULE.md` and `docs/VOID-EMISSIONS-PARAMS-V1.json`.

2. **Treasury layout**
   - **VoidTreasury** holds the premine (cold, slow, long-term).
   - **OpsTreasury** is a smaller, hot wallet for vendors, grants, ops costs.
   - Premine **does not** go to validators; validators are paid from the emissions budget via RewardEngine.

3. **ValidatorSet**
   - On-chain contract that implements `IValidatorSetLike`:
     - `getActiveValidators()`
     - `getValidators()`
     - `getVotingPower(address)`
     - `totalPower()`
   - v1: a single **admin** address adjusts powers; later this can be wired to staking / governance.

4. **RewardEngine**
   - Holds an **emissions budget** that matches the tokenomics spec.
   - Tracks how much has been **pulled** from the budget and how much each validator can **claim**.
   - Allocates pulled emissions pro-rata to the active validator set by `votingPower / totalPower`.

5. **void-node (core chain)**
   - Tracks consensus, blocks, and metrics.
   - Uses Prometheus/SLOs to enforce:
     - mainnet-core health
     - last-mile health
     - tokenomics health
     - tokenomics spec health (metrics must match the locked numbers)

Genesis + ops docs tie these pieces together; this file is the validator-facing slice.

---

## 2. Validator key model (v1)

For v1 mainnet, a validator is expected to have **at least two distinct keys**:

1. **Node / consensus key**
   - Used by `void-node` for P2P identity and consensus.
   - This is *not* the same as your reward wallet.
   - Lives on the validator machine (or HSM) and is rotated per ops policies.

2. **Reward address (VOID EVM wallet)**
   - An EOA or contract on the VOID EVM chain.
   - Receives validator rewards from `RewardEngine` via `claim` calls.
   - Can be:
     - A simple EOA controlled by a hardware wallet, or
     - A multi-sig / cold wallet for higher security.

In some phases we may also have:

3. **Admin / governance keys (not for normal validators)**
   - Controlled by the core team / governance / founder trust.
   - Used to update:
     - `ValidatorSet` admin (rotation).
     - Emissions budget parameters in `RewardEngine` (if designed to be adjustable).
     - Treasury admin addresses.
   - These are **not** validator keys and are handled separately in `docs/VOID-MAINNET-KEYS-PLAN.md`.

Validators should treat the **node key** as operational and the **reward address** as treasury-grade.

---

## 3. What it means to be a validator (v1)

A validator in VOID mainnet v1:

- Runs `void-node` (or equivalent client) with:
  - A stable, low-latency network connection.
  - SSD-backed storage.
  - Sufficient CPU/RAM to keep up with mainnet and agent workloads.
- Is listed in `ValidatorSet` with a **voting power > 0**.
- Has a **reward address** registered via whatever on-chain or off-chain process governance defines.
- Is monitored via Prometheus/Grafana:
  - Head liveness.
  - Last-mile health (non-empty blocks, tx sealing).
  - Validator-specific SLOs (uptime, missed duties, etc. — future phases).

v1 intentionally keeps control simple: `ValidatorSet` is admin-managed. Production staking / slashing can be layered in later without changing the `IValidatorSetLike` interface.

---

## 4. How rewards flow (validator point of view)

From a validator’s point of view, the reward flow looks like this:

1. **Emissions budget**
   - `RewardEngine` is configured with an emissions budget equal to the locked EMISSIONS value (333,333,333 VOID, scaled to 18 decimals).
   - A privileged admin (not normal validators) periodically calls:
     - `pullEmission(amount)`
   - Invariant:
     - `totalPulled + amount <= emissionsBudget`
     - `totalClaimed <= totalPulled`

2. **Allocation to validators**
   - On each accounting step/interval, RewardEngine:
     - Reads `active = getActiveValidators()` from `ValidatorSet`.
     - Reads `total = totalPower()` and `power[v] = getVotingPower(v)` for each active validator.
     - Allocates the pulled amount proportionally:
       - `share[v] ≈ amount * power[v] / total`.
   - Each validator accumulates a **claimable balance** inside RewardEngine.

3. **Claiming**
   - A validator (or an operator on their behalf) calls:
     - `RewardEngine.claim()` from their reward address, or
     - A helper (if present) that claims for specific validators.
   - RewardEngine transfers the accrued VOID to the validator’s reward address and zeroes out their internal balance.
   - Double-claiming is prevented by the accounting.

4. **Monitoring & safety**
   - Prometheus spec gauges enforce that:
     - Budget matches tokenomics spec.
     - Pulls never exceed budget.
   - Additional metrics track:
     - Total emitted to validators.
     - Total remaining budget / headroom.
     - Per-validator claimed totals (future: can be exposed via events/metrics dashboards).

In v1, **no premine** flows to validators. All validator income comes from the emissions budget over time.

---

## 5. Joining the validator set (conceptual v1 flow)

The exact onboarding flow will be finalized closer to mainnet and may be wrapped in tooling / UI. Conceptually, it looks like this:

1. **Prepare hardware and OS**
   - Linux (x86_64), recent LTS (e.g. Ubuntu 24.04).
   - SSD storage sized for:
     - VOID core chain data.
     - Future EVM/agent workloads.
   - Reliable network (wired if possible).

2. **Generate keys**
   - Generate a node key for `void-node`.
   - Generate a VOID EVM wallet for your reward address (preferably hardware-backed).

3. **Sync a node**
   - Install `void-node` from the official release channel.
   - Configure:
     - P2P port, HTTP port.
     - Data directory on SSD.
     - Bootstrap peers (seed nodes published by VOID).
   - Start the node and let it sync to the mainnet head.

4. **Register as a validator**
   - Through the governance/ops process, your validator address and reward address are:
     - Added to `ValidatorSet` with an initial `votingPower > 0`, or
     - Updated from `votingPower = 0` (inactive) to a non-zero power.
   - The admin process for this (multi-sig, governance proposal, etc.) is described in the governance/keys docs and may evolve over time.

5. **Confirm visibility**
   - Use on-chain calls / explorer to confirm:
     - Your address is in `ValidatorSet.getValidators()`.
     - `getVotingPower(yourAddress) > 0`.
   - Check any public dashboards that show:
     - Active validator set.
     - Your node’s participation and rewards.

6. **Operate & claim**
   - Keep the node online, updated, and monitored.
   - At intervals, claim rewards from RewardEngine into your reward wallet.
   - Follow ops guidance for:
     - Upgrades (UpdateGate/ConfigGate).
     - Key rotation (when supported).
     - Incident handling (slashing / misbehavior rules in future versions).

---

## 6. Invariants validators should care about

Validators don’t control tokenomics, but they should understand the invariants that protect them and the network:

1. **Supply cap**
   - MAX_SUPPLY is hard-locked at 666,666,666 VOID.
   - PREMINE + EMISSIONS == MAX_SUPPLY by design.
   - Monetary spec + metrics ensure we never mint above the cap.

2. **Emissions budget**
   - `RewardEngine` emissionsBudget == EMISSIONS from the tokenomics spec.
   - totalPulled and totalClaimed are always ≤ emissionsBudget.

3. **ValidatorSet sanity**
   - `totalPower()` matches the sum of voting power over `getValidators()`.
   - `getActiveValidators()` is exactly those with `votingPower > 0`.

4. **Reward fairness**
   - Over any interval, your share is proportional to your voting power relative to totalPower.
   - Any future slashing / penalties will be specified explicitly and exposed via metrics/events.

If any of these invariants are violated in production, the network is considered to be in an unsafe state and core operators will treat it as an incident.

---

## 7. Status and evolution

**As of 2025-11-26 (v1 docs):**

- Tokenomics, emissions schedule, and monetary spec are locked in the docs.
- VoidTreasury, OpsTreasury, ValidatorSet, and RewardEngine contracts exist with Foundry tests.
- Prometheus spec gauges validate that exported tokenomics constants match the locked spec.

This onboarding doc is **v1** and focuses on concepts rather than exact CLI flags. As we get closer to mainnet:

- We will add:
  - Concrete CLI examples for running `void-node` in validator mode.
  - Exact steps for registering in ValidatorSet.
  - Sample Prometheus/Grafana dashboards for validator operators.
- Any changes will preserve:
  - MAX_SUPPLY and EMISSIONS invariants.
  - The separation between premine (treasuries) and validator emissions.
  - The `IValidatorSetLike` interface used by consensus and RewardEngine.

