# VOID Network – AgentRegistry Contract Spec (v1, minimal)

AgentRegistry is the **on-chain directory of agents** that are allowed to
pick up jobs in JobQueue and report outputs/evals off-chain.

- It does NOT run jobs.
- It does NOT enforce economics (no stake/slashing in v1).
- It does NOT enforce policy – it only stores tags and metadata.

Policy and economics are handled by other components (PolicyGuard,
AdminGate, off-chain infra, or future versions).

---

## 1. Responsibilities

AgentRegistry must:

- Store entries keyed by a human-readable `agentId` (string).
- Track the current **owner address** for each agent.
- Track the **agent runtime address** (where callbacks/identities come from).
- Track **capabilities** and **policy tags** as opaque metadata.
- Allow enabling/disabling agents.
- Emit events on registration and updates.

AgentRegistry cannot:

- Guarantee that an off-chain process actually matches the metadata.
- Enforce model compatibility or job correctness.
- Directly move funds or control user balances.

Those responsibilities belong to **off-chain agents**, **PolicyGuard**,
**JobQueue**, and higher-level economics.

---

## 2. Data model

### 2.1. Types

- `AgentId` – string (e.g. "void-agent/mainnet-router-1")
- `Owner` – `address` (control key / admin)
- `RuntimeAddr` – `address` (address used when interacting with JobReceipts)
- `PolicyTag` – `bytes32` (optional policy tag reference)
- `CapabilitiesHash` – `bytes32` (e.g. hash of a JSON capabilities doc)
- `Metadata` – string (JSON recommended)

### 2.2. Storage (conceptual)

For each `agentId`:

- `owner: address`
- `runtime: address`
- `policyTag: bytes32`
- `capabilitiesHash: bytes32`
- `metadata: string`
- `active: bool`
- `createdAt: uint64`
- `updatedAt: uint64`

Additional:

- `isRegistered[agentId] -> bool`
- Global `admin` or AdminGate reference.

---

## 3. Core functions

### 3.1. registerAgent

`registerAgent(agentId, runtime, policyTag, capabilitiesHash, metadata)`

- New agent:
  - `require(!isRegistered[agentId])`
  - `owner = msg.sender` (or admin).
  - `runtime = runtime`.
  - `policyTag = policyTag`.
  - `capabilitiesHash = capabilitiesHash`.
  - `metadata = metadata`.
  - `active = true`.
  - `createdAt = block.timestamp`.
  - `updatedAt = block.timestamp`.
  - `isRegistered[agentId] = true`.
- Existing agent:
  - REVERT in v1 (no re-register; use update functions).
- Emit `AgentRegistered`.

### 3.2. setAgentActive

`setAgentActive(agentId, active)`

- Require:
  - `isRegistered[agentId]`
  - caller is `owner` or `admin`.
- Set `active` flag.
- Update `updatedAt`.
- Emit `AgentActivationChanged`.

### 3.3. updateAgentRuntime

`updateAgentRuntime(agentId, newRuntime)`

- Require:
  - `isRegistered[agentId]`
  - caller is `owner` or `admin`.
- Set `runtime = newRuntime`.
- Update `updatedAt`.
- Emit `AgentRuntimeUpdated`.

### 3.4. updateAgentMeta

`updateAgentMeta(agentId, policyTag, capabilitiesHash, metadata)`

- Require:
  - `isRegistered[agentId]`
  - caller is `owner` or `admin`.
- Update `policyTag`, `capabilitiesHash`, `metadata`.
- Update `updatedAt`.
- Emit `AgentMetaUpdated`.

### 3.5. transferAgentOwnership

`transferAgentOwnership(agentId, newOwner)`

- Require:
  - `isRegistered[agentId]`
  - caller is current `owner` or `admin`.
- Set `owner = newOwner`.
- Update `updatedAt`.
- Emit `AgentOwnershipTransferred`.

---

## 4. View functions (for JobReceipts and agents)

Read-only helpers:

- `getAgentOwner(agentId) -> address`
- `getAgentRuntime(agentId) -> address`
- `getAgentMeta(agentId) -> (policyTag, capabilitiesHash, metadata)`
- `isAgentActive(agentId) -> bool`
- `isRegistered(agentId) -> bool`

Optional helpers:

- `getAgent(agentId) -> (owner, runtime, policyTag, capabilitiesHash, metadata, active, createdAt, updatedAt)`

Typical flow:

1. Off-chain infra knows `agentId`.
2. Resolve `agentId` → `runtime` and `active`.
3. Check `active`.
4. Read `policyTag` / `capabilitiesHash` / `metadata` for routing.

---

## 5. Access control & integration

### 5.1. Admin

- `admin` (or AdminGate) can:
  - Force-register agents.
  - Override `owner`.
  - Force-disable agents.
- Normal operations:
  - `owner` is the main control key.
  - `runtime` can be changed without changing `owner`.

### 5.2. Integration with JobQueue / JobReceipts

- JobReceipts can:
  - Require that `isAgentActive(agentId)` is true.
  - Use `getAgentRuntime(agentId)` to verify caller identity.
- PolicyGuard can:
  - Use `policyTag` and `capabilitiesHash` to decide if an agent is
    allowed to handle a given job type or model.

---

## 6. Events (suggested)

```solidity
event AgentRegistered(
    string agentId,
    address owner,
    address runtime,
    bytes32 policyTag,
    bytes32 capabilitiesHash,
    string metadata
);

event AgentActivationChanged(
    string agentId,
    bool active
);

event AgentRuntimeUpdated(
    string agentId,
    address oldRuntime,
    address newRuntime
);

event AgentMetaUpdated(
    string agentId,
    bytes32 policyTag,
    bytes32 capabilitiesHash,
    string metadata
);

event AgentOwnershipTransferred(
    string agentId,
    address oldOwner,
    address newOwner
);
7. v2+ extension points
Future versions may add:

Stake and slashing (bonded agents).

Reputation scores (aggregated from JobReceipts).

Rate limits / quotas per agent or per policyTag.

Links to ModelRegistry (e.g. "this agent supports models X/Y/Z").
