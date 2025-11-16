# VOID Network – AgentRegistry Contract Spec (v1, minimal)

AgentRegistry is the on-chain directory of VOID agents.

An "agent" is an off-chain worker or service that:
- Reads jobs from JobQueue.
- Runs models/datasets off-chain.
- Writes back receipts to ReceiptRegistry or the VOID node.

AgentRegistry does NOT run agents or enforce uptime. It only tracks:
- Which agents exist
- Who owns them
- What model(s)/dataset(s) they claim to serve
- How to reach them (endpoint / metadata)
- Whether they are active

---

## 1. Responsibilities

AgentRegistry must:

- Store entries keyed by a numeric agentId (uint256).
- Emit events when agents are registered or updated.
- Track ownership per agent.
- Allow deactivating an agent without deleting its history.
- Be governed by a master key for global controls (masterKey).

AgentRegistry cannot:

- Force an agent to actually run or respond.
- Guarantee that an agent uses the claimed models/datasets.
- Enforce SLAs or quality guarantees on-chain.

---

## 2. Data Model (intent)

Each agent has a numeric id: agentId (uint256).

For each agentId, the registry stores a struct:

- owner: address         // who controls this agent entry
- endpoint: string       // optional: URL / URI / void:// endpoint
- modelHint: string      // e.g. "void-agent-devnet-demo-1"
- datasetHint: string    // optional dataset linkage (free-form or id encoded)
- active: bool           // whether this agent is available for routing
- createdAt: uint64
- updatedAt: uint64
- meta: string           // optional JSON/YAML/CBOR manifest (opaque)

Solidity implementation: mapping(uint256 => Agent) public agents;
the exact fields live in contracts/AgentRegistry.sol.

---

## 3. Roles and Permissions

### Master (masterKey)

- May register bootstrap/system agents.
- May perform emergency actions if implemented
  (e.g., force-deactivate a compromised agent entry).

### Owner (per-agent)

- Set on first registration.
- Can update endpoint, hints, meta, and active flag.
- Can voluntarily deactivate their agent.

---

## 4. Interaction with Other VOID Components

- **JobQueue**:
  - Jobs may include an `agentId` hint or policy may choose agents
    based on AgentRegistry fields (modelHint, datasetHint, active).

- **ModelRegistry / DatasetRegistry**:
  - Off-chain tooling is expected to correlate `modelHint` and
    `datasetHint` with concrete entries in ModelRegistry/DatasetRegistry.
  - Policy layers may require that hints resolve to active entries.

- **ReceiptRegistry / Node policy**:
  - When a receipt claims it was produced by `agentId`,
    nodes/validators can look up that agent and:
    - Check that it was active at the time.
    - Check that its hints/policy allow the claimed job type.
    - Export observability metrics keyed by `agentId`.

AgentRegistry provides a canonical mapping from agentId to metadata,
ownership, and activity flags. It does not, by itself, guarantee that
agents behave; it simply gives VOID a shared directory for agents that
the rest of the system (and monitoring) can reference.
