# VOID Network – Mainnet v1 Roadmap (draft v1)

This doc tracks the path from **today** to **VOID Mainnet v1** (chainId 2050).

It is a *requirements map*, not marketing. If it’s not written here, it’s not a
Mainnet v1 requirement.

---

## 0. Where we are today (2025-11-14)

### Node & data plane

- Custom `void-node` running with:
  - SegStore segment storage + sparse index.
  - Proposer auto-loop healthy (v3b exporter).
  - Seals v3 exporter (/metrics/void/seals).
  - Txroot pipeline:
    - Real txRoot computed from persisted txs.
    - Header3 endpoint `/blocks/:n/header3` with `{ number, txCount, txRoot }`.
    - Txroot health exporter `/health/txroot3?format=prom`.
- Safeboot profile:
  - Minimal safe routes.
  - Health metrics for safe boot readiness.

### Monitoring & ops

- Prometheus:
  - Scrapes node, seals, txroot core/setter, header3, safeboot, custom textfile collectors.
  - Root snapshot timer `void-prom-snap-root.timer` saving `/etc/prometheus` into `ops/prom-snap/`.
  - Recording rules + alerts for:
    - Follower drift (earlier).
    - Txroot health.
    - Header3 match.
    - Seals rate.
    - NOOP parity.
    - Update protocol diff (`void_update_protocol_*` → `void:update_protocol:*`).
- Grafana:
  - Dashboards for node health, seals, txroot, header3, protocol update status.

### Governance & gates

- **UpdateGate**:
  - Spec: `docs/UPDATE-GATE-CONTRACT.md`.
  - Contract: `contracts/UpdateGate.sol`.
  - Off-chain tooling:
    - Manifest generator `ops/new-update-manifest.mjs`.
    - Manifest hash tool `ops/update-manifest-hash.mjs`.
    - Ticket printer `ops/update-ticket-print.mjs`.
    - Demo pipeline `ops/updategate-propose-demo.sh`.
  - Runbook: `runbook/UPDATE-PROTOCOL-V6.md` (protocol 6 update flow).

- **AdminGate**:
  - Spec: `docs/ADMIN-GATE-CONTRACT.md`.
  - Contract: `contracts/AdminGate.sol`.
  - Role: master key router for all system gates (UpdateGate, ConfigGate, later others).

- **ConfigGate**:
  - Spec: `docs/CONFIG-GATE-CONTRACT.md`.
  - Contract: `contracts/ConfigGate.sol`.
  - Parameter map for WAL / Vector7 / AI: `docs/CONFIG-GATE-VECTOR7-PARAMS.md`.

### Update metrics

- Textfile exporter: `ops/update-protocol-metrics.sh` + systemd timer
  `void-update-protocol-metrics.timer`.
- Metrics:
  - `void_update_protocol_diff`
  - `void_update_protocol_local`
  - `void_update_protocol_target`
- Recording rules:
  - `void:update_protocol:diff`
  - `void:update_protocol:local`
  - `void:update_protocol:target`
  - `void:update_protocol:outdated`
  - `void:update_protocol:ahead`
- Alerts:
  - `VoidNodeProtocolOutdated`
  - `VoidNodeProtocolAhead` (forbid-ahead guard).

---

## 1. Mainnet v1 – High-level goals

Mainnet v1 means:

1. **Chain keeps running** without the MasterKey:
   - Users can deploy contracts, transfer tokens, run agents, etc.
   - No single key can “stop the chain”.

2. **MasterKey can update the network safely:**
   - Protocol version changes via UpdateGate.
   - Config changes via ConfigGate.
   - All routed through AdminGate with on-chain audit trail.

3. **Node safety rails are live:**
   - WAL + Vector7 guardrails configured via ConfigGate (or its adapter).
   - Txroot / header consistency verified continuously.
   - Monitoring and alerting ready for production.

4. **Upgrade process is standardized:**
   - Manifest → UpdateGate → protocol diff metrics → node rollout.
   - Update runbooks + gate deployment runbooks are complete and tested.

---

## 2. Phase A – Node core & safety rails (CURRENT)

Goal: make a single node rock-solid under load, with clear safety behavior.

**A.1 WAL & Vector7 implementation**

- [ ] Implement WAL v1 fully (if not yet):
  - Durable write-ahead log for txs / jobs.
  - Replay guarantees on crash.
- [ ] Implement Vector7 (V7) guardrails in node:
  - Memory pressure measurement.
  - Queue size & per-source caps.
  - “Defensive mode” behavior when pressure high.

**A.2 Wire config constants (local-only first)**

- [ ] Replace hard-coded WAL / V7 thresholds with a local config layer:
  - Sources: env vars or local config file.
  - Keys aligned with `CONFIG-GATE-VECTOR7-PARAMS.md`.
- [ ] Export current thresholds as Prometheus gauges for visibility.

**A.3 Hard health checks**

- [ ] Ensure node refuses to start in “prod profile” if:
  - Txroot health is failing.
  - Seals exporter not mounted.
- [ ] Safeboot profile has its own health metrics and Prom alerts.

---

## 3. Phase B – Gates live on-chain (staging)

Goal: have AdminGate, UpdateGate, ConfigGate actually deployed on a staging network
with real transactions and updates exercised.

**B.1 Deploy gates on staging**

- [ ] Deploy AdminGate on staging (chainId 2050-equivalent).
- [ ] Deploy UpdateGate with `masterKey = AdminGate`.
- [ ] Deploy ConfigGate with `adminGate = AdminGate`.
- [ ] Run through `runbook/VOID-GATES-DEPLOY-V1.md` with real addresses filled in.

**B.2 Exercise UpdateGate pipeline**

- [ ] Use `ops/updategate-propose-demo.sh` to:
  - Generate v6 manifest, hash, and signer ticket.
- [ ] Submit a **real** `proposeUpdate` tx on staging.
- [ ] Stage update at some height `H`.
- [ ] Activate update and verify:
  - Update struct in UpdateGate matches manifest.
  - Protocol metrics (`void:update_protocol:*`) align with target.

**B.3 Exercise ConfigGate**

- [ ] Add a tiny `ops/config-key-hash.mjs` to compute keccak256(name) for config keys.
- [ ] On staging, set a few WAL / V7 parameters via ConfigGate:
  - `WAL_MAX_PRESSURE_SOFT`, `WAL_MAX_PRESSURE_HARD`,
  - `V7_MEM_PRESSURE_WARN`, `V7_MEM_PRESSURE_CRIT`, etc.
- [ ] Confirm events are emitted and indexable for off-chain infra.

---

## 4. Phase C – Config → node adapter

Goal: node behavior is actually driven (indirectly) by on-chain config.

**C.1 Config poller**

- [ ] Build a small adapter (separate process) that:
  - Reads ConfigGate via RPC on interval.
  - Writes a local JSON and/or textfile metrics with:
    - The effective WAL / V7 thresholds.
- [ ] Run it under systemd (user or root, depending on design).

**C.2 Node integration**

- [ ] Void-node reads config from adapter output:
  - On startup, loads thresholds from JSON or env.
  - Optionally reloads on SIGHUP or polling.
- [ ] Prometheus shows:
  - Current thresholds (from adapter).
  - Current measured pressure (from node).
  - Clear relationship in dashboards.

---

## 5. Phase D – Testnet & multi-node validation

Goal: take the whole package and shake it in a small multi-node network.

**D.1 Dedicated VOID testnet**

- [ ] Spin up a N-node VOID testnet (chainId 2050-test):
  - 1–2 proposers.
  - Several followers.
- [ ] Deploy gates + ConfigGate + sample configs on this testnet.

**D.2 Failure drills**

- [ ] Deliberately:
  - Overload WAL.
  - Overload Vector7 queues.
  - Kill nodes mid-flight.
- [ ] Verify:
  - Guardrails trigger as expected.
  - Prom alerts fire with useful signal.
  - Recovery runbooks work (snapshots, restart, resync).

---

## 6. Phase E – Mainnet v1 readiness checklist

We treat Mainnet v1 as “go” only when all of this is true:

- [ ] Node core:
  - Txroot health = 1 and header3 matches tip for long runs.
  - Seals exporter stable; no unexplained gaps.
  - WAL + Vector7 guardrails implemented and exercised.

- [ ] Gates:
  - AdminGate / UpdateGate / ConfigGate deployed on testnet.
  - Update pipeline (manifest → UpdateGate → protocol metrics) tested end-to-end.
  - ConfigGate keys for WAL / V7 populated and used by adapter.

- [ ] Monitoring:
  - Prometheus rules & alerts for:
    - Txroot, seals, header3.
    - WAL/V7 pressure.
    - Protocol outdated/ahead.
  - Grafana dashboards wired and readable for an external SRE.

- [ ] Runbooks:
  - Protocol update runbook current (`runbook/UPDATE-PROTOCOL-V6.md`).
  - Gate deployment runbook current (`runbook/VOID-GATES-DEPLOY-V1.md`).
  - New Mainnet-specific runbook for:
    - Genesis.
    - Initial gate deployment.
    - First protocol upgrade.

Once all Phase A–E tasks are checked on real infra, we can carve out a
**Mainnet v1 launch plan** (genesis params, validator set, tokenomics, etc.)
as a separate doc.

