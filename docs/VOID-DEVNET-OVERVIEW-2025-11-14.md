# VOID Devnet Overview – 2025-11-14

This document is the **map** of the current VOID devnet setup on chainId **2050**.

It links the key scripts, docs, and contracts we’ve wired up so far so that
Future Us (and contributors) can understand the moving pieces quickly.

---

## 1. Devnet core

**Chain / RPC**

- Chain ID: `2050`
- Local RPC: `http://127.0.0.1:8545`
- Default dev key: Anvil account 0 (used via `DEVNET_PRIVKEY` env var)

**Token + Admin**

- `VoidToken` – capped ERC-20 with premine to deployer.
- `AdminGate` – core admin/master key switchboard and system-contract registry.

Authoritative snapshots:

- `docs/VOID-DEVNET-DEPLOY-ADDRESSES.json`
- `docs/VOID-DEVNET-PROTOCOL-STATE.json`

These are kept in sync via:

- `ops/void-devnet-stack.sh`
- `ops/void-devnet-bootstrap-protocol.sh`
- `ops/void-devnet-protocol-verify.sh`
- `ops/void-devnet-bootstrap-stack.sh`

---

## 2. Devnet playbook

End-to-end “how to run this” lives in:

- `docs/VOID-DEVNET-PLAYBOOK-V1.md`

It covers:

1. Starting Anvil on chainId 2050.
2. Running the full bootstrap stack:
   - tests,
   - VoidToken + AdminGate deploy,
   - protocol snapshot,
   - AdminGate masterKey bootstrap.
3. Sanity checks.

---

## 3. System contracts (AI / governance layer)

Design docs:

- `docs/VOID-SYSTEM-CONTRACTS-OVERVIEW-V1.md`
- `docs/VOID-DEVNET-SYSTEM-CONTRACTS-PLAN-V1.md`
- `docs/VOID-DEVNET-SYSTEM-CONTRACTS-ROADMAP-2025-11-14.md`

Per-contract specs / stubs:

- `docs/JOBQUEUE-CONTRACT.md` – Job registry + lifecycle.
- `docs/AGENTREGISTRY-CONTRACT.md` – Agent identities, trust, and activity.
- `docs/DATASETREGISTRY-CONTRACT.md` – Dataset ownership + metadata.
- `docs/MODELREGISTRY-CONTRACT.md` – Model ownership, versioning, trust.
- `docs/VALIDATORSET-CONTRACT.md` – Validator identities + stake + activity.
- `docs/CONFIGGATE-CONTRACT.md` – Chain-wide config registry keyed by (slot, type).

These mirror the existing Foundry tests:

- `AdminGate.t.sol`
- `ConfigGate.t.sol`
- `ValidatorSet.t.sol`
- `AgentRegistry.t.sol`
- `DatasetRegistry.t.sol`
- `ModelRegistry.t.sol`
- `JobQueue.t.sol`

All of them are currently **green** on devnet via `ops/void-devnet-stack.sh`.

---

## 4. Devnet job / agent flow

Early design + demo:

- `docs/VOID-DEVNET-JOB-FLOW-V1.md`
- `ops/void-devnet-job-demo.sh`

Current status:

- Demo script **does not** yet deploy JobQueue / registries.
- It reads the protocol snapshot and prints how future flows will look:
  - deploy Agent/Dataset/Model registries + JobQueue,
  - register an agent/model/dataset,
  - post a job,
  - simulate claim + completion,
  - record a receipt hash on-chain.

Once we standardize deployment scripts for these contracts, the demo will be
upgraded into a real end-to-end JobQueue flow.

---

## 5. Key / governance model

High-level governance & key model:

- `docs/VOID-KEY-MODEL-V1.md`

Core decisions:

- Network remains **decentralized** – validators and users keep operating even if
  our “master influence” keys vanish.
- No hard on-chain “god key” that can arbitrarily rewrite history.
- We keep **soft power** via:
  - AdminGate + system contracts,
  - economic weight,
  - social coordination,
  - the ability to propose and ship reference client updates.
- If a catastrophic key loss ever happens, we **fork from the last good state**
  and mint a new coordination key, with the chain’s survival not depending
  on any single secret.

---

## 6. Devnet automation / CI

GitHub Actions workflow:

- `.github/workflows/void-devnet-stack.yml`

Current behavior:

- Spins up Anvil on chainId 2050.
- Runs the full devnet bootstrap stack:
  - contract tests,
  - VoidToken + AdminGate deploy,
  - protocol snapshot,
  - protocol verify,
  - AdminGate masterKey bootstrap.

This ensures PRs don’t accidentally break the devnet boot sequence.

---

## 7. Next steps (short list)

Implementation side (code):

1. Wire actual deployment scripts for:
   - AgentRegistry / DatasetRegistry / ModelRegistry / JobQueue.
2. Extend `VOID-DEVNET-PROTOCOL-STATE.json` (or a new `SYSTEM-STATE.json`) to
   track these addresses.
3. Upgrade `ops/void-devnet-job-demo.sh` into a real end-to-end flow that:
   - deploys the system contracts (if missing),
   - registers an agent/model/dataset,
   - posts a job,
   - simulates an agent claiming/completing it,
   - records and verifies a receipt.

Documentation side:

1. Fill out the stub specs for:
   - AgentRegistry, DatasetRegistry, ModelRegistry, ValidatorSet.
2. Add minimal “parameter tables”:
   - constructor arguments,
   - key storage fields,
   - relevant events.

This overview should stay close to reality. When something major changes in the
devnet stack, update this file alongside the change so it remains a reliable map.
