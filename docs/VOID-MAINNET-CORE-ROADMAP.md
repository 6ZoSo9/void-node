# VOID Network – Mainnet Core Roadmap (chainId 2050)

Branch: `feat/mainnet-core-20251120`  
Status: **devnet core green**, mainnet core in progress.

This file is the *canonical checklist* from devnet → mainnet core.  
If something is not on here, it’s not real.

---

## 0. Ground Truth (Today)

**Chain / node:**
- [x] Local VOID devnet running (chainId 2050).
- [x] `void-node` proposer & follower stack stable (header3/txroot/seals/proposer exporters).
- [x] WAL + SegStore baseline in place.
- [x] Prometheus + Grafana “Command Center” and txroot/seals/proposer/header3 dashboards online.
- [x] Devnet health aggregators:
  - `ops/void-devnet-full-ci-smoke.sh`
  - `ops/void-devnet-ci-smoke.sh`
  - `ops/void-devnet-health-all.sh` (overall gauge)
- [x] Devnet job/receipt coverage pipeline:
  - Jobs/receipts gauges in node_exporter textfiles.
  - Coverage heal + report scripts.
  - New hammers:
    - `ops/void-devnet-job-inspect.sh`
    - `ops/void-devnet-receipt-inspect.sh`
    - `ops/void-devnet-job-bundle.sh`

**Devnet system contracts (v2):**
- [x] `AdminGate`
- [x] `UpdateGate`
- [x] `ModelRegistry`
- [x] `DatasetRegistry`
- [x] `AgentRegistry`
- [x] `JobQueue`
- [x] `ReceiptRegistry`
- [x] Dev EOA (masterKey) wired as Admin/Update authority for devnet.
- [x] Devnet health gauges for:
  - Models (`void_models_devnet_*`)
  - Datasets (`void_datasets_devnet_*`)
  - AgentRegistry (`void_agentreg_devnet_*`)
  - Jobs/Receipts coverage (`void_devnet_*`)

**Monitoring / CI gates:**
- [x] Prometheus scrapes all exporters.
- [x] CI pre-push hook: `ops/void-devnet-full-ci-smoke.sh` (must be green to push).
- [x] Overall devnet health gauge:
  - `void_devnet_overall_health` == 1 when everything is sane.

This is our **“devnet golden reference”** for mainnet core.

---

## 1. Mainnet-Core Contract Set (What Must Exist)

Mainnet core is the on-chain surface we commit to **not breaking** once mainnet launches (barring formal UpdateGate-governed upgrades).

### 1.1 Canonical contracts

- [ ] `VoidToken` / base gas/token logic (even if thin at launch).
- [x] `AdminGate` (governs core system contracts).
- [x] `UpdateGate` (governs protocol updates).
- [x] `ModelRegistry` (AI model directory).
- [x] `DatasetRegistry` (datasets directory).
- [x] `AgentRegistry` (authorized actors/agents).
- [x] `JobQueue` (jobs).
- [x] `ReceiptRegistry` (receipts).

### 1.2 Interface / ABI freeze (mainnet-core)

For mainnet launch we must:

- [ ] Freeze ABIs:
  - `IAdminGate`, `IUpdateGate`, `IModelRegistry`, `IDatasetRegistry`,
    `IAgentRegistry`, `IJobQueue`, `IReceiptRegistry`, and token interfaces.
- [ ] Tag the exact commit (Solidity + interfaces + tests).
- [ ] Write and commit spec docs (already started):
  - `docs/UPDATE-GATE-CONTRACT.md`
  - `docs/JOBQUEUE-CONTRACT.md`
  - `docs/MODELREGISTRY-CONTRACT.md`
  - [ ] Add matching specs for DatasetRegistry, AgentRegistry, ReceiptRegistry, VoidToken.

---

## 2. Governance & Master-Key Path (Non-Negotiable)

We already have **master-key / AdminGate / UpdateGate** in devnet. Mainnet-core needs this locked down:

### 2.1 Master key + signer sets

- [ ] Decide mainnet master-key holder(s) (LLC / multi-sig / cold keys).
- [ ] Define initial **Update Signers** set (M-of-N) and threshold for `UpdateGate`.
- [ ] Define **AdminGate** roles/permissions:
  - Which contracts AdminGate can re-point.
  - Which “system addresses” are considered critical.

### 2.2 UpdateGate lifecycle

- [x] Devnet UpdateGate wired and emitting state.
- [ ] Mainnet-core Update manifest format:
  - `version`, `manifestHash`, `minHeight`, `maxHeight`, `emergencyFlag`.
- [ ] Node behavior:
  - `void-node` must read `UpdateGate` (or a derived textfile/Prom metric) and:
    - [ ] Refuse incompatible manifests.
    - [ ] Warn loudly when manifest is near expiry.
    - [ ] Surface Prometheus gauges (we already have devnet expiry-style exporters — extend them).
- [ ] SLOs and alerts:
  - [ ] `void_update_manifest_days_left` style metric.
  - [ ] Alert when days_left < X on mainnet.

---

## 3. Node Behavior Tied to Governance

Mainnet-core requires **node behavior** to actually obey governance, not just expose metrics.

### 3.1 Update enforcement

- [ ] Implement “Update manifest” gate in `void-node`:
  - Node reads current protocol version / manifest hash from UpdateGate (or cached export).
  - Compares to local build manifest.
  - Won’t auto-join mainnet if wrong / outdated (safe-mode only).
- [ ] Wire this into:
  - [ ] HTTP `/__void/ready.json` readiness.
  - [ ] `/metrics/void/…` health exporters (update health).
  - [ ] Prometheus + alerts.

### 3.2 AdminGate-driven config

- [ ] Define which addresses are “system addresses” that nodes care about as config:
  - ModelRegistry, DatasetRegistry, AgentRegistry, JobQueue, ReceiptRegistry, VoidToken, etc.
- [ ] Ensure `void-node` always treats that state as **read-only from chain**:
  - No hard-coded addresses in configs for mainnet.
  - Only genesis → AdminGate → current addresses.

---

## 4. Mainnet Packaging & Operator Story

We have devbox scripts and local systemd. For mainnet we need a clean operator story.

### 4.1 Node packaging

- [ ] Build reproducible `void-node` artifacts (Linux first, Windows later).
- [ ] Provide:
  - [ ] Tarball with `void-node` binary + sample config.
  - [ ] systemd unit templates for Linux.
  - [ ] Basic instructions for Windows service / scheduled task.

### 4.2 Auto-update (UpdateGate-aware)

- [x] High-level design documented (signed manifest, channels, rollback, etc.).
- [ ] Implement “download + verify + stage + restart” flow:
  - [ ] Signed manifest (Ed25519) checks.
  - [ ] SHA256 binary verification.
  - [ ] On failure, roll back to previous build.
- [ ] Make sure auto-updater *obeys* UpdateGate:
  - Won’t jump to future protocol without UpdateGate approval.
  - Won’t run expired builds past manifest window (or at least screams via metrics).

---

## 5. Observability & SLOs (Mainnet Core)

Devnet already has rich Prometheus + Grafana. Mainnet-core needs **formal SLOs** that gates releases.

### 5.1 Node / chain SLOs

- [x] Proposer uptime SLOs (devnet).
- [x] Header3/txroot parity alerts (devnet).
- [x] Job/receipt coverage gauges (devnet).
- [ ] Mainnet-core SLO definitions:
  - [ ] Proposer uptime (1h/24h windows).
  - [ ] Header3 vs txroot mismatch rate (should be 0).
  - [ ] WAL pressure / Vector 7 (V7) guardrail metrics.
  - [ ] Update manifest freshness (days_left).
  - [ ] Job/receipt coverage on mainnet (near 1.0; define lower bound).
- [ ] Release gate:
  - No mainnet rollout if any core SLO fails on devnet/staging for last N hours.

---

## 6. Mainnet-Core Rollout Path

### 6.1 Staging / public testnet

- [ ] Clone current devnet into a **staging testnet** with:
  - Same chainId 2050 or new chainId? (decide).
  - Same core contracts, but independent state.
  - Same monitoring stack.
- [ ] Run:
  - [ ] Full CI equivalent against staging.
  - [ ] Synthetic AI jobs through JobQueue + external agents.
  - [ ] UpdateGate test manifests (dry-run updates, expiry, emergency flags).

### 6.2 Mainnet genesis

- [ ] Define mainnet genesis spec:
  - [ ] Initial balances (if any).
  - [ ] Initial system contract deployments + AdminGate/UpdateGate wiring.
  - [ ] Initial Update manifest (v1).
- [ ] Tag:
  - [ ] `golden-mainnet-genesis-<date>` in git.
  - [ ] Signed genesis manifest file in repo.

---

## 7. Short-Term Next Actions (This Branch)

On `feat/mainnet-core-20251120`, next concrete moves:

1. **Governance hammers & metrics**
   - [ ] Add ops script: `ops/void-devnet-governance-status.sh`:
     - Dumps AdminGate + UpdateGate addresses and key fields.
     - Prints current devnet update manifest info.
   - [ ] Add/update Prometheus rules + alerts for update manifest freshness.

2. **Contract spec completion**
   - [ ] Add/finish specs:
     - `docs/DATASETREG-CONTRACT.md`
     - `docs/AGENTREG-CONTRACT.md`
     - `docs/RECEIPTREG-CONTRACT.md`
     - `docs/VOIDTOKEN-CONTRACT.md` (or equivalent)  
     …all v1, minimal, matching deployed ABIs.

3. **ABI freeze draft**
   - [ ] Export ABI JSONs for mainnet-core contracts into `contracts/abi/mainnet-core/`.
   - [ ] Add a small README explaining that changes here require:
     - UpdateGate upgrade plan.
     - New version tag.

When these 3 buckets are checked, we’ll be very close to a **credible mainnet-core** that can be launched by swapping devnet for a clean genesis + real keys.

