# VOID Network – Gate Architecture Overview (v1)

VOID uses a **three-gate pattern** for protocol and config control:

- **AdminGate** – master key router (where the MasterKey lives).
- **UpdateGate** – protocol version policy (what node versions are valid).
- **ConfigGate** – on-chain config registry (tunable parameters).

The goal is:
- Keep the chain **permissionless** (users deploy/call contracts freely).
- Let the **MasterKey** enforce upgrades and config in a controlled way.
- **Never** give any single contract a “kill switch” over consensus.

---

## 1. Roles at a glance

### AdminGate (master key router)

- Holds the current **MasterKey** (EOA / multisig / HW wallet).
- Points at core system contracts:
  - `UpdateGate` (protocol policy),
  - `ConfigGate` (config registry),
  - future gates (e.g. `WalletGate`, `AgentGate`).
- Exposes a **generic forwarder** that can call into registered system contracts,
  but only when triggered by the MasterKey.

Non-goals:
- Cannot stop block production.
- Cannot roll back chain history.
- Cannot touch user balances/contracts directly.

### UpdateGate (protocol policy)

- Stores:
  - `currentProtocolVersion` (e.g. `5`, `6`, …),
  - `minProtocolCompat` (floor for what nodes may run),
  - update proposals keyed by `manifestHash`.
- Enforces:
  - M-of-N **Update Signers** for new proposals,
  - height-based activation for staged updates,
  - optional `emergency` flag on updates.

Non-goals:
- Does **not** ship binaries or configs itself.
- Does **not** force nodes to upgrade; it defines what *should* be considered
  current/valid by nodes that follow the policy.

### ConfigGate (config registry)

- Stores typed config values keyed by `bytes32`:
  - `uint256` – counters, limits, thresholds,
  - `bool` – feature flags,
  - `address` – contract pointers / registries.
- Only the configured **admin** (AdminGate in v1) can mutate values.
- Emits events on every change so off-chain infra can track diffs.

Typical keys (hashed off-chain to `bytes32`):

- `"WAL_MAX_PRESSURE"` – Vector 7 / WAL pressure thresholds.
- `"MAX_BLOCK_GAS"` – effective block weight cap.
- `"AI_AGENT_MAX_JOBS"` – global cap for on-chain agent jobs.
- `"AI_MODEL_REGISTRY"` – address of the ModelRegistry.
- `"UPDATE_POLICY_DEFAULT"` – default node update policy hint.

Non-goals:
- No arbitrary calls to other contracts.
- No direct hooks into consensus or balances.

---

## 2. How they connect (addresses)

On a live VOID network (chainId 2050), addresses should be wired roughly as:

- `AdminGate.masterKey` → MasterKey EOA / multisig.
- `AdminGate.updateGate` → deployed `UpdateGate` instance.
- `AdminGate.configGate` → deployed `ConfigGate` instance.

- `UpdateGate.masterKey` → **AdminGate contract**, not a raw EOA.
- `ConfigGate.adminGate` → **AdminGate contract**.

This makes AdminGate the **only** place the MasterKey actually sits. All other
system contracts see AdminGate as their privileged caller.

---

## 3. Normal protocol update flow (v5 → v6)

High-level steps (also see `runbook/UPDATE-PROTOCOL-V6.md`):

1. **Prepare manifest off-chain**
   - Use `ops/new-update-manifest.mjs` to build a v6 manifest with
     `minCompat=5`.
   - Compute its `manifestHash` with `ops/update-manifest-hash.mjs`.
   - Host the manifest and binaries (e.g. `updates.voidchain.io`).

2. **Signers approve via UpdateGate**
   - Use the EIP-712 ticket from `ops/update-ticket-print.mjs`.
   - Update Signers sign `UpdateTicket` off-chain.
   - One signer sends `proposeUpdate(...)` to `UpdateGate` with:
     - `manifestHash`,
     - `app="void-node"`,
     - `protocolVersion=6`,
     - `minProtocolCompat=5`,
     - `emergency=false` (or `true` for emergencies).

3. **MasterKey stages activation via AdminGate**
   - MasterKey calls AdminGate’s forwarder to:
     - `stageUpdate(manifestHash, activationHeight)` on UpdateGate.
   - Activation height is chosen based on real chain head and rollout plan.

4. **Activation**
   - Once the chain passes `activationHeight`, anyone can call
     `activateUpdate(manifestHash)` on UpdateGate.
   - UpdateGate marks protocol 6 as active; historical data remains intact.

5. **Nodes & operators**
   - Operators build/ship `void-node` v6 binaries.
   - Nodes update their **local policy** (e.g. `VOID_PROTOCOL_VERSION`,
     `VOID_UPDATE_POLICY`) and/or read UpdateGate state + manifested metadata.
   - Our textfile exporter (`ops/update-protocol-metrics.sh`) emits:
     - `void_update_protocol_local`,
     - `void_update_protocol_target`,
     - `void_update_protocol_diff`,
     which Prometheus can alert on when nodes fall behind.

---

## 4. Config updates via ConfigGate

Config changes follow a similar pattern, but with **ConfigGate**:

1. MasterKey (through AdminGate) sets/updates config keys:
   - `ConfigGate.setUint(key, value)`,
   - `ConfigGate.setBool(key, value)`,
   - `ConfigGate.setAddress(key, value)`.

2. Each change emits an event:
   - `UintConfigChanged`,
   - `BoolConfigChanged`,
   - `AddressConfigChanged`.

3. Nodes and agents:
   - Periodically read key values (on-chain or via indexer).
   - Adjust behaviour (e.g. WAL thresholds, agent job limits, model registry).

ConfigGate is intentionally **slow-moving**: it is for policy knobs, not for
per-transaction decisions.

---

## 5. Threat model and non-goals

- AdminGate can rotate the MasterKey and system contract addresses, but:
  - Cannot arbitrarily manipulate user balances.
  - Cannot directly halt consensus or mint blocks.
- UpdateGate defines protocol versions, but:
  - Nodes are still responsible for choosing whether to follow it.
- ConfigGate holds config, but:
  - Cannot by itself pause the chain or censor transactions.

All three gates are designed to make VOID **governable** without becoming
a single-point “off switch” for the chain.
