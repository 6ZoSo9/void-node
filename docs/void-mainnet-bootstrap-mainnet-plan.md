# VOID Mainnet Bootstrap — Mainnet Plan (PLAN-only, no broadcast)

**Status (2025-12-01):**

- `config/void-mainnet-bootstrap-mainnet.live.json`:
  - `chainId = 2050`
  - All core roles are non-zero and finalized.
  - All `contracts.*` are **zeroed** (no live deployments yet).
  - `validator0` is populated (reward address, consensus key, stakeVOID > 0).

- `script/VoidMainnetBootstrapMainnet.s.sol`:
  - `plan(configPath)`:
    - Reads the LIVE JSON.
    - Enforces:
      - `block.chainid == cfg.chainId` (2050).
      - All critical roles non-zero.
      - `validator0.stakeVOID > 0`.
      - All `contracts.* == address(0)` pre-broadcast.
    - Logs roles, contracts (all zero), validator0, and a high-level PLAN narrative.
    - **No broadcasts, no state changes.**
  - `planWithSecrets(configPath)`:
    - Loads config.
    - Loads `VOID_MAINNET_DEPLOYER_KEY` via `vm.envUint`.
    - Checks `vm.addr(VOID_MAINNET_DEPLOYER_KEY) == cfg.roles.deployer`.
    - Reuses `plan(configPath)` for validation + narrative.
    - **No broadcasts, no state changes.**
  - `run(configPath)`:
    - Calls `plan(configPath)`.
    - **Always reverts** with a stub message.
    - No deployments, no state changes (safety fuse).

- Keys + roles pillar:
  - `mainnet-roles-mapping.txt` on LUKS voidkey == LIVE JSON roles (1:1).
  - `void_mainnet_keys_roles_ok == 1`.
  - `void:mainnet_keys_roles:ok:last_5m == 1`.
  - `void:mainnet_pillars:health_with_keys:last_5m == 1`.
  - Pre-push / pillars-preflight all **OK** with keys folded in.

This document defines the **intended** mainnet bootstrap sequence for `run()` **before** we implement any broadcast logic.

---

## Roles and high-level intent

From `config/void-mainnet-bootstrap-mainnet.live.json`:

- **Deployer / premine executor**
  - `roles.deployer` — address that will:
    - Deploy all core contracts.
    - Hold premine token balance *temporarily*.
    - Move the entire premine into `VoidTreasury` and end with **zero** balance.

- **Treasury & operations**
  - `roles.treasuryAdmin`
  - `roles.opsTreasuryAdmin`
  - `roles.treasuryOwner`
  - `roles.opsTreasuryOwner`

- **Governance / gates**
  - `roles.adminGateOwner`
  - `roles.updateGateOwner`
  - `roles.configGateOwner`

- **Validators / rewards**
  - `roles.validatorAdmin`
  - `roles.rewardEngineOwner`
  - `roles.validatorSetOwner`

- **Validator0**
  - `validator0.reward`
  - `validator0.consensusKey`
  - `validator0.stakeVOID` (raw token amount, > 0)

All contracts listed under `contracts.*` are currently zero and will be filled once we do the real broadcast.

---

## Intended broadcast sequence (future `run()` wiring)

This is the **transaction-level plan** for a single `run(configPath)` broadcast when we are ready. For now it’s just a blueprint.

### Phase 0 — Preconditions

1. **Environment & chain sanity**
   - `block.chainid == cfg.chainId` (2050).
   - `VOID_MAINNET_DEPLOYER_KEY` is set in the environment.
   - `vm.addr(VOID_MAINNET_DEPLOYER_KEY) == cfg.roles.deployer`.
   - All `contracts.* == address(0)` in LIVE JSON.

2. **Roles invariants**
   - All critical roles non-zero:
     - `deployer`
     - `treasuryAdmin`
     - `opsTreasuryAdmin`
     - `validatorAdmin`
     - `adminGateOwner`
     - `updateGateOwner`
     - `configGateOwner`
     - `treasuryOwner`
     - `opsTreasuryOwner`
     - `rewardEngineOwner`
     - `validatorSetOwner`
   - `validator0.stakeVOID > 0`.

3. **Broadcast setup**
   - `vm.startBroadcast(VOID_MAINNET_DEPLOYER_KEY);`
   - All deployments and calls in this script happen from `roles.deployer`.

---

### Phase 1 — Token + treasury stack

**Goal:** Deploy `VoidToken`, `OpsTreasury`, `VoidTreasury`, then move the entire premine into `VoidTreasury` and leave zero balance on the premine key.

Plan (mirrors `VoidMainnetBootstrapDev._bootstrapCore` with mainnet roles):

1. **Deploy `VoidToken`**
   - Constructor owner set so that premine is minted to a controlled address (typically the deployer/voidOwner analogue in mainnet mapping).
   - Verify:
     - `totalSupply == PREMINE`.
     - `balanceOf(premineOwner) == PREMINE`.

2. **Deploy `OpsTreasury`**
   - `new OpsTreasury(IVoidTokenLike(address(voidToken)), roles.opsTreasuryAdmin);`
   - Store deployed address in memory as `contracts.opsTreasury`.

3. **Deploy `VoidTreasury`**
   - `new VoidTreasury(IVoidTokenLike(address(voidToken)), address(opsTreasury), roles.treasuryAdmin);`
   - Store deployed address in memory as `contracts.voidTreasury`.

4. **Move premine into `VoidTreasury`**
   - Transfer the **entire** premine balance from premineOwner → `VoidTreasury`.
   - Post-condition:
     - `balanceOf(premineOwner) == 0`.
     - `balanceOf(VoidTreasury) == PREMINE`.

5. **Mark intended JSON writes (manual step after broadcast)**
   - `contracts.voidToken`
   - `contracts.voidTreasury`
   - `contracts.opsTreasury`
   - `contracts.treasury` / `contracts.premineVault` (if used)

These will be manually written back into `void-mainnet-bootstrap-mainnet.live.json` after we verify on-chain state.

---

### Phase 2 — Governance gates

**Goal:** Deploy and wire AdminGate / UpdateGate / ConfigGate using the finalized roles from LIVE JSON.

Plan:

1. **Deploy `AdminGate`**
   - Use chainId 2050.
   - Master key comes from an offline/secure key (not from LIVE JSON).
   - Owner: `roles.adminGateOwner`.
   - Initially, `UpdateGate` may be unset or wired later.

2. **Deploy `UpdateGate`**
   - Owner: `roles.updateGateOwner`.
   - Wire its authority to `AdminGate` (exact pattern from dev wiring).

3. **Deploy `ConfigGate`**
   - `new ConfigGate(2050, address(adminGate));`
   - Owner: `roles.configGateOwner` (via AdminGate).

4. **Post-conditions**
   - `ConfigGate.adminGate == address(AdminGate)`.
   - Admin roles / owners match LIVE JSON roles.

5. **JSON fields to fill after broadcast**
   - `contracts.updateGate`
   - `contracts.adminGate`
   - `contracts.configGate`

---

### Phase 3 — Validators, emissions, rewards

**Goal:** Deploy `ValidatorSet`, `VoidEmissionsController`, `RewardEngine`, and wire them together.

Plan:

1. **Deploy `ValidatorSet`**
   - Admin: `roles.validatorAdmin`.
   - Store address into `contracts.validatorSet`.

2. **Deploy `VoidEmissionsController`**
   - Admin: `roles.emissionsAdmin` analogue (from dev script; mapped into mainnet roles).
   - Confirm emissions budget and parameters.

3. **Deploy `RewardEngine`**
   - `new RewardEngine(IVoidTokenLike(address(voidToken)), IValidatorSetLike(address(validatorSet)), roles.rewardEngineOwner);`
   - Wire reward engine to emissions controller and treasury as needed.
   - Store address into `contracts.rewardEngine`.

4. **JSON fields to fill after broadcast**
   - `contracts.validatorSet`
   - `contracts.rewardEngine`
   - (Plus any additional addresses like emissions controller if we add it to config.)

---

### Phase 4 — Register validator0 (genesis validator)

**Goal:** Lock in the first validator with stake and consensus key.

Plan:

1. **Validator0 parameters (from LIVE JSON)**
   - `validator0.reward`
   - `validator0.consensusKey`
   - `validator0.stakeVOID`

2. **Stake + registration**
   - Ensure `VoidTreasury` and/or `RewardEngine` / staking module have authority and balance to lock `validator0.stakeVOID`.
   - Call ValidatorSet entrypoint to:
     - Register validator0’s consensus key.
     - Set reward address.
     - Lock the configured amount of VOID as stake.

3. **Post-conditions**
   - Validator0 registered and active.
   - Stake locked per design.
   - Ownership/admin roles on ValidatorSet match LIVE JSON.

---

### Phase 5 — Ownership handoff and permissions

**Goal:** Ensure all core contracts are owned/administered by the right addresses (no stray deployer privileges).

Plan:

1. **Treasuries**
   - Transfer ownership of `VoidTreasury` to `roles.treasuryOwner`.
   - Transfer ownership of `OpsTreasury` to `roles.opsTreasuryOwner`.

2. **Governance gates**
   - Confirm `AdminGate` is fully controlled by the master key / AdminGateOwner.
   - Confirm `UpdateGate` and `ConfigGate` are wired to AdminGate and have their final owners.

3. **Validator & rewards**
   - Verify `ValidatorSet.admin == roles.validatorAdmin`.
   - Verify `RewardEngine.admin == roles.rewardEngineOwner`.

4. **Post-conditions**
   - Deployer has no residual privileged ownership on any long-lived contract.
   - All owners/admins match the `roles.*` entries in LIVE JSON.

---

### Phase 6 — Post-broadcast config update & metrics

After a real `run(configPath)` broadcast succeeds (not implemented yet):

1. **Update LIVE JSON**
   - Fill in:
     - `contracts.updateGate`
     - `contracts.adminGate`
     - `contracts.configGate`
     - `contracts.validatorSet`
     - `contracts.voidToken`
     - `contracts.premineVault` (if used)
     - `contracts.treasury`
     - `contracts.voidTreasury`
     - `contracts.opsTreasury`
     - `contracts.rewardEngine`
   - Save as `config/void-mainnet-bootstrap-mainnet.live.json`.
   - Optionally snapshot to a `.sealed` copy.

2. **PLAN/health exporters**
   - Dev PLAN exporter should:
     - Re-run a read-only rehearsal against the updated LIVE JSON.
     - Set `void_mainnet_bootstrap_plan_health = 1` **only** when:
       - Roles and keys match.
       - All `contracts.*` are non-zero and consistent with on-chain state.
       - Validator0 is correctly registered and staked.

3. **Pillars gating**
   - `void:mainnet_bootstrap_plan:health:last_5m == 1` becomes a hard gate.
   - Combined with:
     - mainnet-core health
     - mainnet-lastmile health
     - safeboot pillar
     - keys roles pillar

Only when all of these are green do we consider VOID mainnet “fully bootstrapped and sealed”.

---

## What’s *not* implemented yet (by design)

- `run(configPath)` in `VoidMainnetBootstrapMainnet`:
  - Still a stub that reverts.
  - No `vm.startBroadcast` calls.
  - No contract deployments.
  - No ownership transfers.
  - No on-chain writes.

- Real broadcast harness:
  - `ops/void-mainnet-bootstrap-mainnet-broadcast.sh` remains intentionally disabled.
  - When we implement broadcast, we will:
    - Use this doc as the authority for ordering and invariants.
    - Keep a PLAN-only mode that never mutates state.
    - Gate everything behind Prometheus + pillars-preflight.

This document is the canonical blueprint for the future mainnet `run()` wiring. Any changes to the bootstrap sequence must be reflected here before we touch the Solidity or ops scripts.

