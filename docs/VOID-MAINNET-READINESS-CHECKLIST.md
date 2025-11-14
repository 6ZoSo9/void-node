# VOID Mainnet v1 – Readiness Checklist

This checklist tracks what must be true before VOID mainnet 1 (chainId 2050) goes live.

It covers:
- Core node / chain
- Governance + AI contracts
- Wallets / agents
- Monitoring / ops
- Security / key management
- Public launch basics

Use this as a living document; update as we tighten details.

---

## 1. Core chain / node (void-node)

- [ ] Block production stable at target block time (e.g. 2s or 5s) under soak tests.
- [ ] WAL, SegStore, and header/txroot pipelines:
  - [ ] No data corruption under restart / crash / replay tests.
  - [ ] Header3 + txroot health exporters green (no mismatches).
  - [ ] Vector 7 (WAL pressure / DoS controls) enabled with sane thresholds.
- [ ] P2P:
  - [ ] Stable peering for multiple nodes (>= 5–10 validator-style dev nodes).
  - [ ] Snapshot / bootstrap flow tested (joining from cold).
- [ ] Mempool:
  - [ ] Basic fee / spam protections in place.
  - [ ] No-empty-when-queued policy verified (or equivalent).
- [ ] Node config:
  - [ ] Canonical mainnet config file (ports, bootnodes, data dirs).
  - [ ] SafeBoot routes locked to minimal, audited surface.

---

## 2. Governance contracts (on-chain)

Deployed and verified on a staging / pre-mainnet network:

- [ ] **AdminGate**
  - [ ] Holds MasterKey wiring (EOA or multisig).
  - [ ] Can route privileged calls as designed.
- [ ] **UpdateGate**
  - [ ] Tracks protocol versions, manifests, and activation heights.
  - [ ] Enforced by node policy (nodes can read & follow).
- [ ] **ConfigGate**
  - [ ] chainId set to 2050.
  - [ ] adminGate set to AdminGate address.
  - [ ] Core keys defined (WAL thresholds, gas limits, AI pointers).
- [ ] Governance flows tested:
  - [ ] Update manifest proposal → approval → activation.
  - [ ] Config changes via AdminGate only (no direct random writers).
  - [ ] No “kill switch” path that can halt consensus.

---

## 3. AI contracts (on-chain)

All deployed and smoke-tested on staging:

- [ ] **JobQueue**
  - [ ] Post / Claim / Complete / Cancel flows tested.
  - [ ] Events consumed by a test agent.
- [ ] **AgentRegistry**
  - [ ] Agents can register, update metadata, toggle active.
  - [ ] MasterKey can mark trusted/untrusted, force deactivate, transfer ownership.
- [ ] **ModelRegistry**
  - [ ] Models registered with modelKey, versionHash, metadataURI.
  - [ ] MasterKey trust / force-active flows tested.
- [ ] **DatasetRegistry**
  - [ ] Datasets registered with datasetKey, metadataURI.
  - [ ] Trust + active flags working.
- [ ] **ReceiptRegistry**
  - [ ] Receipt records link jobId, agentId, modelId, datasetId, resultHash, proofHash, metadataURI, status.
  - [ ] Updates by original submitter work as expected.
- [ ] **ConfigGate AI pointers**
  - [ ] `VOID_AI_JOBQUEUE` → JobQueue
  - [ ] `VOID_AI_AGENT_REGISTRY` → AgentRegistry
  - [ ] `VOID_AI_MODEL_REGISTRY` → ModelRegistry
  - [ ] `VOID_AI_DATASET_REGISTRY` → DatasetRegistry
  - [ ] `VOID_AI_RECEIPT_REGISTRY` → ReceiptRegistry

---

## 4. Agents + off-chain infra

At least one reference agent implementation:

- [ ] Reference agent:
  - [ ] Registers in AgentRegistry with sane metadataURI.
  - [ ] Watches JobQueue for a specific `app` tag.
  - [ ] Claims jobs and completes them.
  - [ ] Writes receipts to ReceiptRegistry (with resultHash/proofHash/metadataURI).
- [ ] Agent HTTP API:
  - [ ] `/health` and `/info` implemented.
  - [ ] Optional `/preview` or similar documented.
- [ ] Model + dataset wiring:
  - [ ] At least one ModelRegistry + DatasetRegistry entry referenced by the agent.
  - [ ] Trusted / active flags used by local policy.
- [ ] Obelisk Wallet (or minimal client):
  - [ ] Can discover JobQueue + registries via ConfigGate.
  - [ ] Can post jobs and view receipts in a basic flow.

---

## 5. Monitoring and observability

Mainnet-grade monitoring stack:

- [ ] Prometheus:
  - [ ] Scrapes core node metrics: head, txroot, header3, WAL / Vector 7, proposer, seals.
  - [ ] Scrapes AI-specific metrics (job/receipt rates, queue depth, agent health).
  - [ ] Recording rules in place (rates, gaps, SLO-like aggregations).
- [ ] Alerts:
  - [ ] Proposer liveness / block rate.
  - [ ] Header/txroot mismatch.
  - [ ] WAL / Vector 7 pressure.
  - [ ] Follower drift / replication issues.
  - [ ] Key governance signals (e.g. unsafe config changes).
- [ ] Grafana:
  - [ ] Command-center dashboard for mainnet.
  - [ ] AI pane: JobQueue activity, agent volume, receipt stats.
- [ ] Logs:
  - [ ] Node logs rotated and retained with a sane policy.
  - [ ] At least basic structured logging for critical paths.

---

## 6. Security / key management

MasterKey and operator keys:

- [ ] MasterKey:
  - [ ] Stored on encrypted hardware / USB (void-gate style).
  - [ ] Recovery and backup strategy documented.
  - [ ] Emergency procedure for compromised key documented.
- [ ] Node operator keys:
  - [ ] Separated from MasterKey.
  - [ ] Rotatable without downtime.
- [ ] Contracts:
  - [ ] Critical governance contracts reviewed (and ideally audited).
  - [ ] AdminGate / UpdateGate / ConfigGate access control validated.
- [ ] Basic threat model documented:
  - [ ] What an attacker can do with different keys.
  - [ ] What chain-level damage is possible and how to recover.

---

## 7. Network + release process

For mainnet 1 launch:

- [ ] Genesis:
  - [ ] Genesis file documented (allocations, initial validators, chainId 2050).
  - [ ] Hashes published.
- [ ] Client binaries:
  - [ ] Tagged releases of void-node with reproducible builds (as far as possible).
  - [ ] Basic installation guide for validators / full nodes.
- [ ] Upgrade path:
  - [ ] Process for post-launch updates via UpdateGate + manifests.
  - [ ] Policy around emergency vs scheduled upgrades.
- [ ] Documentation:
  - [ ] Public docs for:
    - node operators,
    - wallet users,
    - agents / developer integration,
    - governance overview.

---

## 8. Launch checklist snapshot

Before flipping any “mainnet official” switch:

- [ ] Staging network has run for at least N days with:
  - [ ] continuous block production,
  - [ ] agents posting/claiming/completing jobs,
  - [ ] receipts written and read,
  - [ ] monitoring/alerts exercised.
- [ ] All critical boxes above are checked, with TODOs explicitly listed (no invisible unknowns).
- [ ] A signed, versioned “VOID Mainnet 1 Launch Manifest” prepared and stored (and its hash recorded via UpdateGate or equivalent).

This file should be kept up to date as we close gaps and move VOID toward mainnet.
