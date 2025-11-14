# VOID Network – ConfigGate Contract Spec (v1, minimal)

ConfigGate is the on-chain **config registry** for VOID (chainId 2050).

- UpdateGate controls protocol versions (what is valid).
- AdminGate holds the MasterKey and routes privileged calls.
- ConfigGate holds **tunable parameters** that nodes and agents can read.

ConfigGate cannot:
- Stop block production.
- Directly modify user balances or contracts.
- Perform arbitrary calls to other contracts.

It can:
- Store typed config values (uint, bool, address) keyed by `bytes32`.
- Be updated only by a trusted admin (AdminGate in v1).
- Emit events on every change so off-chain infra can track config diffs.

Examples of config keys (names hashed off-chain to `bytes32`):

- "WAL_MAX_PRESSURE" – WAL / Vector7 thresholds.
- "MAX_BLOCK_GAS" – block gas or weight cap.
- "AI_AGENT_MAX_JOBS" – global limits for on-chain agent jobs.
- "AI_MODEL_REGISTRY" – address of ModelRegistry.
- "UPDATE_POLICY_DEFAULT" – default node update policy hint.

---

## 1. Responsibilities

ConfigGate must:

- Store config values in **typed maps**:
  - `uint256` (counters, limits, thresholds),
  - `bool` (feature flags),
  - `address` (contract pointers).
- Enforce that only the configured admin (AdminGate) can mutate values.
- Emit detailed events on changes (old value, new value, key).
- Avoid becoming a "kill switch" for the chain.

---

## 2. Core State (high-level sketch)

- `uint256 public immutable chainId;`
- `address public adminGate;`
- `mapping(bytes32 => uint256) public uintConfig;`
- `mapping(bytes32 => bool) public boolConfig;`
- `mapping(bytes32 => address) public addressConfig;`

These keys are written by AdminGate (via MasterKey governance) and read by:

- Nodes (void-node) for runtime limits and feature flags.
- Agents and off-chain services for AI-related policies.

---

## 3. Update Flows (high-level)

- AdminGate (or another governance contract) is the only writer:
  - `setUint(bytes32 key, uint256 value)`
  - `setBool(bytes32 key, bool value)`
  - `setAddress(bytes32 key, address value)`
  - `setAdminGate(address newAdminGate)` for governance migration.

- Nodes can:
  - Treat ConfigGate as **authoritative** (hard-follow certain keys).
  - Or treat it as **advisory** (combine with local policy / overrides).

---

## 4. Security Notes

- No arbitrary external calls from ConfigGate.
- No direct "halt chain" or "pause consensus" controls.
- Changing `adminGate` must itself be a governed, audited step.
- Future versions may add:
  - Per-key roles / scopes.
  - AI-specific config domains (model allowlists, dataset policies).
