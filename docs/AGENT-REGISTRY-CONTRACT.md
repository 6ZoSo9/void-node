# VOID Network – AgentRegistry Contract Spec (v1, minimal)

AgentRegistry is the on-chain directory of **off-chain AI agents** that are allowed
to serve models for VOID.

It does *not* run any models or enforce inference. It only tracks:

- Which agent addresses exist
- Their owner/admin
- Their status (active / inactive)
- Which modelIds each agent is allowed to serve
- Optional metadata about runtime, policy, and capabilities

Off-chain infra (Obelisk agents, schedulers) use this registry as the
authoritative list of “who is allowed to serve which models”.

---

## 1. Responsibilities

AgentRegistry must:

- Track agents keyed by **agent address** (not ENS, not string IDs).
- Store a small `AgentInfo` struct per agent with:
  - `owner` (address)
  - `active` (bool)
  - `runtime` (string, e.g. "openai:gpt-4.1-mini")
  - `policyTag` (string, e.g. "default-sfw-v1")
  - `capsHash` (bytes32, hash of capability JSON)
  - `metadataURI` (string, optional URI/JSON pointer)
- Maintain a permission map “agent X can serve modelId Y”.
- Allow updating:
  - Agent metadata
  - Active flag
  - Ownership
  - Model permissions
- Emit events any time the above change.

AgentRegistry cannot:

- Force an agent to actually run jobs (off-chain infra decides).
- Guarantee agent correctness or uptime.
- Enforce payment / staking (that’s for other contracts).

It’s a **directory + policy surface**, not a scheduler or payment system.

---

## 2. Roles & Access Control

There are two main roles:

1. **Admin**
   - Usually set to `AdminGate` on-chain.
   - Can register new agents, set metadata, toggle active, grant/revoke models.
   - Can transfer admin if the governance structure changes.

2. **Agent owner**
   - The address stored in `AgentInfo.owner`.
   - May be allowed to:
     - Update some metadata fields.
     - Request deactivation.
     - Rotate the agent’s serving address (optional, depending on final design).

The contract uses an `onlyAdmin` modifier:

- `onlyAdmin`: `msg.sender == admin`
- Admin is expected to be AdminGate on chainId 2050 for VOID.

Implementation detail already present in code:

- There is a modifier `onlyAdmin()` that checks `msg.sender == admin`.
- There are internal helpers that use `keccak256(abi.encode(agentAddr, modelId))`
  to map `(agentAddr, modelId)` to some boolean permission flag.

---

## 3. Data Model

### 3.1 Agent identity

- **AgentId** is simply an `address`:
  - `agentAddr` (the address that signs/executes calls on behalf of the agent).

### 3.2 AgentInfo struct

Expected shape (conceptually):

- `address owner;`
  - Logical owner of the agent (could be the same as `agentAddr`, a multisig,
    or some controller).

- `bool active;`
  - When `false`, agents should not be considered for new jobs.

- `string runtime;`
  - Free-form runtime description, like:
    - `"openai:gpt-4.1-mini"`
    - `"local:llama-3-8b"`
    - `"hf:meta-llama/Llama-3-8B-Instruct"`

- `string policyTag;`
  - Policy or safety profile the agent claims to follow:
    - `"void-default-v1"`
    - `"nsfw-blocking-v2"`

- `bytes32 capsHash;`
  - Hash of an off-chain JSON document that describes:
    - Max context size
    - Max tokens
    - Supported tools, modalities, etc.
  - The JSON lives off-chain; only the hash is on-chain.

- `string metadataURI;`
  - Optional URI or pointer to richer metadata:
    - IPFS CID
    - HTTPS URL
    - VoidChain dataset / manifest reference

### 3.3 Model permissions

Agents are tied to `modelId` strings, same as used in ModelRegistry:

- `modelId` examples:
  - `"gpt-4.1-mini"`
  - `"void-embed-v1"`
  - `"nullfeed-moderation-v1"`

The contract maintains a map approximately like:

- `mapping(bytes32 => bool) internal _agentModelAllowed;`
- `bytes32 key = keccak256(abi.encode(agentAddr, modelId));`

Semantics:

- `_agentModelAllowed[key] == true` means:
  - “Agent at `agentAddr` is allowed to serve requests for `modelId`.”

---

## 4. Core Functions (conceptual)

Names may differ slightly in code, but conceptually we expect:

### 4.1 registerAgent

- `registerAgent(address agentAddr, string runtime, string policyTag, bytes32 capsHash, string metadataURI) external onlyAdmin`

Behavior:

- If `agentAddr` has no entry yet:
  - Create `AgentInfo` with:
    - `owner = agentAddr`
    - `active = true`
    - `runtime`, `policyTag`, `capsHash`, `metadataURI` as supplied.
- If it already exists:
  - Optionally treat this as an update, or revert.
- Emit `AgentRegistered(agentAddr, owner, runtime, policyTag, capsHash, metadataURI)`.

### 4.2 updateAgentMetadata

- `updateAgentMetadata(address agentAddr, string runtime, string policyTag, bytes32 capsHash, string metadataURI) external onlyAdmin`

Behavior:

- Requires `agentAddr` exists.
- Updates the metadata fields.
- Does not change owner or active flag.
- Emits `AgentMetadataUpdated(agentAddr, runtime, policyTag, capsHash, metadataURI)`.

### 4.3 setAgentActive

- `setAgentActive(address agentAddr, bool active) external onlyAdmin`

Behavior:

- Requires `agentAddr` exists.
- Sets `AgentInfo.active`.
- Emits `AgentStatusChanged(agentAddr, active)`.

### 4.4 setAgentModels

- `setAgentModels(address agentAddr, string[] memory modelIds, bool allowed) external onlyAdmin`

Behavior:

- For each `modelId`:
  - Compute `key = keccak256(abi.encode(agentAddr, modelId));`
  - Set `_agentModelAllowed[key] = allowed;`
- Emits `AgentModelsUpdated(agentAddr, modelIds[], allowed)`.

### 4.5 transferAgentOwnership (optional)

- `transferAgentOwnership(address agentAddr, address newOwner) external onlyAdmin`

Behavior:

- Update `AgentInfo.owner`.
- Emit `AgentOwnershipTransferred(agentAddr, oldOwner, newOwner)`.

---

## 5. Read API

Read functions are cheap view calls used by wallets, agents, and infra.

Expected helpers:

- `getAgent(address agentAddr) external view returns (AgentInfo memory)`
  - Full struct lookup.

- `isAgentActive(address agentAddr) external view returns (bool)`
  - Returns `AgentInfo.active`.

- `isAgentAllowed(address agentAddr, string memory modelId) external view returns (bool)`
  - Returns `_agentModelAllowed[keccak256(abi.encode(agentAddr, modelId))]`.

- Optional:
  - `getAgentOwner(address agentAddr) external view returns (address)`
  - `getAgentRuntime(address agentAddr) external view returns (string memory)`
  - etc.

Off-chain VOID agent schedulers will typically:

1. Resolve candidate agents for a given modelId.
2. Filter to `active == true`.
3. Apply any external health / latency / cost heuristics.

---

## 6. Events

Likely events we want (some may already exist, some can be added later):

- `event AgentRegistered(address indexed agent, address indexed owner, string runtime, string policyTag, bytes32 capsHash, string metadataURI);`

- `event AgentMetadataUpdated(address indexed agent, string runtime, string policyTag, bytes32 capsHash, string metadataURI);`

- `event AgentStatusChanged(address indexed agent, bool active);`

- `event AgentModelsUpdated(address indexed agent, string[] modelIds, bool allowed);`

- `event AgentOwnershipTransferred(address indexed agent, address indexed oldOwner, address indexed newOwner);`

These events let us reconstruct the registry state from logs and feed secondary indexes.

---

## 7. Devnet wiring and future mainnet

### 7.1 Devnet

On devnet:

- `chainId = 2050`
- `admin` for AgentRegistry should be set to `AdminGate` (same as ModelRegistry, JobQueue).
- The state file (docs/VOID-DEVNET-PROTOCOL-STATE.json) will eventually add:

  - `"AgentRegistry": { "address": "...", "chainId": 2050, "contract": "AgentRegistry", "source": "contracts/AgentRegistry.sol" }`

- Exporters and Prom rules can then check:
  - `AgentRegistry.admin == AdminGate`
  - Basic health of AgentRegistry (e.g., view calls succeed).

### 7.2 Mainnet

For mainnet:

- Same contract, same semantics, different addresses.
- A mainnet state file mirrors the devnet structure.
- Scripts and exporters read addresses from the state file, so swapping devnet/mainnet is just:
  - “Use a different JSON file” instead of editing code.

---

## 8. Invariants & Safety

AgentRegistry should maintain:

1. **Admin invariants**
   - `admin` must always be a trusted control point (AdminGate on mainnet).
   - Only `admin` can change agent permissions or metadata.

2. **Existence checks**
   - No operations on unknown agents (except register).
   - `setAgentModels` and `setAgentActive` should require `agentAddr` exists.

3. **No silent overwrites**
   - Re-registering an existing agent should either:
     - Be treated as an explicit update with clear semantics, or
     - Revert and force the caller to use a dedicated “update” function.

4. **Model permission integrity**
   - The `(agentAddr, modelId)` mapping must be consistent:
     - No implicit wildcards or hidden defaults.
     - If `_agentModelAllowed[key]` is `false`, the agent is not allowed.

---

## 9. How this ties into the bigger VOID AI stack

- **ModelRegistry** says: “These models exist, owned by X, with hash Y.”
- **AgentRegistry** says: “These agents exist and are allowed to serve models A/B/C.”
- **JobQueue** says: “These jobs were posted and completed (with on-chain receipts later).”
- Off-chain:
  - Obelisk agents:
    - Read ModelRegistry + AgentRegistry + JobQueue.
    - Decide who runs what, generate receipts, and push them into ReceiptRegistry / JobReceipts and off-chain logs.

This spec locks in how agents are represented on-chain, while letting us swap out
backends (OpenAI, local models, other providers) without changing the core chain.

