# VOID Network - Mainnet Genesis Spec (v1)

This document defines the human-readable genesis spec for VOID mainnet
(chainId 2050).

It is the top-level description of:
- which core contracts/accounts MUST exist at or immediately after genesis,
- how the premine and emissions are wired,
- how validator/reward plumbing hangs together at height 0.

This file stays aligned with:
- docs/VOID-TOKENOMICS-SPEC-V1.md
- docs/VOID-EMISSIONS-SCHEDULE.md
- docs/VOID-MAINNET-MONETARY-SPEC-V1.md
- docs/VOID-VALIDATOR-SET-SPEC-V1.md
- docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md
- docs/VOID-MAINNET-ALLOCATION-SPEC.md
- docs/VOID-MAINNET-KEYS-PLAN.md

It does not redefine tokenomics; it pins what must be true in the actual
genesis manifest.

---

## 0. Goals and scope

Genesis v1 MUST:

1. Use chainId 2050 and a stable, documented encoding
   ("void-genesis-v1" - wire format defined separately).
2. Mint the entire PREMINE (333,333,333 VOID) into a single cold treasury,
   not to validators, not to random EOAs.
3. Respect the locked tokenomics:
   - MAX_SUPPLY = 666,666,666 VOID
   - PREMINE    = 333,333,333 VOID
   - EMISSIONS  = 333,333,333 VOID (for validators + long-term incentives)
4. Install the minimum system contracts needed so that:
   - Validator rewards can be paid according to the spec.
   - Ops spending is separated from the cold treasury.
   - Future staking / slashing / governance can evolve without changing the
     monetary invariants.
5. Wire all admin/owner addresses according to
   docs/VOID-MAINNET-KEYS-PLAN.md - no ad-hoc keys.

Anything not listed here is non-critical for genesis and can be deployed
after launch, as long as it does not violate the invariants above.

---

## 1. Chain identity

- chainId: 2050
- networkName: "VOID Mainnet"
- genesisVersion: "v1"
- encoding: "void-genesis-v1"

The encoded genesis manifest (JSON or CBOR) MUST include:
- chain ID 2050
- genesis time (UTC, RFC3339)
- initial state root / header fields
- pre-deployed contracts + their storage
- initial account balances

---

## 2. Monetary layer at genesis

See:
- docs/VOID-TOKENOMICS-SPEC-V1.md
- docs/VOID-EMISSIONS-SCHEDULE.md
- docs/VOID-MAINNET-MONETARY-SPEC-V1.md

This section only states what MUST be true in the genesis state.

### 2.1 Core constants

At genesis and forever:

- max_supply_void       = 666_666_666 * 1e18
- premine_void          = 333_333_333 * 1e18
- emissions_budget_void = 333_333_333 * 1e18
- founder_trust_void    = 230_000_000 * 1e18 (inside premine)
- other_premine_void    = 103_333_333 * 1e18 (premine - founder_trust)

These numbers are enforced by:
- node_exporter textfile metrics (void_tokenomics_*, void_mainnet_tokenomics_*)
- the spec health gauge:
  - void_mainnet_tokenomics_spec_health == 1
- Prometheus alert:
  - VoidMainnetTokenomicsSpecMismatch

### 2.2 Premine location

At genesis:

- The full PREMINE is minted to VoidTreasury (cold treasury).

There is no direct premine to:
- validators,
- founders,
- exchanges,
- random EOAs.

All downstream allocations (founder trust, ecosystem, ops, etc.) flow out of
VoidTreasury by on-chain transfers and are described in:
- docs/VOID-MAINNET-ALLOCATION-SPEC.md
- docs/VOID-MAINNET-KEYS-PLAN.md

### 2.3 Emissions

- Emissions budget: 333,333,333 VOID (scaled to 18 decimals).
- Enforced in RewardEngine (see below) via:
  - totalPulled <= emissionsBudget
  - totalClaimed <= totalPulled
- Shape of the curve (eras + per-block emission) comes from:
  - docs/VOID-EMISSIONS-SCHEDULE.md
  - docs/VOID-EMISSIONS-PARAMS-V1.json
  - src/tokenomics/emissions_v1.ts (non-consensus model, mirrored into
    consensus code later).

Genesis does not pre-mint emissions; it only establishes:
- the budget, and
- the contracts that will dispense it to validators over time.

---

## 3. Required system contracts

These contracts MUST exist at or immediately after genesis. Their bytecode,
storage and admin addresses must match the corresponding specs.

For brevity, symbolic names are used; actual addresses are determined by the
deployment plan and recorded in the real genesis manifest.

### 3.1 VoidToken (ERC-20)

- File: contracts/mainnet/VoidToken.sol
- Symbol: VOID
- Decimals: 18
- MAX_SUPPLY hard-coded or enforced in mint logic.
- At genesis:
  - totalSupply = PREMINE (333,333,333 * 1e18).
  - balanceOf(VoidTreasury) = PREMINE.
  - No other account has a non-zero balance.

Mint/burn rules in v1:
- No arbitrary mint beyond MAX_SUPPLY.
- Emissions are accounted as transfers out of treasury/emissions pools, not
  direct extra mints that violate the cap.

### 3.2 VoidTreasury (cold premine treasury)

- File: contracts/mainnet/VoidTreasury.sol
- Holds the full premine at genesis.
- Admin: TREASURY_ADMIN (defined in keys plan).
- Key function:
  sendToOps(uint256 amount, bytes32 tag)

Invariants:
- Only TREASURY_ADMIN can call sendToOps.
- sendToOps can only transfer existing balance; it cannot mint.
- Every call emits an event with the tag for off-chain accounting.

### 3.3 OpsTreasury (hot ops treasury)

- File: contracts/mainnet/OpsTreasury.sol
- Receives funds from VoidTreasury via sendToOps.
- Admin: typically same logical role as TREASURY_ADMIN, but can be a
  different address if desired.

Key function:
spend(address to, uint256 amount, bytes32 tag)

Invariants:
- Only the Ops admin can call spend.
- Used for vendors, grants, ops expenses - not validator emissions.
- Emits events with tags for accounting.

Behavior is covered by:
- test/mainnet/Treasury.t.sol

### 3.4 ValidatorSet (IValidatorSetLike)

- Interface: contracts/mainnet/IValidatorSetLike.sol
- Implementation: contracts/mainnet/ValidatorSet.sol
- Tests:
  - test/ValidatorSet.t.sol
  - test/mainnet/ValidatorSet.t.sol

Interface:

interface IValidatorSetLike {
    function getActiveValidators() external view returns (address[] memory);
    function getValidators() external view returns (address[] memory);
    function getVotingPower(address validator) external view returns (uint256);
    function totalPower() external view returns (uint256);
}

Genesis expectations (v1):
- Admin-managed validator set (no staking yet).
- Admin address: VALIDATORSET_ADMIN (per keys plan).
- totalPower() == sum(getVotingPower(v)) over getValidators().
- getActiveValidators() is exactly the subset with power > 0.
- At least one active validator with non-zero power.

### 3.5 RewardEngine (emissions and claims)

- Interface: contracts/mainnet/IRewardEngineLike.sol
- Implementation: contracts/mainnet/RewardEngine.sol
- Tests: test/mainnet/RewardEngine.t.sol

Responsibilities:
1. Hold the emissions budget (333,333,333 VOID).
2. Track totalPulled and prevent it from exceeding the budget.
3. Allocate pulled emissions across the active validator set
   proportionally to votingPower.
4. Let validators claim their accrued rewards.

Key invariants:
- totalPulled <= emissionsBudget
- totalClaimed <= totalPulled
- For each emission step, the sum of per-validator shares equals the
  pulled amount (modulo rounding).

Admin: REWARD_ADMIN (per keys plan).

At genesis:
- Emissions budget configured to 333,333,333 VOID (scaled).
- RewardEngine wired to:
  - VoidToken
  - ValidatorSet
  - admin keys per keys plan

Validator payouts:
- Validators do not receive any premine at genesis.
- They only earn from RewardEngine over time.

### 3.6 Gates: AdminGate / UpdateGate / ConfigGate

These contracts define who can change what after genesis.

High-level expectations (details in their own specs):

- AdminGate
  - Holds privileged roles (TREASURY_ADMIN, REWARD_ADMIN,
    VALIDATORSET_ADMIN, ops roles).
  - Acts as a registry of admin addresses.

- UpdateGate
  - Controls protocol upgrades / feature flags.
  - Can gate things like "switch to staking v2", "enable slashing", etc.

- ConfigGate
  - Holds typed config values (uint256, bool, address) keyed by bytes32.
  - Used for Vector7/WAL thresholds, block limits, soft circuit-breakers, etc.

Genesis requirement:
- The real admin keys for these gates MUST match
  docs/VOID-MAINNET-KEYS-PLAN.md.

---

## 4. Genesis allocations (summary)

The full allocation details live in:
- docs/VOID-MAINNET-ALLOCATION-SPEC.md

This spec only fixes the high-level shape:

1. VoidToken total supply at genesis equals the PREMINE.
2. That supply sits entirely in VoidTreasury.
3. Downstream allocations (founder trust, ecosystem, ops, etc.) are done
   via on-chain transfers after genesis, using the treasury contracts
   and keys defined in the keys plan.
4. No secret or hidden balances: any non-treasury account with non-zero
   VOID at height 0 must be explicitly listed in the allocation spec.

---

## 5. Keys and admin wiring

The actual EOA / multisig addresses are defined in:
- docs/VOID-MAINNET-KEYS-PLAN.md

Genesis MUST wire:

- VoidTreasury.admin  = TREASURY_ADMIN
- OpsTreasury.admin   = TREASURY_ADMIN or OPS_ADMIN
- ValidatorSet.admin  = VALIDATORSET_ADMIN
- RewardEngine.admin  = REWARD_ADMIN
- AdminGate / UpdateGate /
  ConfigGate owners    = as per keys plan

In addition, the masterKey / root of trust used by AdminGate/UpdateGate
must follow the rotation / storage rules in the keys plan (LUKS USB, no
reuse of devnet keys, etc.).

Any deviation between the live chain and the keys plan is considered a
spec violation.

---

## 6. Sanity checks before launch

Before declaring a chain "VOID Mainnet v1", we MUST:

1. Run all tokenomics/spec health checks:
   - ./ops/void-mainnet-tokenomics-health-all.sh
   - ./ops/void-mainnet-tokenomics-spec-health-all.sh
   - ./ops/void-mainnet-health-all.sh

2. Verify via a genesis-inspection tool that:
   - Total VOID supply == PREMINE.
   - balanceOf(VoidTreasury) == PREMINE.
   - No other accounts hold VOID at height 0 unless explicitly listed in
     the allocation spec.
   - All admin addresses match VOID-MAINNET-KEYS-PLAN.md.

3. Confirm Prometheus / Grafana show:
   - void_mainnet_tokenomics_spec_health == 1
   - void:mainnet_tokenomics:spec_health:last_5m == 1
   - void:mainnet_pillars:health:last_5m == 1 (core + last-mile + tokenomics)

Once these conditions hold, this document and the actual genesis manifest
are considered in sync for mainnet v1.
