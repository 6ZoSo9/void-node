# VOID Devnet Checklist – Protocol v1

This doc tracks what *must* be true before we call the devnet protocol "v1 ready".

---

## 1. Contracts layer

- [x] Core governance contracts implemented and tested:
  - AdminGate
  - ConfigGate
  - ValidatorSet
  - JobQueue
  - AgentRegistry
  - ModelRegistry
  - DatasetRegistry
  - VoidToken (max 666,666,666, premine 230,000,000)
- [x] Foundry test suite green in CI.
- [x] Devnet deploy script exists for VoidToken + AdminGate.
- [ ] Devnet bootstrap script for full stack (all system contracts) with a single JSON state file.

---

## 2. Devnet ops

- [x] `ops/void-devnet-deploy.sh` – deploy VoidToken + AdminGate.
- [x] `ops/void-devnet-verify.sh` – premine and deployer balance sanity check.
- [x] `ops/void-devnet-stack.sh` – tests + deploy + verify.
- [ ] `ops/void-devnet-bootstrap-protocol.sh` – deploy *all* governance/AI contracts and write `docs/VOID-DEVNET-PROTOCOL-STATE.json`.
- [ ] `ops/void-devnet-smoke.sh` – end-to-end calls:
  - Post a JobQueue job.
  - Register an Agent + Model + Dataset.
  - Update validator stake in ValidatorSet.

---

## 3. Node integration

- [ ] Decide how VOID node "system contracts" are wired:
  - AdminGate address
  - ValidatorSet address
  - JobQueue / AgentRegistry / ModelRegistry / DatasetRegistry addresses
- [ ] Add a node config file or env mapping for those addresses (devnet vs testnet vs mainnet).
- [ ] Ensure reward engine expectations match on-chain ValidatorSet & emissions spec.
- [ ] Add Prometheus metrics for:
  - "system contracts loaded" (1/0)
  - "reward engine vs on-chain validator set" sanity.

---

## 4. Mainnet path (high level)

- [x] EVM chain parameters defined (VOID-EVM-SPEC-V1, chainId 2050).
- [x] Emissions + validator rewards spec docs written.
- [x] Key/governance model v1 (AdminGate / ConfigGate roles).
- [ ] Finalize genesis manifest for mainnet (params only, no keys).
- [ ] Define mainnet bootstrap sequence:
  - bring up nodes,
  - deploy system contracts,
  - pin addresses into config,
  - emit first on-chain governance events.

This file is our to-do list. We can tick things off as we build.
