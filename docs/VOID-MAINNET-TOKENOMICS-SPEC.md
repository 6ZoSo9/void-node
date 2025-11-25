# VOID Mainnet — Tokenomics & Gates (Spec Skeleton)

> Status: **DRAFT skeleton generated $(date +%Y-%m-%d)**  
> Branch: feat/mainnet-core-20251120  
> Checkpoint tag: ckpt-mainnet-tokenomics-pillar-green-v0-20251125-162847

This document is the human-readable spec that matches the current
on-chain tokenomics contracts and tests.

Numbers marked `TODO:` should be filled directly from the Solidity code
and tests (e.g. `TokenomicsSpec.t.sol`, `VoidToken.sol`, vault/vesting
contracts, and gates).

---

## 1. Core Token & Supply

### 1.1 VoidToken

- Contract: `contracts/VoidToken.sol`
- Symbol: `$VOID`
- Decimals: `18` (assumed ERC-20 standard — confirm in code)
- Total supply: `TODO_TOTAL_SUPPLY`
- Initial owner/admin: `TODO_VOIDTOKEN_OWNER`  
  (likely wired through `AdminGate` / `ConfigGate` rather than a naked EOA)

### 1.2 Premine & Vaults

- Premine vault: `contracts/VoidPremineVault.sol`
- Emissions controller: `contracts/VoidEmissionsController.sol`
- Founder vesting: `contracts/VoidFounderTrustVesting.sol`

High-level intent (to confirm against code/tests):

- `VoidPremineVault` holds the bulk of premine / genesis allocation.
- `VoidEmissionsController` is the only contract allowed to mint/burn
  outside the initial premine (e.g. for validator rewards, incentives).
- `VoidFounderTrustVesting` holds the long-term founder allocation under
  a vesting schedule that **cannot** be rug-pulled without passing through
  the gate system.

Fill these from code/tests:

- Premine total (to Vault): `TODO_PREMINE_TOTAL`
- Founder vesting allocation: `TODO_FOUNDER_VESTING_TOTAL`
- Public/airdrop/liquidity allocations: `TODO_PUBLIC_LIQUIDITY_SPLITS`
- Emissions schedule (per block / per epoch / per year): `TODO_EMISSIONS_SCHEDULE`

---

## 2. Gate System (Admin / Config / Update)

VOID mainnet does **not** rely on naked EOAs for critical powers.
Instead, control flows through three core gates:

- `AdminGate` — master authority / root signer set
- `ConfigGate` — parameter changes (emissions rates, limits, addresses, etc.)
- `UpdateGate` — code/upgrade control (where applicable)

### 2.1 AdminGate

- Contract: `contracts/AdminGate.sol`
- Tests: `test/AdminGate.t.sol`

Responsibilities:

- Holds the **master key set** for VOID.
- Controls who can:
  - Rotate other gate signers.
  - Trigger emergency controls (if any).
  - Perform extremely sensitive actions (e.g., finalizing critical config).

Key invariants (verify from tests):

- Admin actions must require **multi-sig / multi-key approval**, not a single hot wallet.
- Admin set is rotatable without halting the chain.
- All externally callable admin functions **go through AdminGate**, not random contracts.

Fill from tests:

- Initial admin signer set: `TODO_ADMINGATE_SIGNERS`
- Thresholds / quorum: `TODO_ADMINGATE_QUORUM`

### 2.2 ConfigGate

- Contract: `contracts/ConfigGate.sol`
- Tests: `test/ConfigGate.t.sol`

Responsibilities:

- Change runtime config parameters across the ecosystem:
  - emission rates
  - treasury addresses
  - registry addresses (Model/Dataset/Agent/Receipt)
  - allowed agents, etc.

Invariants to match tests:

- Only approved ConfigGate signers can modify config.
- Changes are **trackable** and ideally rate-limited / bounded.
- Core safety-invariants (e.g. no 100% emissions jump overnight) are enforced either
  in the gate or in the target contracts.

Fill from code/tests:

- Config change delay / timelock (if any): `TODO_CONFIG_TIMELOCK`
- Key config parameters controlled: `TODO_CONFIG_PARAMS_LIST`

### 2.3 UpdateGate

- Contract: `contracts/UpdateGate.sol`
- Tests: `test/UpdateGate.t.sol`

Responsibilities:

- Acts as the controller for code updates, where applicable:
  - Upgrading contracts that are upgradeable.
  - Registering new logic contracts / impls.
  - Enforcing rollout policy for protocol-level changes.

Invariants:

- Update power is **separate** from pure financial control.
- Update approvals require appropriate quorum.
- Upgrade paths are explicit (no stealth upgrades or unreviewed impls).

Fill from tests:

- Upgradeable contracts under UpdateGate: `TODO_UPDATEGATE_TARGETS`
- Quorum / approvals: `TODO_UPDATEGATE_RULES`

---

## 3. Core Registries & Job/Receipt System

These contracts are already wired into devnet and monitored via
Prometheus (devnet coverage gauges):

- `AgentRegistry` — `contracts/AgentRegistry.sol`
- `ModelRegistry` — `contracts/ModelRegistry.sol`
- `DatasetRegistry` — `contracts/DatasetRegistry.sol`
- `ModelEvalRegistry` — `contracts/ModelEvalRegistry.sol`
- `JobQueue` — `contracts/JobQueue.sol`
- `ReceiptRegistry` — `contracts/ReceiptRegistry.sol`
- `JobReceipts` — `contracts/JobReceipts.sol` (if logically separate)

### 3.1 JobQueue & Receipts

From devnet coverage output:

- `totalJobs = 6`
- `totalReceipts = 78`
- `receipts/job = 13.0`
- Coverage gauges:
  - `void_devnet_coverage = 1`
  - `void_devnet_coverage_health = 1`
  - `void_devnet_receipts_coverage_v2 = 13`
  - `void_devnet_receipts_health_v2 = 1`

These numbers won’t be used directly for mainnet tokenomics, but they
prove the **pipeline** is working:

- Every job has >= 1 receipt.
- Receipts are being generated by agents and ingested through ReceiptRegistry.

Invariants (to keep for mainnet):

- No job should remain uncovered for “too long” under normal operation.
- Coverage gauges must remain >= 1 and health gauges = 1.
- Job/receipt accounting must be consistent with validator/agent rewards.

### 3.2 Registry Ownership & Gates

For each registry, fill in:

- Who can register / update entries
- Which gate controls that power
- Which health gauge monitors its status

Template:

- `AgentRegistry`
  - Controlled by: `TODO_AGENTREG_CONTROLLER` (likely AdminGate/ConfigGate)
  - Health gauge: `void_agentreg_devnet_health` (devnet) / `TODO_mainnet_health_metric`
- `ModelRegistry`
  - Controlled by: `TODO_MODELREG_CONTROLLER`
  - Health gauge: `void_models_devnet_health` / `TODO_mainnet_metric`
- `DatasetRegistry`
  - Controlled by: `TODO_DATASETREG_CONTROLLER`
  - Health gauge: `void_datasets_devnet_health` / `TODO_mainnet_metric`

---

## 4. ValidatorSet & Emissions

### 4.1 ValidatorSet

- Contract: `contracts/ValidatorSet.sol`
- Tests: `test/ValidatorSet.t.sol`

Responsibilities:

- Tracks active validators on VOID mainnet.
- Integrates with emissions / rewards logic.
- Enforces bonding/slashing rules (as implemented so far).

Fill in from code/tests:

- Minimum stake: `TODO_VALIDATOR_MIN_STAKE`
- Max validator set size / rotation rules: `TODO_VALIDATOR_LIMITS`
- How rewards are computed and distributed: `TODO_REWARD_FORMULA`

### 4.2 EmissionsController

- Contract: `contracts/VoidEmissionsController.sol`
- Tests: `test/VoidEmissionsController.t.sol`

Responsibilities:

- Implements the block/epoch-level emission schedule for VOID.
- Sends freshly minted $VOID to:
  - Validators
  - Treasury / funding
  - Any other sinks defined in the spec

Invariants:

- Emissions cannot exceed a hard-coded or config-controlled cap.
- Emissions updates must go through ConfigGate / UpdateGate.

Fill in:

- Emissions per block / epoch: `TODO_EMISSIONS_RATE`
- Split between validators vs treasury vs other buckets: `TODO_EMISSIONS_SPLIT`

---

## 5. Founder Vesting & Treasury Flows

### 5.1 Founder Vesting

- Contract: `contracts/VoidFounderTrustVesting.sol`
- Tests: `test/VoidFounderTrustVesting.t.sol`

Key requirements:

- Long, predictable vesting horizon (10–20 years expected).
- No “instant unlock” path that bypasses the vesting logic.
- Vesting contract is controlled via gates, not a single EOA.

Fill in:

- Vesting start date / block: `TODO_VESTING_START`
- Cliff, if any: `TODO_VESTING_CLIFF`
- Total duration: `TODO_VESTING_DURATION`
- Release schedule (linear/step/etc.): `TODO_VESTING_SCHEDULE`

### 5.2 Treasury Layout (target architecture)

Even if not fully encoded yet, the intended flow is:

- `VoidToken` premine → `VoidPremineVault` (genesis)
- Long-term premine → `VoidTreasury`-style contract (planned)
- Treasury → Ops treasuries / hot wallets via **gated**, multi-sig controlled flows
- EmissionsController → validators + treasury

The **premine key** itself should only be used at genesis and then effectively retired.
All ongoing control should live in AdminGate/ConfigGate/UpdateGate signer sets.

---

## 6. Monitoring & Health

Main relevant gauges (non-exhaustive):

- Tokenomics pillar:
  - `void_mainnet_tokenomics_health`
  - `void:mainnet_tokenomics:health:last_5m`
- Mainnet pillars:
  - `void_mainnet_core_health`
  - `void:mainnet_lastmile:health:last_5m`
  - `void_mainnet_pillars_*` (overall)

Acceptance criteria for “tokenomics pillar green”:

1. All tokenomics-related tests pass:
   - `TokenomicsSpec.t.sol`
   - `VoidToken.t.sol`
   - `VoidEmissionsController.t.sol`
   - `VoidFounderTrustVesting.t.sol`
   - `ValidatorSet.t.sol`
   - Relevant gate tests (AdminGate/ConfigGate/UpdateGate)
2. Quickcheck script succeeds:
   - `./ops/void-mainnet-tokenomics-quickcheck.sh`
3. Prometheus shows:
   - `void_mainnet_tokenomics_health == 1`
   - `void:mainnet_tokenomics:health:last_5m == 1`
4. Pillars preflight passes:
   - `./ops/void-mainnet-health-all.sh` (or equivalent) returns OK.

---

## 7. TODOs Before Mainnet Genesis

- [ ] Fill all `TODO_*` fields from code and tests.
- [ ] Freeze the numeric spec (total supply, allocations, schedules).
- [ ] Make sure gates (Admin/Config/Update) signer sets and thresholds
      match the long-term keys plan (LUKS USB, hardware wallets, etc.).
- [ ] Generate a machine-readable snapshot:
      `docs/VOID-MAINNET-TOKENOMICS-STATE.json` (future work).
- [ ] Tie this spec into the Genesis manifest and UpdateGate policy.

