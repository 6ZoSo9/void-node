# VOID Devnet – System Contracts Plan v1

This file defines the next wave of devnet work: deploying and wiring the core
VOID system contracts on chainId 2050.

## Scope (contracts)

- JobQueue
- ValidatorSet
- AgentRegistry
- DatasetRegistry
- ModelRegistry
- ConfigGate
- AdminGate (already deployed)
- VoidToken (already deployed)

## Devnet goals

- All system contracts deployed from the devnet deployer.
- AdminGate knows about each system contract (systemContracts mapping).
- ConfigGate points at AdminGate and stores key config values
  (e.g. protocol version, feature flags, gas params where relevant).
- ValidatorSet initialized with a minimal validator set suitable for testing.
- JobQueue usable on devnet for simple end-to-end agent tests.

## Planned scripts

- ops/void-devnet-deploy-system.sh
  - Deploy remaining system contracts and extend
    docs/VOID-DEVNET-DEPLOY-ADDRESSES.json

- ops/void-devnet-bootstrap-system.sh
  - Call AdminGate / ConfigGate / ValidatorSet to wire up addresses and
    initial parameters.

- ops/void-devnet-system-verify.sh
  - Query chain state and assert that:
    - chainId == 2050
    - AdminGate + ConfigGate addresses match JSON
    - systemContracts entries are populated
    - ValidatorSet returns expected validator keys / stakes

This is a plan only; implementation comes next.
