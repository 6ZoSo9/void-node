# VOID Mainnet Bootstrap — LIVE Wiring Design (Draft, Stub-Only)

Status of this document:
- This is the *design spec* for how `VoidMainnetBootstrapMainnet.run(configPath)` will behave once LIVE wiring is implemented.
- Right now, `run()` is STUB ONLY and always reverts:
    "VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast"
- This doc does **not** enable broadcast. It just defines the algorithm and invariants.

Target script: `script/VoidMainnetBootstrapMainnet.s.sol`
Target config: `config/void-mainnet-bootstrap-mainnet.live.json`
Target chain: `chainId = 2050` (VOID mainnet)

---

## 1. Goals

When LIVE wiring is implemented, a single, carefully controlled call to `run(configPath)` should:

1. **Deploy and wire** the core VOID mainnet contracts:
   - `VoidToken`
   - Optional `VoidPremineVault` (if we keep this split)
   - `VoidTreasury`
   - `OpsTreasury`
   - `AdminGate`
   - `UpdateGate`
   - `ConfigGate`
   - `ValidatorSet`
   - `VoidEmissionsController`
   - `RewardEngine`
2. **Register validator0** as the genesis validator with initial stake locked.
3. **Transfer ownerships** to the correct role addresses from the LIVE JSON.
4. **Update the LIVE JSON** (or at least print a machine-readable patch) with deployed contract addresses under `.contracts.*`.
5. **Stay idempotent**: refuse to run if anything critical already exists or doesn’t match expectations.
6. **NEVER leak secrets**: private keys only come from env/LUKS/hardware; never logged.

---

## 2. Inputs & Preconditions

### 2.1 Config JSON

`config/void-mainnet-bootstrap-mainnet.live.json` must contain:

- `chainId` (2050)
- `.roles.*`:
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
- `.contracts.*`:
  - All **zero** BEFORE first real broadcast.
- `.validator0`:
  - `reward` (EOA for validator rewards)
  - `consensusKey` (bytes32)
  - `stakeVOID` (raw amount, e.g. 1_000_000 * 1e18 or similar, depending on token decimals decision).

### 2.2 Secrets (env-backed)

`run(configPath)` will **require**:

- `VOID_MAINNET_DEPLOYER_KEY` (uint256) — comes from LUKS/hardware, not repo.

Algorithm:

- Load via `vm.envUint("VOID_MAINNET_DEPLOYER_KEY")`.
- Compute `deployerAddr = vm.addr(deployerKey)`.
- **Hard check**: `deployerAddr == cfg.roles.deployer`.
- If mismatch, revert with a loud message.

Later, if we decide we need more keys (treasury admin, validator admin, etc.), we’ll extend the `Secrets` struct, but v1 only needs the deployer key.

### 2.3 External gating (ops side)

Before *anyone* is allowed to call `run()` against a real mainnet RPC, ops-side checks must say:

- `void:mainnet_pillars:health:last_5m == 1`
- `void:mainnet_pillars:health_with_keys:last_5m == 1`
- `void_mainnet_bootstrap_plan_health == 1`
- PLAN sim + PLAN print are up to date and match the LIVE JSON.
- Roles mapping and LIVE JSON are frozen and backed up.
- LUKS/hardware keys tested and backed up.
- Repo tagged and protected.

The script **cannot** see Prometheus, so this is enforced via ops tooling and pre-flight scripts, not Solidity.

---

## 3. Phases of `run(configPath)` (LIVE Mode)

### Phase 0 — PLAN reuse & invariants

- Call `loadConfigView(configPath)` → `ConfigView cfg`.
- Check `block.chainid == cfg.chainId` or revert.
- Enforce the same role & validator invariants as `plan()`:
  - All critical roles non-zero.
  - `cfg.validator0.stakeVOID > 0`.
- Enforce **pre-broadcast contracts invariant**:
  - All `cfg.contracts.* == address(0)` or revert:
    `"contracts.* must be zeroed pre-broadcast (LIVE)"`.
- Log a high-level summary like PLAN:
  - roles, validator0, narrative steps.

This guarantees we never try to “re-run” a half-applied mainnet bootstrap.

### Phase 1 — Secrets & deployer sanity

- Load secrets: `Secrets memory s = loadSecrets(cfg);`
- Derive deployer address, match `cfg.roles.deployer` (already in `loadSecrets`).
- Use `vm.startBroadcast(s.deployerKey)` for the actual wiring phase.
- Everything from this point until `vm.stopBroadcast()` counts as REAL deployment.

Safety invariant:

- If `vm.envUint("VOID_MAINNET_DEPLOYER_KEY")` is missing or wrong, we **never** enter broadcast.

### Phase 2 — Core token + premine + treasuries

1. **Deploy `VoidToken`** (if not pre-existing):
   - Only allowed if `cfg.contracts.voidToken == address(0)` in JSON.
   - After deployment:
     - Assert total supply == expected MAX_SUPPLY.
     - Assert premine is sitting on the premine owner account (or vault, depending on design).

2. **Deploy `VoidTreasury` & `OpsTreasury`**:
   - `VoidTreasury` admin: `cfg.roles.treasuryAdmin`.
   - `OpsTreasury` admin: `cfg.roles.opsTreasuryAdmin`.

3. **Premine flow** (high-level design):
   - Move the entire premine into `VoidTreasury`.
   - Leave the premine key with **zero** VOID and no privileged role.
   - Optionally: use a temporary `VoidPremineVault` if we want extra auditability, then move from vault → treasury.

4. **Post-conditions** for Phase 2:
   - `VoidToken.balanceOf(premineOwner) == 0`.
   - `VoidToken.balanceOf(VoidTreasury) == MAX_SUPPLY` (minus any explicit initial OpsTreasury allocation, if we design one).
   - `VoidTreasury.owner() == cfg.roles.treasuryOwner`.
   - `OpsTreasury.owner() == cfg.roles.opsTreasuryOwner`.

If any of these fail, revert. No “best effort” here.

### Phase 3 — Governance gates

1. **Deploy `AdminGate`**:
   - Master key is **not** encoded in JSON; it must come from hardware/LUKS.
   - For LIVE script we do **not** handle the master key itself; only the owned contract address + owner.
   - `AdminGate` owner: `cfg.roles.adminGateOwner`.

2. **Deploy `UpdateGate`**:
   - Owner: `cfg.roles.updateGateOwner`.
   - Wired so `AdminGate` can control upgrade/legal-critical actions.

3. **Deploy `ConfigGate`**:
   - Owner: `cfg.roles.configGateOwner`.
   - `ConfigGate.adminGate` set to `AdminGate`.

4. **Post-conditions**:
   - `AdminGate.owner() == adminGateOwner`.
   - `UpdateGate.owner() == updateGateOwner`.
   - `ConfigGate.owner() == configGateOwner`.
   - `ConfigGate.adminGate() == AdminGate`.

### Phase 4 — Validator + emissions + rewards stack

1. **Deploy `ValidatorSet`**:
   - Owner: `cfg.roles.validatorSetOwner`.

2. **Deploy `VoidEmissionsController`**:
   - Admin from config or derived from roles (TBD).
   - Knows about `VoidToken` and `RewardEngine` later.

3. **Deploy `RewardEngine`**:
   - Owner: `cfg.roles.rewardEngineOwner`.
   - Configure:
     - `rewardEngine.setToken(IVoidTokenLike(voidToken))`
     - `rewardEngine.setValidatorSet(IValidatorSetLike(validatorSet))`
     - `rewardEngine.setEmissionsController(emissionsController)`

4. **Post-conditions**:
   - All `set*` calls succeed.
   - No unexpected zero addresses inside `RewardEngine` or `EmissionsController`.

### Phase 5 — Register genesis validator (validator0)

Use `cfg.validator0`:

- `reward` (EOA)
- `consensusKey` (bytes32)
- `stakeVOID` (uint256)

High-level:

1. Ensure `cfg.validator0.reward != address(0)`.
2. Ensure `cfg.validator0.consensusKey != 0`.
3. Ensure `cfg.validator0.stakeVOID > 0`.
4. From within broadcast:
   - Fund the validator0 stake out of `VoidTreasury` via `RewardEngine`/`ValidatorSet` or a dedicated staking function.
   - Call into `ValidatorSet` with the necessary struct(s) to register validator0 as ACTIVE.
5. Post-conditions:
   - `ValidatorSet.getValidator(validator0.consensusKey)` returns an ACTIVE validator referencing the reward address.
   - `VoidToken` shows the expected stake as locked (balance adjustments / internal accounting).

If anything doesn’t match, revert.

### Phase 6 — Ownership + final wiring

- Ensure final contract owners match the config roles:
  - `VoidTreasury.owner() == treasuryOwner`.
  - `OpsTreasury.owner() == opsTreasuryOwner`.
  - `AdminGate/UpdateGate/ConfigGate/ValidatorSet/RewardEngine` owners match their respective role fields.
- Ensure no leftover deployer-only ownership where it shouldn’t exist.

This is where we permanently move out of “deployer authority” and into the AdminGate/UpdateGate/ConfigGate pattern and treasuries.

---

## 4. JSON update strategy

We have two options:

### Option A — Script updates JSON on-chain addresses

Steps:

1. After successful broadcast, use `vm.serializeAddress` + `vm.writeJson` to update:
   - `.contracts.updateGate`
   - `.contracts.adminGate`
   - `.contracts.configGate`
   - `.contracts.validatorSet`
   - `.contracts.voidToken`
   - `.contracts.premineVault` (if any)
   - `.contracts.treasury`
   - `.contracts.voidTreasury`
   - `.contracts.opsTreasury`
   - `.contracts.rewardEngine`
2. This produces an updated `config/void-mainnet-bootstrap-mainnet.live.json` on disk.

Pros:
- Less manual copying.
- One source of truth.

Cons:
- Must be handled VERY carefully (no accidental overwrite of unrelated fields).
- Needs pre-flight backup of the JSON file.

### Option B — Script prints machine-readable patch

- Script logs a JSON blob like:

    {
      "contracts": {
        "updateGate": "0x...",
        "adminGate": "0x...",
        ...
      }
    }

- Ops script consumes this and patches the LIVE JSON via jq or a small helper script.

This is safer operationally, but more work. For first version, we can start with **Option B** and graduate to Option A if we want.

---

## 5. Idempotency & Failure Modes

`run(configPath)` must be **one-shot**:

- If any of `cfg.contracts.*` is **non-zero** at the start, revert:
  - "contracts.* must be zeroed pre-broadcast (LIVE)".
- If `block.chainid != cfg.chainId`, revert.
- If any critical role is zero, revert.
- If any validator0 field is invalid, revert.
- If any on-chain deploy or wiring step fails (unexpected owner, wrong balance, etc.), revert.

We explicitly **do not** support “partial retry” in the script itself. Recovery from partial deploys, if ever needed, will be a manual incident response with its own playbook.

---

## 6. Relationship to Dev Bootstrap Script

- `VoidMainnetBootstrapDev.s.sol` remains the playground:
  - Runs against anvil-2050.
  - Does real deployments for testing.
  - Uses similar or identical JSON structure.
- Before we implement LIVE wiring in `VoidMainnetBootstrapMainnet.run()`:
  - We will mirror the logic from Dev script.
  - We will verify that the roles, validator0, premine behavior, and ownership flows match.
  - We will tag and freeze the repo.

Eventually, `run(configPath)` should be a **strictly more constrained** version of the dev wiring, with extra safety checks and no shortcuts.

---

## 7. Implementation Order (when we’re ready)

When we eventually decide to implement LIVE wiring:

1. Finalize this design doc and tag it.
2. Ensure Dev bootstrap script is updated to match this behavior exactly on anvil.
3. Implement the phases inside `VoidMainnetBootstrapMainnet.run()`:
   - Keep `plan()` and `planWithSecrets()` as-is (PLAN only).
   - Add a new internal function, e.g. `_runLive(ConfigView memory cfg, Secrets memory s)`, that contains the real wiring.
4. Keep the STUB revert until:
   - All tests pass on a full dry-run workflow.
   - Ops scripts for pre-flight and post-flight are ready.
5. Only then remove the stub revert and enable broadcast script behind a very explicit flag.

For now, this document is the blueprint. Code remains stub-only.
