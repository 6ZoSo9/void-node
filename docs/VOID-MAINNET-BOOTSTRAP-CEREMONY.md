# VOID Mainnet Bootstrap Ceremony (PLAN)

> **Status:** This document describes the *planned* mainnet bootstrap.
> All code paths are currently PLAN-only or stubbed (`RUN_STUB_ONLY`).
> No real mainnet broadcast is wired yet.

---

## 0. High-level goals

1. Bootstrap VOID mainnet (chainId 2050) with:
   - Max supply 666,666,666 VOID.
   - Premine 333,333,333 VOID fully parked in VoidTreasury.
   - Emissions 333,333,333 VOID over 100 years via RewardEngine.
2. Ensure:
   - No secrets live in the plan JSON.
   - All *roles* and *owners* come from LUKS / hardware keys.
   - The premine key is used once then effectively retired.
3. Gate the ceremony on:
   - Devnet + safeboot + mainnet-core + last-mile === healthy.
   - PLAN == 1, KEYS == 1, MAINNET stub health == 1.
   - `void:mainnet_pillars:health_with_mainnet:last_5m == 1`.

This ceremony is the human-facing description of what the `VoidMainnetBootstrapMainnet`
script and the ops health hammers are already enforcing.

---

## 1. Roles, keys, and configs

### 1.1 Live config JSON

- File: `config/void-mainnet-bootstrap-mainnet.live.json`
- Fields (examples from current PLAN):

  - `chainId = 2050`
  - `roles.deployer              = 0x7D49...E6f1`
  - `roles.treasuryAdmin         = 0x7752...49a7`
  - `roles.opsTreasuryAdmin      = 0x6bd8...EFdE`
  - `roles.validatorAdmin        = 0x0053...a4E2`
  - `roles.adminGateOwner        = 0x5F27...B630`
  - `roles.updateGateOwner       = 0x5F27...B630`
  - `roles.configGateOwner       = 0x811a...0930`
  - `roles.treasuryOwner         = 0x7752...49a7`
  - `roles.opsTreasuryOwner      = 0x6bd8...EFdE`
  - `roles.rewardEngineOwner     = 0x7752...49a7`
  - `roles.validatorSetOwner     = 0x0053...a4E2`
  - `validator0.reward           = 0xCD49...5855`
  - `validator0.consensusKey     = 0x67a0...0540`
  - `validator0.stakeVOID        = 1,000,000`

  - `contracts.*` are currently all `0x0000...0000` in PLAN-only mode.

### 1.2 Roles mapping on LUKS key

- File: `/mnt/voidkey/meta/mainnet-roles-mapping.txt`
- Verified by: `ops/void-mainnet-roles-verify.sh`
- Health metric: `void_mainnet_keys_roles_ok == 1`

The mapping must **exactly** match `.roles.*` in the live JSON before any real broadcast.

---

## 2. Health gates before ANY broadcast

Before touching real mainnet, the following MUST all be `1`:

- Overall & pillars:
  - `void:mainnet_overall:health:last_5m_v2`
  - `void:mainnet_pillars:health:last_5m`
  - `void:mainnet_lastmile:health:last_5m`
  - `void_safeboot_overall_health`

- PLAN / KEYS / MAINNET bootstrap:
  - `void_mainnet_bootstrap_plan_health`
  - `void:mainnet_bootstrap_plan:health:last_5m`
  - `void_mainnet_keys_roles_ok`
  - `void_mainnet_mainnet_bootstrap_health`
  - `void:mainnet_pillars:health_with_mainnet:last_5m`

### 2.1 Hammer scripts

Key ops hammers:

- `./ops/void-mainnet-health-all.sh`
- `./ops/void-mainnet-mainnet-health-all.sh`
- `./ops/void-mainnet-planning-with-mainnet-health-all.sh`
- `./ops/void-mainnet-health-with-mainnet-all.sh`  ← **overall, including MAINNET bootstrap**

Pre-push already calls the pillars + last-mile hammers. The health-with-mainnet hammer
is the top-level “are we safe to even think about mainnet broadcast?” gate.

---

## 3. PLAN vs DEV rehearsal vs MAINNET stub

### 3.1 DEV rehearsal (no state changes)

- Config: `config/void-mainnet-bootstrap-mainnet.dev.json`
- Script: `ops/void-mainnet-bootstrap-mainnet-plan-health-all.sh` (and helpers)

This:

1. Runs `VoidMainnetBootstrapMainnet.plan()` against the **dev** config.
2. Ensures roles, validator0 wiring, and JSON shape are sane.
3. Writes a textfile gauge:
   - `/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom`
4. Exports:
   - `void_mainnet_bootstrap_plan_configured`
   - `void_mainnet_bootstrap_plan_health`
   - `void_mainnet_bootstrap_plan_health_info{reason="ok"}`

### 3.2 MAINNET stub dry-run (no broadcast)

- Config: `config/void-mainnet-bootstrap-mainnet.live.json`
- Script: `ops/void-mainnet-mainnet-health-all.sh`

This:

1. Confirms `chainId` 2050 via `cast chain-id`.
2. Executes `VoidMainnetBootstrapMainnet.run(configPath)` **in stub mode**.
3. Reads and logs:
   - All `.roles.*` from the live JSON.
   - All `.contracts.*` (currently zero).
   - `validator0.reward`, `validator0.consensusKey`, `validator0.stakeVOID`.
4. Emits a high-level PLAN narrative:
   - Step 0..6 (see below).
5. Requires the script to revert with the marker:
   - `RUN_STUB_ONLY`

If the revert marker is missing or different, `mainnet-mainnet-health-all` must fail.
That’s the guard that keeps `run()` non-destructive for now.

---

## 4. Planned broadcast steps (future, not wired yet)

**Important:** The following is the **intended** sequence when we eventually
switch from stub to real broadcast. Today, `run()` is still stub-only.

### Step 0 — Confirm chain and deployer

- Check `chainId` from RPC = 2050.
- Confirm `config.chainId` = 2050.
- Confirm the **hardware wallet / LUKS key** being used for broadcast
  corresponds to `roles.deployer` in the live JSON.

### Step 1 — Deploy core token + treasuries

From **deployer**:

1. Deploy `VoidToken` with full premine assigned to a premine owner key
   held in cold storage (not the deployer hot key).
2. Deploy `OpsTreasury` with:
   - `admin = roles.opsTreasuryAdmin`
3. Deploy `VoidTreasury` with:
   - `admin = roles.treasuryAdmin`
4. Immediately move the **entire premine** into `VoidTreasury`, leaving
   the premine key’s VOID balance = 0.

### Step 2 — Deploy governance gates

Still from **deployer** (or dedicated gate deployer, but wired per config):

1. Deploy `AdminGate` with:
   - Master key stored on LUKS/hardware.
   - Owner = `roles.adminGateOwner`.
2. Deploy `UpdateGate` with:
   - Owner = `roles.updateGateOwner`.
   - Wired to AdminGate where appropriate.
3. Deploy `ConfigGate` with:
   - Owner = `roles.configGateOwner`.
   - `ConfigGate.adminGate` set to the AdminGate address.

Ownership & control flows are then enforced via AdminGate/UpdateGate/ConfigGate.

### Step 3 — Deploy validator + emissions + rewards stack

1. Deploy `ValidatorSet` with:
   - Owner = `roles.validatorSetOwner`.
2. Deploy `VoidEmissionsController`.
3. Deploy `RewardEngine` with:
   - Owner = `roles.rewardEngineOwner`.
   - Wired to:
     - `IVoidTokenLike(VoidToken)`.
     - `IValidatorSetLike(ValidatorSet)`.
     - Emissions controller budget (limit how fast rewards can flow).

### Step 4 — Register validator0 as genesis validator

Use the configuration from `.validator0.*` in the live JSON:

- `reward` address     = `validator0.reward`.
- `consensusKey`       = `validator0.consensusKey` (bytes32).
- `stakeVOID (raw)`    = `validator0.stakeVOID`.

Plan:

1. Transfer `stakeVOID` from VoidTreasury into whatever holding the `ValidatorSet`
   requires for locked stake.
2. Call into `ValidatorSet` to register validator0 and lock the stake.
3. Confirm validator0 is seen as active and correctly configured.

### Step 5 — Wire ownership and permissions

After contracts are deployed:

1. Transfer ownership of `VoidTreasury` to `roles.treasuryOwner`.
2. Transfer ownership of `OpsTreasury` to `roles.opsTreasuryOwner`.
3. Ensure:
   - `AdminGate`, `ConfigGate`, `ValidatorSet`, `RewardEngine`, `VoidTreasury`,
     `OpsTreasury`, and any `PremineVault`/`Treasury` wrapper
     all have owners/admins matching `.roles.*` in the live JSON.
4. Optionally, renounce any temporary deployer-only privileges so the
   system is clean and governed only through the gates.

### Step 6 — Update live JSON with deployed contract addresses

After **real** broadcast and verification:

- Write back to `config/void-mainnet-bootstrap-mainnet.live.json`:

  - `contracts.updateGate`
  - `contracts.adminGate`
  - `contracts.configGate`
  - `contracts.validatorSet`
  - `contracts.voidToken`
  - `contracts.voidTreasury`
  - `contracts.opsTreasury`
  - `contracts.rewardEngine`
  - `contracts.premineVault` (if separate)
  - `contracts.treasury`     (if separate wrapper)

- Keep this JSON as the public *wiring manifest* (no secrets).
- All keys remain off-repo (LUKS/hardware only).

---

## 5. Post-launch verification

Immediately after the real ceremony we will:

1. Run all mainnet health hammers:
   - `./ops/void-mainnet-health-all.sh`
   - `./ops/void-mainnet-mainnet-health-all.sh`
   - `./ops/void-mainnet-planning-with-mainnet-health-all.sh`
   - `./ops/void-mainnet-health-with-mainnet-all.sh`
2. Verify:
   - `void:mainnet_overall:health:last_5m_v2 == 1`
   - `void:mainnet_pillars:health:last_5m == 1`
   - `void:mainnet_pillars:health_with_mainnet:last_5m == 1`
3. Check on-chain:
   - Total VOID supply.
   - VoidTreasury balance.
   - OpsTreasury balance.
   - RewardEngine wiring.
   - ValidatorSet contents (validator0 active, correct stake, correct consensusKey).
4. Tag the repo with a “mainnet-bootstrap-complete” checkpoint.

Until all of the above is green, the ceremony is considered **incomplete**.

