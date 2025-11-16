# VOID Network – Agent OS v1 System Keys

This doc defines the canonical AdminGate keys for Agent OS v1 on VOID (chainId 2050).

These keys are written into `AdminGate` via `setSystemContract(bytes32,address)`
and can be read by off-chain infra (and, later, on-chain components) to discover
the core Agent OS contracts.

---

## 1. Components

Agent OS v1 consists of:

- `ModelRegistry` – directory of AI models.
- `JobQueue` – on-chain job registry.
- `ModelEvalRegistry` – registry of model evals/scores.
- `AgentRegistry` – on-chain directory of agents.
- `JobReceipts` – on-chain record of which agent handled which job and what
  receipt/output hash they committed.

On devnet, their addresses are tracked in:

- Protocol state: `docs/VOID-DEVNET-PROTOCOL-STATE.json`
- Agent OS state: `docs/VOID-DEVNET-AGENT-OS-STATE.json`

---

## 2. AdminGate system keys

AdminGate stores “well-known” contracts behind opaque keys:

- `keccak256("MODEL_REGISTRY")`        → `ModelRegistry` address
- `keccak256("JOB_QUEUE")`             → `JobQueue` address
- `keccak256("MODEL_EVAL_REGISTRY")`   → `ModelEvalRegistry` address
- `keccak256("AGENT_REGISTRY")`        → `AgentRegistry` address
- `keccak256("JOB_RECEIPTS")`          → `JobReceipts` address

These keys are **conventions** – off-chain VOID agents and infra should use the
same strings when looking up system contracts via AdminGate.

---

## 3. Devnet wiring

On devnet (chainId 2050):

- `AdminGate` is deployed and recorded in `docs/VOID-DEVNET-PROTOCOL-STATE.json`.
- Agent OS v1 contracts are deployed and recorded in
  `docs/VOID-DEVNET-AGENT-OS-STATE.json`.

The helper script:

- `ops/void-devnet-agentos-link-admin.sh`

reads both JSON files, loads the addresses, and calls `AdminGate.setSystemContract`
for the keys above using the devnet master key.

This lets:

- Off-chain agents resolve core contracts via AdminGate.
- Future on-chain components use the same discovery mechanism.

