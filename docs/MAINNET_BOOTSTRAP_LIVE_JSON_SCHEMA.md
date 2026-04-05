# Mainnet Bootstrap Live JSON Schema

Status: draft schema for the future real bootstrap input  
Related:
- `ops/mainnet/void-mainnet.live.json`
- `docs/MAINNET_PREMINE_VAULTS_BOOTSTRAP_SEQUENCE.md`
- `docs/MAINNET_BOOTSTRAP_IMPLEMENTATION_CHECKLIST.md`
- `script/mainnet_rebuild/VoidMainnetBootstrapDev.vaults-rebuild.s.sol`

## Purpose

This document defines the intended schema for the future real mainnet bootstrap input JSON.

It replaces the older treasury-centric mental model with the current locked model:

- 30 offline premine vaults
- one selected premine vault at a time
- one small active hot wallet
- explicit bounded funding allocations
- no monolithic premine-to-treasury transfer

---

## Top-level required fields

### `chainId`
- Type: integer
- Required
- Value for mainnet: `2050`

### `mode`
- Type: string
- Required
- Allowed:
  - `mainnet_plan_stub`
  - `plan_only`
  - `rehearsal`
  - `live_broadcast`

### `status`
- Type: string
- Required
- Examples:
  - `stub_only_not_live`
  - `draft_not_approved`
  - `approved_for_rehearsal`
  - `approved_for_live_broadcast`

### `keys_source`
- Type: string
- Required
- Main expected value:
  - `luks_flash_drives`

---

## Premine model block

### `premine_model`
- Type: object
- Required

Fields:

#### `type`
- Type: string
- Required
- Value:
  - `segmented_offline_vaults`

#### `vault_count`
- Type: integer
- Required
- Value:
  - `30`

#### `vaults_live_online_by_default`
- Type: boolean
- Required
- Expected:
  - `false`

#### `touch_one_vault_at_a_time`
- Type: boolean
- Required
- Expected:
  - `true`

#### `active_hot_wallet_required`
- Type: boolean
- Required
- Expected:
  - `true`

#### `active_hot_wallet_should_be_small`
- Type: boolean
- Required
- Expected:
  - `true`

#### `pool_seeding_source`
- Type: string
- Required
- Expected:
  - `premine_allocations`

---

## Vault selection block

### `selected_premine_vault`
- Type: object
- Required for rehearsal/live
- Optional for stub-only mode

Fields:

#### `id`
- Type: string
- Required for rehearsal/live
- Example:
  - `vault07`

#### `address`
- Type: string
- Required for rehearsal/live
- Ethereum address

#### `status`
- Type: string
- Required
- Examples:
  - `offline_unassigned`
  - `selected_for_current_cycle`
  - `used_for_partial_allocations`
  - `retired`

#### `purpose`
- Type: string
- Optional
- Example:
  - `mainnet bootstrap cycle 1`

---

## Active hot wallet block

### `active_hot_wallet`
- Type: object
- Required for rehearsal/live

Fields:

#### `address`
- Type: string
- Required
- Ethereum address

#### `max_balance_policy`
- Type: string
- Required
- Example:
  - `bounded_operational_buffer`

#### `notes`
- Type: string
- Optional

---

## Funding allocation block

### `funding_allocations`
- Type: object
- Required for rehearsal/live

Fields:

#### `hot_wallet_refill`
- Type: string or integer-like decimal string
- Required
- Token amount

#### `treasury_allocation`
- Type: string or integer-like decimal string
- Required
- Token amount

#### `pool_seeding_allocation`
- Type: string or integer-like decimal string
- Required
- Token amount

#### `other_allocations`
- Type: array of objects
- Optional

Each object:

- `label` — string
- `amount` — string
- `destination` — address string
- `notes` — optional string

---

## Roles block

### `roles`
- Type: object
- Required

Fields:

- `AdminGate`
- `UpdateGate`
- `ConfigGate`
- `ValidatorSet`
- `VoidToken`
- `VoidTreasury`
- `OpsTreasury`
- `RewardEngine`

Each value:
- address string or `TBD` while still stub-only

---

## Gate/admin block

### `admins`
- Type: object
- Required for rehearsal/live

Fields:

- `adminGateController`
- `updateGateController`
- `configGateController`
- `validatorAdmin`
- `voidTreasuryAdmin`
- `opsTreasuryAdmin`
- `rewardEngineAdmin`

---

## Validator bootstrap block

### `validator0`
- Type: object
- Required for rehearsal/live

Fields:

- `reward` — address
- `consensusKey` — bytes32 hex string
- `stakeVOID` — string or integer-like decimal string

---

## Pool seeding plan block

### `pool_seeding_plan`
- Type: object
- Required when pool seeding is part of the cycle

Fields:

- `enabled` — boolean
- `source` — string, expected `premine_allocations`
- `amount` — string
- `destination` — address or contract identifier
- `notes` — optional string

---

## Premine vault ledger block

### `premine_vaults`
- Type: array
- Required
- Length expected: `30`

Each entry:

- `id` — string
- `address` — address string or `TBD`
- `status` — string
- `purpose` — optional string
- `backup_location_hint` — optional string
- `last_used_for_hot_wallet_refill` — optional string/date/note
- `last_used_for_pool_seeding` — optional string/date/note

---

## Notes block

### `notes`
- Type: array of strings
- Optional

Use for human-facing operator guidance that is safe to keep in repo.

---

## Explicit validation rules

Any future bootstrap parser/checker should reject configs that imply:

- full-premine transfer into `VoidTreasury`
- full-premine transfer into any single hot wallet
- missing selected premine vault during rehearsal/live
- missing active hot wallet during rehearsal/live
- `vault_count != 30`
- `keys_source != "luks_flash_drives"` for mainnet
- pool seeding source other than premine allocations for the current locked design
- live mode with `TBD` critical roles or missing validator/bootstrap fields

---

## Example progression

### Stub-only stage
- `mode = "mainnet_plan_stub"`
- `status = "stub_only_not_live"`
- most role addresses may still be `TBD`
- selected vault / hot wallet may still be unset

### Rehearsal stage
- `mode = "rehearsal"`
- selected vault explicitly chosen
- hot wallet explicitly chosen
- bounded allocations set
- validator bootstrap fields set
- no live-broadcast approval yet

### Live-broadcast stage
- `mode = "live_broadcast"`
- `status = "approved_for_live_broadcast"`
- critical role addresses set
- selected vault and hot wallet set
- allocations set
- validator fields set
- all invariants pass

