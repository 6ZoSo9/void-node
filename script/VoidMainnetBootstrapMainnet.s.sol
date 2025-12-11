// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

import {VoidToken} from "../contracts/VoidToken.sol";
import {VoidEmissionsController} from "../contracts/VoidEmissionsController.sol";
import {AdminGate} from "../contracts/AdminGate.sol";
import {ConfigGate} from "../contracts/ConfigGate.sol";
import {ValidatorSet} from "../contracts/mainnet/ValidatorSet.sol";
import {RewardEngine} from "../contracts/mainnet/RewardEngine.sol";
import {VoidTreasury} from "../contracts/mainnet/VoidTreasury.sol";
import {OpsTreasury} from "../contracts/mainnet/OpsTreasury.sol";
import {IVoidTokenLike} from "../contracts/mainnet/IVoidTokenLike.sol";
import {IValidatorSetLike} from "../contracts/mainnet/IValidatorSetLike.sol";

/// @notice VOID mainnet bootstrap (MAINNET) script.
///
/// PLAN-first, RUN-stub version:
///   - Reads a JSON config (the *.live.json plan file).
///   - Validates basic invariants (chainId).
///   - Logs roles, contracts, validator0, and a narrative "real wiring" plan.
///   - NEVER broadcasts or mutates state.
///
/// Current behavior:
///   - `plan(configPath)`  -> PLAN-only, view-ish, no broadcast.
///   - `run(configPath)`   -> runs the same PLAN and ALWAYS reverts
///                            with "RUN_STUB_ONLY" (pre-push gate depends on this).
///
/// Later, when we are truly ready for mainnet, we will:
///   - Introduce a separate "real run" entrypoint (or sentinel-protected path).
///   - Keep this script's safety behavior until we deliberately flip it.
contract VoidMainnetBootstrapMainnet is Script {
    uint256 internal constant VOID_CHAIN_ID = 2050;

    struct Roles {
        address deployer;
        address treasuryAdmin;
        address opsTreasuryAdmin;
        address validatorAdmin;

        address adminGateOwner;
        address updateGateOwner;
        address configGateOwner;

        address treasuryOwner;
        address opsTreasuryOwner;
        address rewardEngineOwner;
        address validatorSetOwner;
    }

    struct Contracts {
        address updateGate;
        address adminGate;
        address configGate;
        address validatorSet;

        address voidToken;
        address premineVault;
        address treasury;
        address voidTreasury;
        address opsTreasury;
        address rewardEngine;
    }

    struct Validator0 {
        address reward;
        bytes32 consensusKey;
        uint256 stakeVOID;
    }

    struct ConfigView {
        uint256 chainId;
        Roles roles;
        Contracts contracts;
        Validator0 validator0;
    }

    /// @dev Secrets / env-driven values for future real-mainnet wiring.
    ///      Currently unused; kept as a placeholder.
    struct Secrets {
        uint256 deployerKey; // e.g. vm.envUint("VOID_MAINNET_DEPLOYER_KEY");
        // Future:
        // uint256 validatorAdminKey;
        // uint256 treasuryAdminKey;
        // uint256 opsTreasuryAdminKey;
        // uint256 rewardEngineOwnerKey;
    }

    /// @dev For the skeleton "real" wiring, we mirror the dev script structure.
    ///      This is documentation only; we DO NOT call this in run().
    struct Deployed {
        VoidToken token;
        VoidEmissionsController emissions;
        AdminGate adminGate;
        ConfigGate configGate;
        ValidatorSet validatorSet;
        OpsTreasury opsTreasury;
        VoidTreasury voidTreasury;
        RewardEngine rewardEngine;
    }

    /// @dev Load the config into a lightweight in-memory view (read-only).
    function loadConfigView(string memory configPath) internal view returns (ConfigView memory cfg) {
        string memory json = vm.readFile(configPath);

        // Top-level
        cfg.chainId = vm.parseJsonUint(json, ".chainId");

        // Roles
        cfg.roles.deployer = vm.parseJsonAddress(json, ".roles.deployer");
        cfg.roles.treasuryAdmin = vm.parseJsonAddress(json, ".roles.treasuryAdmin");
        cfg.roles.opsTreasuryAdmin = vm.parseJsonAddress(json, ".roles.opsTreasuryAdmin");
        cfg.roles.validatorAdmin = vm.parseJsonAddress(json, ".roles.validatorAdmin");

        cfg.roles.adminGateOwner = vm.parseJsonAddress(json, ".roles.adminGateOwner");
        cfg.roles.updateGateOwner = vm.parseJsonAddress(json, ".roles.updateGateOwner");
        cfg.roles.configGateOwner = vm.parseJsonAddress(json, ".roles.configGateOwner");

        cfg.roles.treasuryOwner = vm.parseJsonAddress(json, ".roles.treasuryOwner");
        cfg.roles.opsTreasuryOwner = vm.parseJsonAddress(json, ".roles.opsTreasuryOwner");
        cfg.roles.rewardEngineOwner = vm.parseJsonAddress(json, ".roles.rewardEngineOwner");
        cfg.roles.validatorSetOwner = vm.parseJsonAddress(json, ".roles.validatorSetOwner");

        // Contracts
        cfg.contracts.updateGate = vm.parseJsonAddress(json, ".contracts.updateGate");
        cfg.contracts.adminGate = vm.parseJsonAddress(json, ".contracts.adminGate");
        cfg.contracts.configGate = vm.parseJsonAddress(json, ".contracts.configGate");
        cfg.contracts.validatorSet = vm.parseJsonAddress(json, ".contracts.validatorSet");

        cfg.contracts.voidToken = vm.parseJsonAddress(json, ".contracts.voidToken");
        cfg.contracts.premineVault = vm.parseJsonAddress(json, ".contracts.premineVault");
        cfg.contracts.treasury = vm.parseJsonAddress(json, ".contracts.treasury");
        cfg.contracts.voidTreasury = vm.parseJsonAddress(json, ".contracts.voidTreasury");
        cfg.contracts.opsTreasury = vm.parseJsonAddress(json, ".contracts.opsTreasury");
        cfg.contracts.rewardEngine = vm.parseJsonAddress(json, ".contracts.rewardEngine");

        // Validator0
        {
            // reward: optional, may be zero-address when not yet chosen
            try vm.parseJsonAddress(json, ".validator0.reward") returns (address rewardAddr) {
                cfg.validator0.reward = rewardAddr;
            } catch {
                cfg.validator0.reward = address(0);
            }

            // consensusKey: required, 32-byte hex string
            bytes32 consensusKey = vm.parseJsonBytes32(json, ".validator0.consensusKey");
            cfg.validator0.consensusKey = consensusKey;

            // stakeVOID: raw uint256
            uint256 stakeVOID = vm.parseJsonUint(json, ".validator0.stakeVOID");
            cfg.validator0.stakeVOID = stakeVOID;
        }
    }

    function _logRoles(ConfigView memory cfg) internal view {
        console2.log("=== [roles] ===");
        console2.log("  deployer          :", cfg.roles.deployer);
        console2.log("  treasuryAdmin     :", cfg.roles.treasuryAdmin);
        console2.log("  opsTreasuryAdmin  :", cfg.roles.opsTreasuryAdmin);
        console2.log("  validatorAdmin    :", cfg.roles.validatorAdmin);
        console2.log("  adminGateOwner    :", cfg.roles.adminGateOwner);
        console2.log("  updateGateOwner   :", cfg.roles.updateGateOwner);
        console2.log("  configGateOwner   :", cfg.roles.configGateOwner);
        console2.log("  treasuryOwner     :", cfg.roles.treasuryOwner);
        console2.log("  opsTreasuryOwner  :", cfg.roles.opsTreasuryOwner);
        console2.log("  rewardEngineOwner :", cfg.roles.rewardEngineOwner);
        console2.log("  validatorSetOwner :", cfg.roles.validatorSetOwner);
    }

    function _logContracts(ConfigView memory cfg) internal view {
        console2.log("=== [contracts] ===");
        console2.log("  updateGate   :", cfg.contracts.updateGate);
        console2.log("  adminGate    :", cfg.contracts.adminGate);
        console2.log("  configGate   :", cfg.contracts.configGate);
        console2.log("  validatorSet :", cfg.contracts.validatorSet);
        console2.log("  voidToken    :", cfg.contracts.voidToken);
        console2.log("  premineVault :", cfg.contracts.premineVault);
        console2.log("  treasury     :", cfg.contracts.treasury);
        console2.log("  voidTreasury :", cfg.contracts.voidTreasury);
        console2.log("  opsTreasury  :", cfg.contracts.opsTreasury);
        console2.log("  rewardEngine :", cfg.contracts.rewardEngine);
    }

    function _logValidator0(ConfigView memory cfg) internal view {
        console2.log("=== [validator0] ===");
        console2.log("  reward       :", cfg.validator0.reward);
        console2.logBytes32(cfg.validator0.consensusKey);
        console2.log("  stakeVOID    :", cfg.validator0.stakeVOID);
    }

    function _logPlanNarrative(ConfigView memory cfg) internal view {
        console2.log("=== [PLAN narrative] VOID mainnet bootstrap (high-level) ===");

        console2.log("Step 0: Confirm we are on the correct chain.");
        console2.log("  - runtime chainId :", block.chainid);
        console2.log("  - cfg.chainId     :", cfg.chainId);

        console2.log("Step 1: Roles + keys sanity (keys pillar).");
        console2.log("  - roles mapping has already been checked off-chain by the keys pillar.");
        console2.log("  - this script just echoes the roles to match what Prom / voidkey expect.");

        console2.log("Step 2: Gate ownership wiring (AdminGate/UpdateGate/ConfigGate).");
        console2.log("  - AdminGate.owner    ->", cfg.roles.adminGateOwner);
        console2.log("  - UpdateGate.owner   ->", cfg.roles.updateGateOwner);
        console2.log("  - ConfigGate.owner   ->", cfg.roles.configGateOwner);

        console2.log("Step 3: Treasury layout.");
        console2.log("  - PremineVault       ->", cfg.contracts.premineVault);
        console2.log("  - VoidTreasury       ->", cfg.contracts.voidTreasury);
        console2.log("  - OpsTreasury        ->", cfg.contracts.opsTreasury);
        console2.log("  - Treasury admin     ->", cfg.roles.treasuryAdmin);
        console2.log("  - OpsTreasury admin  ->", cfg.roles.opsTreasuryAdmin);

        console2.log("Step 4: RewardEngine + emissions wiring.");
        console2.log("  - RewardEngine       ->", cfg.contracts.rewardEngine);
        console2.log("  - RewardEngine owner ->", cfg.roles.rewardEngineOwner);
        console2.log("  - In real wiring, RewardEngine pulls from OpsTreasury and pays validators.");

        console2.log("Step 5: ValidatorSet mainnet.");
        console2.log("  - ValidatorSet       ->", cfg.contracts.validatorSet);
        console2.log("  - validatorSetOwner  ->", cfg.roles.validatorSetOwner);
        console2.log("  - validator0.reward  ->", cfg.validator0.reward);
        console2.log("  - validator0.stakeVOID (raw 18-dec) :", cfg.validator0.stakeVOID);
        console2.log("  - validator0.consensusKey:");
        console2.logBytes32(cfg.validator0.consensusKey);

        console2.log("Step 6: WorkCredits / econ layer (separate scripts).");
        console2.log("  - WorkCredits contracts are planned by VoidWorkCreditsMainnetPlan and friends.");
        console2.log("  - This script just ensures mainnet core + RewardEngine + validator econ are sane.");

        console2.log("Step 7: Final gate posture.");
        console2.log("  - After real bootstrap, control paths are via AdminGate/UpdateGate/ConfigGate.");
        console2.log("  - Premine key is retired; Treasury/OpsTreasury/RewardEngine/ValidatorSet are governed");
        console2.log("    via the mapped roles (treasuryAdmin, opsTreasuryAdmin, validatorAdmin, etc.).");
    }

    /// @dev Skeleton of what the REAL mainnet run() would do, using typed contracts.
    ///      This is **documentation only** and NEVER called from run().
    function _describeRealWiringSkeleton(ConfigView memory cfg) internal view {
        console2.log("=== [REAL wiring skeleton (documentation only)] ===");

        Deployed memory d;
        d.token       = VoidToken(cfg.contracts.voidToken);
        d.adminGate   = AdminGate(cfg.contracts.adminGate);
        d.configGate  = ConfigGate(cfg.contracts.configGate);
        d.validatorSet = ValidatorSet(cfg.contracts.validatorSet);
        d.opsTreasury = OpsTreasury(cfg.contracts.opsTreasury);
        d.voidTreasury = VoidTreasury(cfg.contracts.voidTreasury);
        d.rewardEngine = RewardEngine(cfg.contracts.rewardEngine);
        // d.emissions could be wired later once the final address is in the live JSON.

        console2.log("This is NOT executed today. It is a typed sketch for future wiring:");
        console2.log("  - Step A: Ensure premine is parked in a premine vault / treasury contract.");
        console2.log("  - Step B: Move operational slice into OpsTreasury (for RewardEngine).");
        console2.log("  - Step C: Configure RewardEngine with:");
        console2.log("      * VoidToken interface (IVoidTokenLike)");
        console2.log("      * OpsTreasury funding source");
        console2.log("      * ValidatorSet mainnet handle");
        console2.log("  - Step D: Configure ValidatorSet with validator0 + RewardEngine linkage.");
        console2.log("  - Step E: Lock AdminGate/UpdateGate/ConfigGate owners to the on-disk roles.");
    }

    /// @dev Shared PLAN implementation used by both plan() and run().
    function _plan(ConfigView memory cfg, string memory configPath) internal view {
        console2.log("=== [VOID mainnet bootstrap PLAN (MAINNET)] ===");
        console2.log("configPath:", configPath);

        // Minimal invariants that are already true in your setup.
        if (cfg.chainId != VOID_CHAIN_ID) {
            console2.log("FATAL: cfg.chainId does not match VOID_CHAIN_ID.");
            revert("CFG_CHAIN_ID_MISMATCH");
        }

        if (block.chainid != VOID_CHAIN_ID) {
            console2.log("FATAL: runtime chainId does not match VOID_CHAIN_ID.");
            revert("RUNTIME_CHAIN_ID_MISMATCH");
        }

        _logRoles(cfg);
        _logContracts(cfg);
        _logValidator0(cfg);
        _logPlanNarrative(cfg);

        // Also echo the typed wiring skeleton for humans (and future AI) to read.
        _describeRealWiringSkeleton(cfg);

        console2.log("=== [PLAN summary] ===");
        console2.log("  - Keys pillar       : handled by ops/void-mainnet-keys-*.sh");
        console2.log("  - PLAN pillar       : handled by PLAN exporter + Prom rules.");
        console2.log("  - This script       : confirms chainId + echoes roles/contracts/validator0.");
        console2.log("  - run(configPath)   : STILL STUB-ONLY and will revert with RUN_STUB_ONLY.");
    }

    /// @notice PLAN-only entrypoint (no broadcast).
    function plan(string memory configPath) external {
        ConfigView memory cfg = loadConfigView(configPath);
        _plan(cfg, configPath);
    }

    /// @notice RUN entrypoint (MAINNET).
    ///
    /// For now, this is intentionally **stub-only**:
    ///   - It calls the same PLAN logic as plan().
    ///   - It ALWAYS reverts with "RUN_STUB_ONLY".
    ///
    /// The pre-push / health scripts expect this revert reason. Do not change it
    /// until we introduce a new, explicitly opt-in broadcast path.
    function run(string memory configPath) external {
        ConfigView memory cfg = loadConfigView(configPath);

        console2.log("=== [VOID mainnet bootstrap RUN (MAINNET) - STUB-ONLY] ===");
        _plan(cfg, configPath);
        console2.log("=== [RUN stub complete] About to revert with RUN_STUB_ONLY ===");

        revert("RUN_STUB_ONLY");
    }
}
