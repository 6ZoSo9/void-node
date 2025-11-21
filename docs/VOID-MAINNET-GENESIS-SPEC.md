# VOID Network – Mainnet Genesis Spec (v0.1)

This document defines the **initial parameters and structure** for the
first VOID mainnet chain (chainId 2050).

It is intentionally narrow and concrete: what chain we are starting,
with which contracts, using which keys, and what minimum monitoring and
update rules we require on day one.

This is NOT a marketing doc. It is the thing operators and tooling read
to know how to boot and validate VOID mainnet.

---

## 1. High-Level Goals

- Launch a **single canonical mainnet chain** with:
  - ChainId **2050**.
  - A minimal but real set of system contracts:
    - `AdminGate`
    - `UpdateGate`
    - `ModelRegistry`
    - `DatasetRegistry`
    - `AgentRegistry`
    - `JobQueue`
    - `ReceiptRegistry`
  - A clean upgrade path via **UpdateGate + manifest**.
  - Monitoring and health signals equivalent to what we already have for:
    - Safeboot
    - Devnet
    - Mainnet-Core

- Keep the first mainnet version simple:
  - Likely **single-proposer / validator** at launch.
  - Multi-validator / full consensus-engine work is a **follow-up phase**,
    not a blocker to bringing chainId 2050 up.

---

## 2. Chain Parameters

### 2.1 Identity

- **ChainId:** `2050`
- **Network name (working):** `void-mainnet`
- **Human name:** VOID Network Mainnet (v1)

### 2.2 Block & Gas

Initial targets (v0.1, subject to later tuning via updates):

- **Target block time:** 2 seconds
- **Max gas per block:** TBD (must be consistent across:
  - node config
  - genesis JSON
  - monitoring / expectations)
- **Fee model:** placeholder / “flat gas” at launch, with a clear path to a
  more sophisticated fee model later (EIP-1559-style or custom).

For this spec version we only assert:

- There **must** be a single, explicit `maxGasPerBlock` (or equivalent)
  value in the genesis config.
- All nodes MUST agree on that value or they are not mainnet.

---

## 3. Genesis Accounts & Predeploys

### 3.1 Admin / Master Keys

We separate “dev keys” (used on devnet) from “mainnet keys”:

- **Devnet deployer EOA (current devnet):**
  - `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  - Used in devnet for system contracts, NOT acceptable as a long-term
    mainnet admin key.

- **Mainnet admin keys (TBD):**
  - One or more EOAs or contracts that will:
    - Own `AdminGate`
    - Control `UpdateGate`
  - MUST be documented in this spec before genesis is finalized.

The final genesis spec must include:

- A list of admin addresses.
- A short explanation of how they are safeguarded (hardware keys, sentinel
  USB, etc.).

### 3.2 System Predeploys

At genesis, the following contracts are expected to be **predeployed** or
deployed in block 0 by a well-defined process:

- `AdminGate`
- `UpdateGate`
- `ModelRegistry`
- `DatasetRegistry`
- `AgentRegistry`
- `JobQueue`
- `ReceiptRegistry`

For v0.1 of this spec we define:

- Contract **ABIs and code** must match the devnet versions that passed:
  - Full devnet CI smoke
  - Coverage / receipts checks
  - Devnet health-all
- Contract **addresses** for mainnet are TBD, but must be:
  - Fixed ahead of time.
  - Captured in:
    - `docs/VOID-MAINNET-PROTOCOL-STATE.json` (future)
    - The canonical genesis JSON.

---

## 4. Genesis File Layout

We standardize where the genesis description lives in the repo:

- **Human spec (this file):**
  - `docs/VOID-MAINNET-GENESIS-SPEC.md`

- **Machine-readable genesis (TBD, v0.2+):**
  - `genesis/void-mainnet-genesis.v1.json`

The JSON file must contain at least:

- Chain parameters:
  - `chainId`
  - `networkName`
  - `genesisTime`
  - `maxGasPerBlock` (or equivalent)
- Account allocations:
  - Any funded EOAs or contracts at height 0.
- System contract predeploys:
  - Code hashes
  - Storage / constructor params where applicable.

This spec is the **source of truth** for the intent; the JSON is the
exact artifact nodes use.

---

## 5. Monitoring & Health Requirements (Day 1)

Mainnet must ship with health and update signals at least as strong as
what we already have for mainnet-core:

- A mainnet-core health gauge:
  - `void_mainnet_core_health`
- An update manifest gauge set for mainnet:
  - `void_mainnet_core_manifest_health`
  - `void_mainnet_core_manifest_days_left`

Prometheus side:

- Recording rules:
  - `void:mainnet_core:health:last_5m = max_over_time(void_mainnet_core_health[5m])`
  - `void:mainnet_core:manifest_days_left:last = last_over_time(void_mainnet_core_manifest_days_left[5m])`
- Alerts:
  - Mainnet-core health != 1.
  - Manifest days_left dropping below thresholds (e.g. 14d, 7d).

Genesis is not considered “done” until:

- These metrics exist.
- They are scraped.
- Alerts are defined and passing in our own environment.

---

## 6. Update Manifest & UpdateGate

Mainnet MUST be tied into the update flow:

- There must be a **mainnet update manifest JSON** (separate from devnet):
  - Example path: `docs/VOID-MAINNET-UPDATE-MANIFEST.json`
- The manifest must define at minimum:
  - Protocol version / build hash.
  - Activation rules (even if just “current/always on” at launch).
  - Expiry window (days_left target).

UpdateGate:

- Controls which manifest hashes are valid.
- Is governed by an M-of-N signer set controlled by `AdminGate` / master key.

This spec will be extended to include:

- Exact signer set.
- Exact M-of-N policy.

---

## 7. Open Items Before Genesis Freeze

These MUST be resolved before we call the genesis spec “frozen”:

- [ ] Choose final mainnet admin keys (no devnet keys).
- [ ] Fix and document:
  - `maxGasPerBlock`
  - Any additional hard limits (max tx size, etc.).
- [ ] Decide on the initial fee model and encode it in the genesis config.
- [ ] Finalize system contract addresses for mainnet.
- [ ] Produce `genesis/void-mainnet-genesis.v1.json` that matches this spec.
- [ ] Wire mainnet-core update manifest JSON + exporter.
- [ ] Confirm Prometheus jobs and alerts for:
  - `void_mainnet_core_health`
  - `void_mainnet_core_manifest_*`

Once the above are done, bump this file to **v1.0**, tag the repo with a
checkpoint, and treat both the spec and the genesis JSON as immutable
history for the first VOID mainnet chain.
