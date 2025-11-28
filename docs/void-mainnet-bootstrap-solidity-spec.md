# VOID Mainnet Bootstrap Solidity Spec

This document describes the intended behavior of the real
script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet
script for VOID mainnet (chainId 2050).

The current implementation is a STUB that:

- Reads a config JSON
- Checks chainId
- Logs sanity info
- Then reverts with:
  VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast

This spec defines what we want once the stub is replaced.

---

## 1. Inputs and config

### 1.1 Entry point

The script exposes:

  function run(string memory configPath) external;

This MUST:

- Use vm.readFile(configPath) to load the JSON.
- Use vm.parseJson* helpers to extract fields.

### 1.2 Config shape (high-level)

The config JSON (*.live.json) MUST contain:

- chainId (uint):
  - MUST equal block.chainid at runtime (2050).

- addresses object:
  - VoidToken
  - VoidTreasury
  - OpsTreasury
  - AdminGate
  - UpdateGate
  - ValidatorSet
  - RewardEngine

- Optionally, other wiring fields:
  - premineHolder (EOA or contract)
  - opsOwner / adminOwner addresses
  - validatorSetOwner
  - initialValidators[] (optional)

- Tokenomics / supply fields (if needed to cross-check):
  - maxSupply
  - premine
  - emissionsEra1
  - emissionsEra2
  - emissionsEra3
  - emissionsEra4

The script does NOT own the config; it only reads and verifies it.

---

## 2. High-level phases

The real bootstrap script should be structured into clear phases:

1. Chain & config sanity
2. Contract binding / attach
3. Invariants & wiring checks
4. Optionally: wiring transactions (broadcast mode only)

In PLAN / SIM mode (no --broadcast), phases 1–3 MUST run; phase 4 is simulated only.

### 2.1 Phase 1: Chain & config sanity

- Load JSON with vm.readFile(configPath).
- Read chainId from JSON.
- Compare with block.chainid:

  - If they differ, revert with a clear error, e.g.:

      error WrongChainId(uint256 expected, uint256 actual);

- Log:

  - "=== [VOID mainnet bootstrap mainnet] ==="
  - "runtime chainId : <runtime>"
  - "config  chainId : <config>"

This replaces the stub log text but keeps the same intent.

### 2.2 Phase 2: Contract binding

Using addresses from config.addresses:

- Attach interfaces to existing contracts:

      IVoidToken    voidToken    = IVoidToken(cfg.addresses.voidToken);
      IVoidTreasury voidTreasury = IVoidTreasury(cfg.addresses.voidTreasury);
      IOpsTreasury  opsTreasury  = IOpsTreasury(cfg.addresses.opsTreasury);
      IAdminGate    adminGate    = IAdminGate(cfg.addresses.adminGate);
      IUpdateGate   updateGate   = IUpdateGate(cfg.addresses.updateGate);
      IValidatorSet validatorSet = IValidatorSet(cfg.addresses.validatorSet);
      IRewardEngine rewardEngine = IRewardEngine(cfg.addresses.rewardEngine);

- Validate each address is non-zero. If any is zero, revert with:

      error MissingCoreAddress(string which);

- Log each binding:

  - "VoidToken: <addr>"
  - "VoidTreasury: <addr>"
  - "OpsTreasury: <addr>"
  - "AdminGate: <addr>"
  - "UpdateGate: <addr>"
  - "ValidatorSet: <addr>"
  - "RewardEngine: <addr>"

No state changes in this phase — fully safe to simulate.

### 2.3 Phase 3: Invariants & wiring checks

The script SHOULD verify key invariants using view calls only:

- Tokenomics invariants (if interfaces support them):

  - voidToken.maxSupply() equals MAX_SUPPLY from config.
  - Total premine ledger equals the premine field in config.
  - Emissions sums match MAX_SUPPLY - premine.

- Treasury flow invariants:

  - voidToken.balanceOf(VoidTreasury) equals (or dominates) the configured premine amount.
  - OpsTreasury is configured as a valid recipient in RewardEngine (if applicable).
  - RewardEngine knows about the correct VoidToken/Treasury addresses.

- Gate invariants:

  - AdminGate and UpdateGate are wired so that:
    - UpdateGate recognizes AdminGate (or vice versa) as per contract design.
    - Any core modules in scope (e.g. ValidatorSet, RewardEngine) are registered under UpdateGate.

- ValidatorSet invariants:

  - If initialValidators are present in config, cross-check that:
    - They are known to ValidatorSet.
    - Their stakes or weights match expectations.

If any invariant fails, revert with a specific error (not a generic string).

### 2.4 Phase 4: Wiring transactions (broadcast mode only)

The script should support two modes:

- SIM / PLAN mode (no --broadcast):
  - Only reads state, logs, and reverts on misconfig.
  - A successful run means: config and on-chain state are consistent.

- LIVE bootstrap mode (with --broadcast):
  - Run the same checks as SIM.
  - Additionally perform state-changing transactions needed to fully wire mainnet, for example:
    - Setting treasuries and reward engine parameters.
    - Registering modules in UpdateGate.
    - Initializing ValidatorSet with the initial validator set.
    - Moving premine from a premine holder EOA into VoidTreasury if not already done
      (or this may be a separate one-shot genesis action).

In LIVE mode, the script MUST:

- Emit detailed logs for each action, e.g.:
  - "Setting OpsTreasury in RewardEngine..."
  - "Registering ValidatorSet as core module..."
  - "Initializing ValidatorSet with N validators..."
- Fail fast on any revert with a clear error (no ambiguous require(false, "...")).

---

## 3. Interaction with PLAN and SIM

- The PLAN scripts (ops/void-mainnet-bootstrap-mainnet-plan*.sh) only check:
  - JSON structure
  - Addresses presence
  - Basic high-level flow
  - ChainId numeric sanity

- The SIM harness (ops/void-mainnet-bootstrap-mainnet-sim.sh) MUST be the bridge between:
  - The .live.json PLAN data
  - The real Solidity bootstrap logic

Once the real script is implemented:

- For a valid .live.json, the SIM harness SHOULD:
  - Complete without revert
  - Exit with code 0
  - Log a clear summary of matched invariants

- For an invalid .live.json, the SIM harness SHOULD:
  - Revert with an explicit error from Phase 1–3
  - Exit with non-zero status

---

## 4. Safety constraints

1. Never auto-broadcast by default.
   - Operator MUST pass --broadcast explicitly on the Forge CLI
     for any live mainnet run.

2. No implicit on-chain writes in PLAN / SIM flows.
   - Any state-changing function must be gated behind broadcast mode.

3. Clear separation of concerns:
   - Config JSON defines intent.
   - Script verifies reality vs intent.
   - Actual funds and authority moves are explicit and logged.

This spec is the target behavior for evolving
VoidMainnetBootstrapMainnet.s.sol from a simple stub into the canonical
VOID mainnet bootstrap script.
