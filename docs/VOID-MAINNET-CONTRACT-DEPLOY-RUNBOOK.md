# VOID Mainnet v1 – Governance + AI Contract Deploy Runbook

This runbook is for deploying the core governance + AI contracts on VOID mainnet (chainId 2050).

Assumptions:
- void-node mainnet genesis is fixed.
- A MasterKey (EOA or multisig) exists.
- Deployment wallet is funded with VOID.

1) Deployment order

1. Deploy AdminGate.
2. Deploy UpdateGate and wire it to AdminGate.
3. Deploy ConfigGate with:
   - chainId = 2050
   - adminGate = address(AdminGate)
4. Deploy AI contracts:
   - JobQueue
   - AgentRegistry (masterKey = MasterKey)
   - ModelRegistry (masterKey = MasterKey)
   - DatasetRegistry (masterKey = MasterKey)
   - ReceiptRegistry
5. Set ConfigGate AI address pointers.
6. Optionally set AI policy keys in ConfigGate.
7. Publish a signed deployment manifest and its hash.

2) Governance contracts

- Deploy AdminGate.
- Deploy UpdateGate pointing at AdminGate.
- Deploy ConfigGate(chainId = 2050, adminGate = AdminGate).

Record:
- ADMIN_GATE_ADDRESS
- UPDATE_GATE_ADDRESS
- CONFIG_GATE_ADDRESS

3) AI contracts

Deploy:

- JobQueue jobQueue = new JobQueue();
- AgentRegistry agentRegistry = new AgentRegistry(MASTER_KEY);
- ModelRegistry modelRegistry = new ModelRegistry(MASTER_KEY);
- DatasetRegistry datasetRegistry = new DatasetRegistry(MASTER_KEY);
- ReceiptRegistry receiptRegistry = new ReceiptRegistry();

Record:
- JOBQUEUE_ADDRESS
- AGENTREGISTRY_ADDRESS
- MODELREGISTRY_ADDRESS
- DATASETREGISTRY_ADDRESS
- RECEIPTREGISTRY_ADDRESS

4) Set ConfigGate AI pointers

Using AdminGate / governance flow, call ConfigGate.setAddress for:

- VOID_AI_JOBQUEUE          -> JOBQUEUE_ADDRESS
- VOID_AI_AGENT_REGISTRY    -> AGENTREGISTRY_ADDRESS
- VOID_AI_MODEL_REGISTRY    -> MODELREGISTRY_ADDRESS
- VOID_AI_DATASET_REGISTRY  -> DATASETREGISTRY_ADDRESS
- VOID_AI_RECEIPT_REGISTRY  -> RECEIPTREGISTRY_ADDRESS

Keys are keccak256 of the string names, as defined in CONFIG-GATE-AI-POINTERS.md.

5) Optional AI policy keys

Recommended initial values (can be tuned later):

- VOID_AI_MAX_JOBS_PER_BLOCK      (uint)
  - Example: 1024
- VOID_AI_MAX_JOB_TTL_BLOCKS      (uint)
  - Example: 7200 (~24h if 12s blocks)
- VOID_AI_ALLOW_UNTRUSTED_AGENTS  (bool)
  - Example: true for mainnet 1
- VOID_AI_ALLOW_UNTRUSTED_MODELS  (bool)
  - Example: true for mainnet 1

Nodes and agents can treat them as hard or soft rules depending on local policy.

6) Deployment manifest

After deployment, create a JSON manifest with:

- network: "VOID"
- chainId: 2050
- version: "mainnet-1"
- contracts:
  - AdminGate, UpdateGate, ConfigGate
  - JobQueue, AgentRegistry, ModelRegistry, DatasetRegistry, ReceiptRegistry
- timestamp (ISO8601)
- commit (git SHA)
- notes

Hash the JSON with keccak256 and record the hash in UpdateGate and/or docs.

7) Node / agent behavior

Once this runbook is executed:

- void-node mainnet builds can:
  - Discover AI contract addresses via ConfigGate.
  - Log or enforce AI policy keys.
- Obelisk Wallet and agents can:
  - Discover JobQueue and registries via ConfigGate.
  - Read metadata from AgentRegistry, ModelRegistry, DatasetRegistry.
  - Write receipts into ReceiptRegistry.

This completes the on-chain skeleton needed for VOID's AI-centered mainnet 1.
