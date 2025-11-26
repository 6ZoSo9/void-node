# VOID Network – Mainnet Phases (v1)

This file defines the high-level phases from where we are **today** to
**VOID mainnet (chainId 2050)**. It ties together:

- void-node (consensus, storage, networking, monitoring)
- Core contracts (governance, AI stack, token, validator set)
- Tokenomics (supply cap, premine, emissions, validator rewards)
- Ops / observability / safeboot / master key design

It is *descriptive*, not executable, but other specs MUST NOT contradict it.

---

## Phase 0 – Devnet (NOW)

Goal: single-operator devnet proving VOID is actually alive and stable.

Requirements (we already have most of this):

- Node:
  - Single main proposer node, stable head growth, txroot/header/seals exporters.
  - WAL / SegStore solid, no corruption under normal use.
  - Safeboot routes proven (header3, txroot, seals, proposer, head).
  - Monitoring: Prometheus + Grafana dashboards and alerts green.

- Contracts:
  - Core governance + AI stack deployed on a local EVM chain (anvil or similar):
    - AdminGate, ConfigGate, UpdateGate
    - JobQueue, AgentRegistry, ModelRegistry, DatasetRegistry, ReceiptRegistry
    - ValidatorSet
    - VoidToken (cap 666,666,666; premine 333,333,333; cap-enforced mint).

- Tokenomics:
  - Emissions schedule modeled and captured:
    - MAX_SUPPLY = 666,666,666 VOID
    - PREMINE   = 333,333,333 VOID
    - REMAINING_EMISSIONS = 333,333,333 VOID
  - emissions_v1 helpers + validator_rewards_v1 helpers implemented in void-node.
  - Emissions sanity reports stored under docs/ (we have 2025-11-14).

- CI / Tooling:
  - Foundry build + test CI green for all core contracts.
  - void-node builds + passes basic TypeScript/Node tooling.
  - Git hooks + CI guards for large files and ops configs.

Exit criteria for Phase 0:

- One node runs for days without manual babysitting.
- All contract tests pass in CI.
- Emissions model matches docs and sanity script.
- There is a **tagged checkpoint** capturing “Contracts v1 + Tokenomics v1” (done).

---

## Phase 1 – Public Testnet (single-validator, then small set)

Goal: external users can connect light/full nodes, submit txs, and interact
with the AI stack and VoidToken on a **public** testnet.

Additional requirements on top of Phase 0:

- Node / Consensus:
  - Integrate emissions_v1 + monetary_state_v1 into block production:
    - Each sealed block has a deterministic block reward for the proposer.
    - totalMinted never exceeds MAX_SUPPLY in node state.
  - Implement minimal validator reward wiring:
    - Even if v1 is single-operator, there is a clear coinbase/reward address.
    - Export metrics for per-block reward, cumulative minted, and distance to cap.

- Validators:
  - ValidatorSet is wired into node config:
    - v1: manual, MasterKey-managed validator set is acceptable.
    - Node respects active/inactive flags and stake weights (even if stake is mocked).
  - At least:
    - 1 proposer (you),
    - 1 follower node,
    - later a second external validator run by a trusted friend/tester.

- Contracts / AI Stack:
  - Deployed on a testnet EVM (could be VOID’s own EVM engine or an L2 for now).
  - End-to-end agent flow works (off-chain agents reading JobQueue and writing receipts).

- Monitoring / Ops:
  - Public testnet has:
    - Node exporter + void-node exporters.
    - Basic alerting for:
      - proposer stalled,
      - head drift,
      - txroot/seals/header mismatches,
      - emissions health (void_txroot_health and monetary_state health).
  - Safeboot procedures documented and tested.

- Keys:
  - MasterKey and AdminGate / ConfigGate / UpdateGate flows are tested:
    - Can upgrade config pointers.
    - Can rotate signers / sign manifests.
  - Cold backup (KEY2) verified and stored offline.

Exit criteria for Phase 1:

- External wallets / scripts can:
  - Submit txs,
  - Post jobs,
  - Register agents/models/datasets,
  - Get receipts back.
- At least two independent machines run validators and stay in consensus.
- Emissions metrics show continuous, capped reward minting over time.

---

## Phase 2 – Mainnet 1 (VOID chainId 2050)

Goal: turn on **real VOID** with permanent economic value.

Additional requirements on top of Phase 1:

- Economics / Token:
  - VoidToken mainnet tokenomics exactly match:
    - MAX_SUPPLY = 666,666,666
    - PREMINE    = 333,333,333
    - Remaining emissions wired to validator rewards.
  - Genesis allocation and premine addressed in VOID-MAINNET-GENESIS-PLAN.md.
  - Emissions schedule and reward split frozen as v1 in docs + code.

- Validators / Staking:
  - ValidatorSet + (future) staking/validator-management contracts documented.
  - Initial validator set selected, with clear on-call / ops responsibilities.
  - Slashing / penalties (if v1 includes them) clearly specified and tested,
    or explicitly deferred to v2 with conservative safeguards now.

- Security / Governance:
  - UpdateGate, AdminGate, ConfigGate live on mainnet with:
    - MasterKey under hardware-protected storage (void-gate USB design).
    - M-of-N Update Signers process documented (who, how, and when).
  - Threat model documented:
    - What MasterKey can and cannot do.
    - How users can safely participate without trusting you blindly.

- Ops / Monitoring:
  - Production-grade Prometheus + Grafana stack:
    - Health dashboards for head, proposer, txroot, seals, emissions, validators.
    - Alerts for all critical failure modes (stall, drift, key/void-gate issues).
  - Runbooks for:
    - Node recovery,
    - Safeboot,
    - Protocol upgrade via UpdateGate,
    - Handling forks / chain halts.

- AI-Centric Features:
  - ModelRegistry, DatasetRegistry, AgentRegistry, JobQueue, ReceiptRegistry:
    - Deployed and wired into the reference agent infra.
    - At least one “official” VOID agent running, exercising the full path:
      JobQueue -> Off-chain agent -> ModelRegistry/DatasetRegistry -> ReceiptRegistry.

Exit criteria for Phase 2:

- VOID mainnet (chainId 2050) runs with:
  - Stable validator set.
  - Enforced emissions + totalMinted <= MAX_SUPPLY.
  - Live AI agents and jobs on-chain.
  - Verified governance paths (config change, update activation).
- A public “VOID mainnet v1” announcement is honest: the system matches these
  docs and code; no hidden centralized shortcuts.

---

## Phase 3+ – Hardening and Upgrades (later)

Future phases will:

- Introduce staking pools and delegation.
- Add more advanced slashing / slashing proofs.
- Bring in more AI-centric features (ModelRegistry v2, DatasetRegistry v2,
  ZK/TEE-backed inference receipts, better policy enforcement, etc.).
- Tighten governance (community voting, more formal RFC/upgrade process).
