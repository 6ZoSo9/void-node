# VOID Network – Mainnet Roadmap (v0.1)

This file is the **single source of truth** for where VOID is on the path
to mainnet and what’s left to do.

ChainId: **2050**  
Pillars: **Safeboot**, **Devnet**, **Mainnet-Core**

---

## 1. Pillars – Current Status

### 1.1 Safeboot pillar

Goal: Minimal, locked-down VOID node + metrics, used as a “known good”
baseline and emergency boot path.

Status: **GREEN**

- Safeboot node (`void-node@safe-4100`) runs against known-good data dir.
- Safeboot Prometheus gauges wired:
  - `void:safeboot:overall` == 1 when safeboot is healthy.
- Safeboot included in:
  - `pillars-preflight` gate.
  - `void-safeboot-health-all` helper.
- Safeboot used as one of the three “pillars” in pre-push checks.

### 1.2 Devnet pillar

Goal: Fully wired VOID devnet with system contracts, agents, receipts,
and monitoring, used for all protocol and agent work.

Status: **GREEN**

- Core contracts deployed on devnet (chainId 2050):
  - `AdminGate`, `UpdateGate`
  - `ModelRegistry`, `DatasetRegistry`, `AgentRegistry`
  - `JobQueue`, `ReceiptRegistry`
- Coverage + receipts:
  - `totalJobs = 6`
  - `totalReceipts = 78`
  - `receipts/job = 13`
- Textfile + Prometheus gauges:
  - `void_devnet_coverage = 1`
  - `void_devnet_coverage_health = 1`
  - `void_devnet_receipts_coverage_v2 = 13`
  - `void_devnet_receipts_health_v2 = 1`
- CI / health scripts:
  - `ops/void-devnet-ci-smoke.sh`
  - `ops/void-devnet-agent-ci-smoke.sh`
  - `ops/void-devnet-models-ci-smoke.sh`
  - `ops/void-devnet-datasets-ci-smoke.sh`
  - `ops/void-devnet-health-all.sh`
- Devnet is now a **gated dependency** for mainnet work:
  - Pre-push hooks run full devnet smoke before mainnet-core changes are allowed.

### 1.3 Mainnet-Core pillar

Goal: Define and monitor the **mainnet core** environment: licensing,
update manifest, and top-level health gauges for the chain that will
become VOID mainnet.

Status: **GREEN (licensing + manifest v0 wired)**

- Licensing:
  - Root repo license set to **VCL v1.0**.
  - `.ci/VCL_LICENSE.txt` is the pinned reference.
  - CI license guard workflow exists.
- Mainnet-core health metrics:
  - `void_mainnet_core_health = 1`
  - Recording rule:
    - `void:mainnet_core:health:last_5m = max_over_time(void_mainnet_core_health[5m])`
- Mainnet-core update manifest metrics:
  - `void_mainnet_core_manifest_health = 1`
  - `void_mainnet_core_manifest_days_left = 29` (at time of this snapshot)
  - Recording rule:
    - `void:mainnet_core:manifest_days_left:last = last_over_time(void_mainnet_core_manifest_days_left[5m])`
- Pillars preflight:
  - `pillars-preflight` checks:
    - Safeboot overall
    - Devnet overall
    - Mainnet-core health + manifest_days
  - Pre-push hook for mainnet-core branch runs:
    - Full devnet CI smoke
    - Safeboot health-all
    - Devnet health-all
    - Mainnet-core health-all
    - Pillars summary

This branch (`feat/mainnet-core-20251120`) delivered the **mainnet-core
licensing + manifest wiring** and made sure the pillars gate is hard.

---

## 2. Immediate Next Steps (pre-mainnet)

These are the next concrete pieces we need before we can talk about a real
mainnet launch.

### 2.1 Mainnet Genesis Spec (chainId 2050)

- [ ] Create `docs/VOID-MAINNET-GENESIS-SPEC.md` with:
  - Consensus assumptions (single-proposer dev mainnet vs multi-validator real mainnet).
  - Block time (target 2s, consistent with current dev setup).
  - Initial gas limits and fee model placeholders.
  - Predeploy list:
    - `AdminGate`
    - `UpdateGate`
    - `ModelRegistry`
    - `DatasetRegistry`
    - `AgentRegistry`
    - `JobQueue`
    - `ReceiptRegistry`
  - Initial admin/master key plan (who holds what, how we migrate off dev keys).

- [ ] Add a stub genesis JSON (or clear path to generate one) that matches
      the spec and is checked into `docs/` or `genesis/`.

### 2.2 Mainnet Update Manifest v1

- [ ] Define a **real** mainnet-core update manifest file
      (e.g. `docs/VOID-MAINNET-UPDATE-MANIFEST.json`) with:
  - Protocol version / build hash.
  - Min/max compatible node versions.
  - Activation height plan (even if “TBD” / placeholder now).
  - Expiry window (days_left target, e.g. 30–90 days).

- [ ] Wire a dedicated exporter script:
  - Writes `void_mainnet_core_manifest_*` gauges to the node-exporter textfile.
  - Mirrors the devnet exporter but for mainnet-core.

- [ ] Ensure Prometheus alerts exist for:
  - `void_mainnet_core_manifest_days_left` dropping below thresholds (e.g. 14d, 7d).

### 2.3 Mainnet-Core CI / Ops

- [ ] Add a `void-mainnet-core-*` CI smoke helper that:
  - Confirms mainnet-core gauges are present and == 1.
  - Confirms manifest_days >= N.
  - Is runnable from pre-push and from GitHub CI.

- [ ] Extend `pillars-preflight` to:
  - Optionally call remote/mainnet endpoints when actual mainnet nodes exist.
  - Keep local-only mode for dev.

---

## 3. Post-Genesis Mainnet Work

These are **post-genesis** items that we don’t need to finish before the
first mainnet chain comes up, but they’re required to call the network
“production”.

### 3.1 Wallets – Obelisk

- [ ] Obelisk Lite (browser plugin) minimal mainnet support:
  - Connect to chainId 2050 mainnet RPC.
  - Sign/send standard VOID txs.
  - Read balances of VOID / VoidStones.
- [ ] Obelisk Mobile and Titan mainnet endpoints:
  - Point at mainnet RPC.
  - Surface update/health info from mainnet-core (read-only).

### 3.2 Agents + JobQueue on Mainnet

- [ ] Define which system jobs are allowed on mainnet at launch.
- [ ] Point a small, controlled off-chain agent at mainnet JobQueue.
- [ ] Mirror the devnet coverage gauges for mainnet:
  - `void_mainnet_coverage`
  - `void_mainnet_receipts_*` equivalents
  - CI smoke that refuses to pass if coverage breaks.

### 3.3 Governance / UpdateGate Hardening

- [ ] Lock down UpdateGate signers for mainnet (no dev keys).
- [ ] Define M-of-N policy for protocol updates.
- [ ] Ensure UpdateGate + manifest flows are fully monitored.

---

## 4. Where We Are Right Now

**As of this checkpoint:**

- Safeboot pillar: **GREEN**
- Devnet pillar: **GREEN**
- Mainnet-core pillar (licensing + manifest metrics): **GREEN**

Next concrete moves:

1. Write `docs/VOID-MAINNET-GENESIS-SPEC.md` and agree on the initial
   chain parameters for mainnet (chainId 2050).
2. Add a mainnet-core update manifest JSON + exporter mirroring devnet.
3. Wire a minimal mainnet-core CI smoke + Prometheus alerts for manifest expiry.

This file should be kept short, updated rarely, and treated as the
canonical high-level roadmap to mainnet.
