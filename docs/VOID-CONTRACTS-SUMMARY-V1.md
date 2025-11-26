# VOID Network – Core Contracts v1 Summary

This file summarizes the core on-chain contracts for VOID (chainId 2050) as of
tag `ckpt-2025-11-14-contracts-v1` + tokenomics commits.

## 1. Governance / Control

- `AdminGate.sol`
  - Holds the MasterKey.
  - Manages system contract pointers (key -> address), e.g. UPDATE_GATE, CONFIG_GATE.
  - Only MasterKey can change system pointers and rotate the MasterKey.

- `ConfigGate.sol`
  - Typed key/value store for chain-wide params.
  - Controlled by AdminGate (`onlyAdminGate`).
  - Used to publish AI pointers, policy URIs, contract addresses, etc.

- `UpdateGate.sol`
  - M-of-N signer set for protocol updates.
  - Tracks update manifests and activation rules.
  - MasterKey controls signer set and emergency semantics.

## 2. Agents & Jobs (AI Stack)

- `JobQueue.sol`
  - On-chain job registry for AI/off-chain work.
  - Jobs: posted -> claimed -> completed/cancelled.
  - Emits events agents watch; does NOT run AI on-chain.

- `AgentRegistry.sol`
  - Registers off-chain agents with a `metadataURI`.
  - Tracks owner, active flag, trusted flag (MasterKey-controlled).
  - Agent IDs are stable (1-based).

- `ModelRegistry.sol`
  - Registry of AI models (by `modelKey`).
  - Tracks owner, `versionHash`, `metadataURI`, `active`, `trusted`.
  - MasterKey controls trusted flag and forced actions.

- `DatasetRegistry.sol`
  - Registry of datasets (by `datasetKey`).
  - Tracks owner, `versionHash`, `metadataURI`, `active`, `trusted`.
  - MasterKey controls trusted flag and forced actions.

- `ReceiptRegistry.sol`
  - Simple log of job receipts.
  - Links jobId, agentId, modelId, datasetId, result/proof hashes, metadataURI, status.
  - Does NOT verify AI outputs; used by off-chain infra for accounting and audits.

## 3. Asset / Token

- `VoidToken.sol`
  - ERC20 for VoidStones (`name = "VoidStones"`, `symbol = "VOID"`, `decimals = 18`).
  - Hard cap: `MAX_SUPPLY = 666,666,666 * 1e18`.
  - Premine: `PREMINE = 333,333,333 * 1e18` minted to deploy-time recipient.
  - `owner` is the deployer; only owner can mint, and cap is enforced on-chain.

## 4. Tokenomics / Emissions (Node-Side Helpers)

- `docs/VOID-EMISSIONS-SCHEDULE.md`
  - Locks:
    - `MAX_SUPPLY = 666,666,666 VOID`
    - `PREMINE   = 333,333,333 VOID`
    - `REMAINING_EMISSIONS = 333,333,333 VOID`
  - Emissions never fully stop; rewards decay so total supply stays <= MAX_SUPPLY.

- `docs/VOID-EMISSIONS-PARAMS-V1.json`
  - Machine-readable parameters for emissions_v1 helper.

- `docs/VOID-VALIDATOR-REWARDS-V1.md`
  - Describes how per-block rewards are split between validators/pools/etc.
  - Non-consensus design doc for node integration.

- `src/tokenomics/emissions_v1.ts`
  - Non-consensus helper for `rewardPerBlock(height)` and cap checks.

- `src/tokenomics/validator_rewards_v1.ts`
  - Non-consensus helper to split a given block reward across validators.

- `scripts/emissions_sanity.ts`
  - Sanity script to simulate the emissions curve.
- `docs/VOID-EMISSIONS-SANITY-2025-11-14.txt`
  - Captured run of the emissions_v1 sanity script (this curve is now fixed).

## 5. Tests and CI

- Foundry config:
  - `foundry.toml` at repo root.
  - Uses solc 0.8.20 for all contracts.

- Tests (all pass):
  - `test/AdminGate.t.sol`
  - `test/ConfigGate.t.sol`
  - `test/JobQueue.t.sol`
  - `test/AgentRegistry.t.sol`
  - `test/ModelRegistry.t.sol`
  - `test/DatasetRegistry.t.sol`
  - `test/VoidToken.t.sol`

- CI:
  - `.github/workflows/contracts-ci.yml`
    - On changes to contracts/tests, runs `forge build` + `forge test` on GitHub.

## 6. Checkpoint Tags

- `ckpt-2025-11-14-contracts-v1`
  - First full pass of AdminGate/ConfigGate/UpdateGate + AI registries + JobQueue.

- Future tags SHOULD treat `VoidToken.sol` + emissions docs as canonical:
  - VOID max supply and premine MUST NOT change after this point.
  - Any v2 contracts must respect the same total cap.

This file is the high-level map of the contracts as they stand today. VOID mainnet
genesis MUST reference this version (or a clearly documented v2) for governance,
AI integration, and monetary policy.
