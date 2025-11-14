# VOID Network – AgentRegistry Contract Spec (v1, minimal)

AgentRegistry is the **on-chain registry of off-chain agents** that can work with
VOID JobQueue and other agent-facing contracts.

- An **agent** is an address that runs off-chain code (AI model, pipeline, worker).
- Agents may read jobs from `JobQueue`, execute them off-chain, and post receipts.
- The chain does *not* execute the AI; it just tracks which agent is which.

This v1 is deliberately simple:

- Any address can register itself as an agent.
- Each agent has:
  - `agentAddress` (the working address),
  - `owner` address (who controls metadata / settings),
  - `metadataURI` (points to off-chain JSON: models, capabilities, endpoints),
  - `active` flag (whether this agent wants jobs),
  - `trusted` flag (settable by the MasterKey).

Later versions can add:

- Staking / slashing.
- Score / reputation.
- Capability tags (e.g. "image", "code", "RAG") on-chain.
- Integration with UpdateGate / ConfigGate.

---

## 1. Responsibilities

AgentRegistry must:

- Let any address **register** itself as an agent.
- Track a stable `agentId` for each registered agent.
- Store basic metadata:
  - `agentAddress`
  - `owner`
  - `metadataURI`
  - `active` flag
  - `trusted` flag
  - `createdAt` / `updatedAt` (block numbers)
- Allow the **owner** to:
  - Update `metadataURI`.
  - Toggle `active` (opt in/out of being considered for jobs).
- Allow the **MasterKey** to:
  - Mark an agent as `trusted` / `untrusted`.
  - Force `active = false` (emergency off).
  - Optionally transfer ownership.

AgentRegistry must *not*:

- Enforce fee models.
- Enforce reputation or job matching.
- Execute any AI code on-chain.

Those are for off-chain infra and future versions.

---

## 2. Data model

```solidity
struct Agent {
    address agentAddress;
    address owner;
    string metadataURI;
    bool active;
    bool trusted;
    uint64 createdAt;
    uint64 updatedAt;
}

