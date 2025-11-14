# VOID Network – ConfigGate AI Pointer Keys (v1)

This doc defines the canonical ConfigGate keys for VOID's AI contracts on chainId 2050.

These keys are used by:
- void-node (to discover JobQueue and registries),
- Obelisk Wallet / agents,
- off-chain infra.

All keys are bytes32 = keccak256("<NAME>") with uppercase ASCII names.

1) Contract address pointers (stored in addressConfig):

- VOID_AI_JOBQUEUE
  - addressConfig[keccak256("VOID_AI_JOBQUEUE")] = address(JobQueue)

- VOID_AI_AGENT_REGISTRY
  - addressConfig[keccak256("VOID_AI_AGENT_REGISTRY")] = address(AgentRegistry)

- VOID_AI_MODEL_REGISTRY
  - addressConfig[keccak256("VOID_AI_MODEL_REGISTRY")] = address(ModelRegistry)

- VOID_AI_DATASET_REGISTRY
  - addressConfig[keccak256("VOID_AI_DATASET_REGISTRY")] = address(DatasetRegistry)

- VOID_AI_RECEIPT_REGISTRY
  - addressConfig[keccak256("VOID_AI_RECEIPT_REGISTRY")] = address(ReceiptRegistry)

These are the authoritative pointers for the v1 AI infra on mainnet.

2) Optional policy / limit keys (stored in uintConfig / boolConfig):

- VOID_AI_MAX_JOBS_PER_BLOCK (uint256)
  - Soft/hard cap on how many JobQueue posts per block nodes should accept.

- VOID_AI_MAX_JOB_TTL_BLOCKS (uint256)
  - Advisory TTL in blocks; jobs older than this may be treated as expired by agents.

- VOID_AI_ALLOW_UNTRUSTED_AGENTS (bool)
  - If false, nodes/agents should ignore jobs completed by agents with trusted == false.

- VOID_AI_ALLOW_UNTRUSTED_MODELS (bool)
  - If false, nodes/agents should ignore receipts referencing models with trusted == false.

ConfigGate only stores these values. Enforcement is up to:
- void-node policy code,
- Obelisk Wallet,
- agents and off-chain infra.

3) Governance and upgrades

- Only AdminGate (governed by MasterKey) may mutate these keys.
- Upgrading to v2 contracts:
  - Deploy new contracts,
  - Update the relevant VOID_AI_* address keys to the new addresses,
  - Record the change in UpdateGate and docs.

VOID remains permissionless; these keys just define the canonical AI stack that nodes and wallets should follow by default.
