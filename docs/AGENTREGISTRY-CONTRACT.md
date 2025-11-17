# VOID Network – AgentRegistry Contract Spec (v1, minimal)

AgentRegistry is the directory of off-chain agents that execute VOID jobs.

- An agent is anything that reads jobs (from JobQueue or JSONL),
  runs AI/model work, and submits receipts (to ReceiptRegistry or JSONL).
- AgentRegistry tracks who the agents are, what they claim to support,
  and whether they are allowed to post receipts for certain models.

This contract does not manage payouts or stakes. It is a source of
identity, capability, and authorization.

---

## 1. Responsibilities

AgentRegistry must:

- Register agents with:
  - owner address
  - agent name or id
  - endpoint or metadata URI
  - supported models
- Allow admins to enable or disable agents.
- Provide a cheap isAuthorized(agent, modelId) check for:
  - JobQueue (future)
  - ReceiptRegistry (for submitReceipt)
  - off-chain policy engines.

AgentRegistry must NOT:

- Run AI work.
- Decide payouts or slashing directly.
- Store large metadata blobs (use external URIs).

---

## 2. Data model

Conceptual agent struct:

    struct Agent {
        address owner;    // who controls this agent
        bool    active;   // is it allowed to operate
        string  name;     // human-readable name / id
        string  metaURI;  // pointer to larger metadata (IPFS/HTTPS)
    }

Capabilities:

    mapping(bytes32 => bool) caps;

Where key = keccak256(abi.encode(agentAddr, modelId)).

Storage:

- mapping(address => Agent) agents by address.
- Optionally mapping(bytes32 => address) by agentId (future).

---

## 3. Core functions (v1)

### 3.1 registerAgent

    function registerAgent(
        address agentAddr,
        string calldata name,
        string calldata metaURI
    ) external;

Behavior:

- Caller must be admin (strict v1).
- If agent does not exist, create it with active = true.
- Emit AgentRegistered(agentAddr, name, metaURI).

### 3.2 setAgentActive

    function setAgentActive(address agentAddr, bool active) external;

- Only admin.
- Used to approve or ban agents.
- Emit AgentStatusChanged(agentAddr, active).

### 3.3 setAgentCapabilities

    function setAgentCapabilities(
        address agentAddr,
        string[] calldata modelIds,
        bool allowed
    ) external;

- Only admin (v1).
- For each modelId:
  - caps[keccak256(abi.encode(agentAddr, modelId))] = allowed.
- Emit AgentCapabilitiesUpdated(agentAddr, modelIds, allowed).

### 3.4 isAuthorized

    function isAuthorized(
        address agentAddr,
        string calldata modelId
    ) external view returns (bool);

Returns:

    agents[agentAddr].active &&
    caps[keccak256(abi.encode(agentAddr, modelId))];

ReceiptRegistry and any other contract can use this for authorization.

---

## 4. Events

    event AgentRegistered(
        address indexed agent,
        string  name,
        string  metaURI
    );

    event AgentStatusChanged(
        address indexed agent,
        bool    active
    );

    event AgentCapabilitiesUpdated(
        address indexed agent,
        string[] modelIds,
        bool     allowed
    );

Events allow indexers to build a live directory of:

- Which agents exist.
- Which models each supports.
- Whether each agent is currently allowed to operate.

---

## 5. Admin / control

AgentRegistry has a single admin, ideally the same AdminGate that controls
ModelRegistry, JobQueue, and ReceiptRegistry.

Admin can:

- Register agents.
- Toggle active status.
- Change capabilities and metaURI.

Future versions can add richer role systems (owner vs admin vs delegate), but
v1 stays simple.

---

## 6. Integration with ReceiptRegistry

ReceiptRegistry should have an optional AgentRegistry address.

- If agentRegistry == address(0):
  - submitReceipt does not enforce agent auth.
- If agentRegistry != address(0):
  - submitReceipt must require:
    - AgentRegistry.isAuthorized(msg.sender, modelId) == true.

Migration path:

- Devnet / early testnets: allow any address, or only soft-enforce via metrics.
- Mainnet: enforce that only registered agents can post receipts for certain models.

Off-chain metrics (future):

- receipts per agent
- coverage per agent and model
- failure rates and latency per agent

These follow the same pattern as the current per-model Prometheus metrics and alerts.

---

## 7. Integration with JobQueue (future)

JobQueue can optionally use AgentRegistry for:

- Validating agents when they claim jobs.
- Implementing on-chain assignment flows.

For v1, JobQueue does not depend on AgentRegistry. The key consumer is
ReceiptRegistry, which uses it to gate receipt submissions.

---

## 8. Mapping to current devnet

Today:

- ops/devnet/jobs.jsonl has an agentHint field.
- ops/devnet/receipts.jsonl has an agent field.

These map conceptually to:

- AgentRegistry entries (on-chain identity and capability).
- Agent addresses that sign and submit real transactions.

Real agents later will have:

- An EVM address for signing and posting receipts.
- A name and metaURI that describe:
  - supported models
  - endpoints
  - hardware details
  - optional attestation info

Prometheus metrics already track global and per-model coverage. With
AgentRegistry + ReceiptRegistry on-chain, we can extend to per-agent metrics
and alerts without changing the overall pattern.
