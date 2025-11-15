# VOID Devnet – System Contracts Roadmap (2025-11-14)

This doc captures near-term steps for VOID devnet system contracts:
AdminGate, ConfigGate, ValidatorSet, JobQueue, AgentRegistry, DatasetRegistry, ModelRegistry.

We assume:
- ChainId = 2050 (devnet)
- Anvil on http://127.0.0.1:8545
- Core scripts already exist:
  - ops/void-devnet-stack.sh
  - ops/void-devnet-bootstrap-protocol.sh
  - ops/void-devnet-protocol-verify.sh
  - ops/void-devnet-system-bootstrap.sh
  - ops/void-devnet-bootstrap-stack.sh

---

## Phase 0 – Specs & skeletons (DONE)

- VOID-KEY-MODEL-V1.md
- UPDATEGATE-CONTRACT.md
- JOBQUEUE-CONTRACT.md
- AGENTREGISTRY-CONTRACT.md
- DATASETREGISTRY-CONTRACT.md
- MODELREGISTRY-CONTRACT.md
- VALIDATORSET-CONTRACT.md
- CONFIGGATE-CONTRACT.md
- VOID-SYSTEM-CONTRACTS-OVERVIEW-V1.md
- VOID-DEVNET-PLAYBOOK-V1.md
- VOID-DEVNET-STATUS-2025-11-14.md
- VOID-DEVNET-PROTOCOL-STATE.json (+ verify helpers)
- VOID-DEVNET-JOB-FLOW-V1.md (job demo skeleton)

Status: contracts compile, tests green, docs written. Devnet currently deploys:
- VoidToken
- AdminGate
and wires AdminGate.masterKey on devnet.

---

## Phase 1 – System contracts deploy script (devnet)

Goal: a single helper that deploys all system contracts and updates state JSON.

Planned artifacts:
- ops/void-devnet-system-deploy.sh
  - Inputs:
    - RPC_URL
    - DEVNET_PRIVKEY
  - Responsibilities:
    - Read VOID-DEVNET-PROTOCOL-STATE.json (VoidToken, AdminGate).
    - Deploy:
      - ConfigGate
      - ValidatorSet
      - AgentRegistry
      - DatasetRegistry
      - ModelRegistry
      - JobQueue
    - Wire required constructor args (AdminGate, chainId, etc.).
    - Emit final JSON snapshot:
      - docs/VOID-DEVNET-SYSTEM-STATE.json
        - includes all addresses + chainId + deployer.
- ops/void-devnet-system-verify.sh
  - Sanity:
    - chainId == 2050 (on-chain vs JSON)
    - AdminGate from JSON has code
    - ConfigGate/ValidatorSet/registries/JobQueue all have nonzero code
    - caller key matches deployer (optional, like protocol verify)

---

## Phase 2 – JobQueue end-to-end devnet demo

Goal: make JobQueue real on devnet and drive a tiny job lifecycle with `cast`.

Planned artifacts:
- Extend VOID-DEVNET-JOB-FLOW-V1.md:
  - Document a concrete “hello job” flow:
    - deploy system contracts (via system-deploy script)
    - register an Agent in AgentRegistry
    - register a Model and Dataset
    - post a Job to JobQueue
    - simulate an off-chain agent:
      - claim job
      - write a receipt
    - read back receipt & status on-chain.
- Upgrade ops/void-devnet-job-demo.sh:
  - Use SYSTEM-STATE JSON to:
    - call AgentRegistry.registerAgent(...)
    - call ModelRegistry.registerModel(...)
    - call DatasetRegistry.registerDataset(...)
    - call JobQueue.postJob(...)
    - call JobQueue.claimJob(...)
    - call JobQueue.completeJob(...)
  - Print a concise summary (jobId, agent, status, receipt hash).

---

## Phase 3 – Integration & hardening

- Extend VOID-DEVNET-PLAYBOOK-V1.md:
  - “one command” bootstrap path:
    - start anvil
    - run bootstrap stack
    - run system-deploy
    - run job demo
- CI enhancements:
  - Update .github/workflows/void-devnet-stack.yml to:
    - spin up anvil (chainId 2050)
    - run:
      - ops/void-devnet-bootstrap-stack.sh
      - ops/void-devnet-system-deploy.sh
      - ops/void-devnet-system-verify.sh
      - ops/void-devnet-job-demo.sh
- Future:
  - add gas / event snapshots for system-contract flows
  - add invariants/Foundry tests around JobQueue + registries
  - link UpdateGate/AdminGate/ConfigGate into VOID node upgrade story.

---

## Notes

- All of this remains **devnet-only**; no mainnet keys, no real value.
- System contracts will later be mirrored on VOID mainnet (chainId 2050) once
  VOID node is ready, with a stricter key model and rotation plan.
