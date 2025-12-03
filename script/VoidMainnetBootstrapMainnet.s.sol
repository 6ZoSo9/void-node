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

/// @notice VOID mainnet bootstrap (Mainnet) script.
///
/// PLAN-only version:
///   - Reads a JSON config (the *.live.json plan file).
///   - Validates core invariants (chainId, roles, validator0).
///   - Logs roles, contracts, validator0, and a narrative plan.
///   - NEVER broadcasts or mutates state.
///
/// The dev bootstrap script is where real deployments are rehearsed:
///   - script/VoidMainnetBootstrapDev.s.sol
///
/// This script is wired for:
///   - `plan(configPath)`  -> PLAN-only, view, no broadcast.
///   - `run(configPath)`   -> calls `plan()` then ALWAYS reverts (safety fuse).
///
/// It also contains an internal `_runPlanRealSkeleton` helper that describes the
/// real mainnet wiring using actual contract types, but it is NEVER called and
/// does not broadcast. It is documentation / future wiring guidance only.
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

    /// @dev Secrets / env-driven values that will be wired later for real mainnet.
    ///      Currently unused; kept as a placeholder for future runReal-style entrypoint.
    struct Secrets {
        uint256 deployerKey;     // e.g. vm.envUint("VOID_MAINNET_DEPLOYER_KEY")
        // Future extension:
        //   address premineOwner;   // cold premine owner address
        //   address masterKey;      // AdminGate master key
        //   uint256 validatorAdminKey;
        //   uint256 treasuryAdminKey;
        //   uint256 opsTreasuryAdminKey;
        //   uint256 rewardEngineOwnerKey;
    }

    /// @dev For the skeleton "real" wiring, we mirror the dev script structure.
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
        console2.log("  - config  chainId :", cfg.chainId);
        console2.log("  - deployer        :", cfg.roles.deployer);

        console2.log("Step 1: Deploy core token + treasury contracts (from deployer).");
        console2.log("  - Deploy VoidToken with a premine owner key kept in cold storage.");
        console2.log("  - Deploy OpsTreasury, admin       :", cfg.roles.opsTreasuryAdmin);
        console2.log("  - Deploy VoidTreasury, admin      :", cfg.roles.treasuryAdmin);
        console2.log("  - Plan: move the entire premine into VoidTreasury and leave zero balance on the premine key.");

        console2.log("Step 2: Deploy governance gates.");
        console2.log("  - Deploy AdminGate with master key (hardware/LUKS key, not from this JSON).");
        console2.log("  - AdminGate owner            :", cfg.roles.adminGateOwner);
        console2.log("  - UpdateGate owner           :", cfg.roles.updateGateOwner);
        console2.log("  - Deploy ConfigGate, owner   :", cfg.roles.configGateOwner);
        console2.log("  - ConfigGate.adminGate wired to AdminGate.");

        console2.log("Step 3: Deploy validator + emissions + rewards stack.");
        console2.log("  - Deploy ValidatorSet, owner :", cfg.roles.validatorSetOwner);
        console2.log("  - Deploy emissions controller (VoidEmissionsController).");
        console2.log("  - Deploy RewardEngine, owner :", cfg.roles.rewardEngineOwner);
        console2.log("  - RewardEngine wired to:");
        console2.log("      * IVoidTokenLike(VoidToken)");
        console2.log("      * IValidatorSetLike(ValidatorSet)");
        console2.log("      * Emissions controller budget (via RewardEngine/Emissions wiring).");

        console2.log("Step 4: Register validator0 as the genesis validator.");
        console2.log("  - validator0.reward address   :", cfg.validator0.reward);
        console2.log("  - validator0.consensusKey     :");
        console2.logBytes32(cfg.validator0.consensusKey);
        console2.log("  - validator0.stakeVOID (raw)  :", cfg.validator0.stakeVOID);
        console2.log("  - Plan: call into ValidatorSet with validator0 data and lock its stake.");

        console2.log("Step 5: Wire ownership and permissions.");
        console2.log("  - Transfer ownership of VoidTreasury to treasuryOwner      :", cfg.roles.treasuryOwner);
        console2.log("  - Transfer ownership of OpsTreasury to opsTreasuryOwner    :", cfg.roles.opsTreasuryOwner);
        console2.log("  - Ensure AdminGate/ConfigGate/ValidatorSet/RewardEngine/Treasury");
        console2.log("    all have their owners/admins aligned with the roles in this config.");

        console2.log("Step 6: Update plan file with deployed contract addresses.");
        console2.log("  - After a real broadcast, write:");
        console2.log("      contracts.updateGate");
        console2.log("      contracts.adminGate");
        console2.log("      contracts.configGate");
        console2.log("      contracts.validatorSet");
        console2.log("      contracts.voidToken");
        console2.log("      contracts.voidTreasury");
        console2.log("      contracts.opsTreasury");
        console2.log("      contracts.rewardEngine");
        console2.log("      contracts.premineVault");
        console2.log("      contracts.treasury");
        console2.log("  - Plan: keep this JSON as the public wiring manifest (no secrets).");
    }

    function _checkCoreInvariants(ConfigView memory cfg) internal view {
        if (cfg.chainId == 0) {
            revert("VoidMainnetBootstrapMainnet: cfg.chainId is zero");
        }

        if (cfg.chainId != block.chainid) {
            console2.log("FATAL: chainId mismatch.");
            console2.log("  runtime chainId =", block.chainid);
            console2.log("  config  chainId =", cfg.chainId);
            revert("VoidMainnetBootstrapMainnet: chainId mismatch");
        }

        // Roles: all MUST be non-zero.
        address[11] memory addrs = [
            cfg.roles.deployer,
            cfg.roles.treasuryAdmin,
            cfg.roles.opsTreasuryAdmin,
            cfg.roles.validatorAdmin,
            cfg.roles.adminGateOwner,
            cfg.roles.updateGateOwner,
            cfg.roles.configGateOwner,
            cfg.roles.treasuryOwner,
            cfg.roles.opsTreasuryOwner,
            cfg.roles.rewardEngineOwner,
            cfg.roles.validatorSetOwner
        ];

        for (uint256 i = 0; i < addrs.length; i++) {
            if (addrs[i] == address(0)) {
                revert("VoidMainnetBootstrapMainnet: zero address in roles");
            }
        }

        // validator0.consensusKey must be non-zero.
        if (cfg.validator0.consensusKey == bytes32(0)) {
            revert("VoidMainnetBootstrapMainnet: validator0.consensusKey is zero");
        }

        // validator0.reward may be zero (not yet chosen) -> warn only.
        if (cfg.validator0.reward == address(0)) {
            console2.log("WARN: validator0.reward is zero; choose a reward address before real mainnet bootstrap.");
        }

        // But stake must be non-zero: otherwise no initial validator stake.
        if (cfg.validator0.stakeVOID == 0) {
            revert("VoidMainnetBootstrapMainnet: validator0.stakeVOID is zero");
        }
    }

    /// @notice PLAN-only entrypoint. Reads config, checks invariants, and logs plan.
    ///         No broadcast, no state changes.
    function plan(string memory configPath) public view {
        console2.log("=== [VoidMainnetBootstrapMainnet.plan] BEGIN ===");
        console2.log("  configPath =", configPath);

        ConfigView memory cfg = loadConfigView(configPath);

        console2.log("=== [config] core ===");
        console2.log("  cfg.chainId =", cfg.chainId);

        _checkCoreInvariants(cfg);
        _logRoles(cfg);
        _logContracts(cfg);
        _logValidator0(cfg);
        _logPlanNarrative(cfg);

        console2.log("=== [VoidMainnetBootstrapMainnet.plan] END ===");
    }

    /// @notice Safety-fused run(): for now, this just calls plan() and always reverts.
    ///         This is what all current shells/scripts expect (RUN_STUB_ONLY).
    function run(string memory configPath) external {
        plan(configPath);
        revert("VoidMainnetBootstrapMainnet: RUN_STUB_ONLY");
    }

    /// @dev Skeleton of the real mainnet bootstrap wiring using actual contract
    ///      types and the dev bootstrap pattern. This function is NEVER called
    ///      and does NOT broadcast. It exists purely as a strongly-typed,
    ///      compiler-checked blueprint of what the real mainnet run will do.
    ///
    ///      When we are ready for a true mainnet bootstrap:
    ///        - We will add a new external `runReal(string)` that:
    ///             * loads Secrets from env / LUKS / hardware,
    ///             * calls vm.startBroadcast(secrets.deployerKey),
    ///             * calls this helper,
    ///             * vm.stopBroadcast(),
    ///             * and is gated behind our Prometheus pillars.
    ///        - Until then, this remains dead code.
    function _runPlanRealSkeleton(string memory configPath, Secrets memory /*secrets*/) internal view returns (Deployed memory d) {
        ConfigView memory cfg = loadConfigView(configPath);
        _checkCoreInvariants(cfg);

        console2.log("=== [REAL PLAN] VOID mainnet bootstrap wiring skeleton ===");
        console2.log("  chainId         :", cfg.chainId);
        console2.log("  deployer        :", cfg.roles.deployer);
        console2.log("  treasuryAdmin   :", cfg.roles.treasuryAdmin);
        console2.log("  opsTreasuryAdmin:", cfg.roles.opsTreasuryAdmin);
        console2.log("  validatorAdmin  :", cfg.roles.validatorAdmin);

        console2.log("NOTE: This is a skeleton only. It is NOT called and does NOT");
        console2.log("      broadcast. It documents the real wiring using concrete");
        console2.log("      contract types so we cannot drift from the dev bootstrap.");

        // ---------------------------------------------------------------------
        // Step 1: Deploy VoidToken and treasuries (skeleton)
        // ---------------------------------------------------------------------
        //
        // On real mainnet, the VoidToken premine owner will be a cold-storage
        // address not present in this JSON. Here we simply show the pattern.
        //
        // PSEUDO:
        //
        //   address premineOwner = <cold-storage address>;
        //   d.token = new VoidToken(premineOwner);
        //   uint256 premine = d.token.PREMINE();
        //
        //   d.opsTreasury = new OpsTreasury(
        //       IVoidTokenLike(address(d.token)),
        //       cfg.roles.opsTreasuryAdmin
        //   );
        //
        //   d.voidTreasury = new VoidTreasury(
        //       IVoidTokenLike(address(d.token)),
        //       address(d.opsTreasury),
        //       cfg.roles.treasuryAdmin
        //   );
        //
        //   // Move entire premine into VoidTreasury; premineOwner ends at 0.
        //   bool ok = d.token.transfer(address(d.voidTreasury), premine);
        //   require(ok, "premine transfer failed");
        //
        // In this skeleton we do NOT execute the above; we just log the intent.
        console2.log("Step 1 (skeleton):");
        console2.log("  - new VoidToken(<premineOwner>)");
        console2.log("  - new OpsTreasury(IVoidTokenLike(token), opsTreasuryAdmin)");
        console2.log("  - new VoidTreasury(IVoidTokenLike(token), opsTreasury, treasuryAdmin)");
        console2.log("  - transfer premine -> VoidTreasury, zero premineOwner balance");

        // ---------------------------------------------------------------------
        // Step 2: Deploy AdminGate + ConfigGate (skeleton)
        // ---------------------------------------------------------------------
        //
        // PSEUDO:
        //
        //   AdminGate adminGate = new AdminGate(
        //       VOID_CHAIN_ID,
        //       <masterKey>,        // from LUKS / hardware
        //       address(0)          // UpdateGate to be wired later
        //   );
        //
        //   ConfigGate configGate = new ConfigGate(
        //       VOID_CHAIN_ID,
        //       address(adminGate)
        //   );
        //
        console2.log("Step 2 (skeleton):");
        console2.log("  - new AdminGate(VOID_CHAIN_ID, <masterKey>, address(0))");
        console2.log("  - new ConfigGate(VOID_CHAIN_ID, adminGate)");

        // ---------------------------------------------------------------------
        // Step 3: Deploy ValidatorSet + Emissions + RewardEngine (skeleton)
        // ---------------------------------------------------------------------
        //
        // PSEUDO:
        //
        //   ValidatorSet validatorSet = new ValidatorSet(cfg.roles.validatorAdmin);
        //
        //   VoidEmissionsController emissions =
        //       new VoidEmissionsController(cfg.roles.validatorAdmin /* or emissionsAdmin */);
        //
        //   RewardEngine rewardEngine = new RewardEngine(
        //       IVoidTokenLike(address(token)),
        //       IValidatorSetLike(address(validatorSet)),
        //       cfg.roles.rewardEngineOwner
        //   );
        //
        console2.log("Step 3 (skeleton):");
        console2.log("  - new ValidatorSet(validatorAdmin)");
        console2.log("  - new VoidEmissionsController(<emissionsAdmin>)");
        console2.log("  - new RewardEngine(IVoidTokenLike(token), IValidatorSetLike(validatorSet), rewardEngineOwner)");

        // ---------------------------------------------------------------------
        // Step 4: Register validator0 (skeleton)
        // ---------------------------------------------------------------------
        //
        // PSEUDO:
        //
        //   // Move stake from VoidTreasury into the staking flow.
        //   // Exact calls depend on final Treasury/RewardEngine API.
        //   // Then:
        //   // validatorSet.registerGenesisValidator(
        //   //     cfg.validator0.reward,
        //   //     cfg.validator0.consensusKey,
        //   //     cfg.validator0.stakeVOID
        //   // );
        //
        console2.log("Step 4 (skeleton):");
        console2.log("  - move stake from VoidTreasury into validator0");
        console2.log("  - validatorSet.registerGenesisValidator(reward, consensusKey, stakeVOID)");

        // ---------------------------------------------------------------------
        // Step 5: Ownership and permissions (skeleton)
        // ---------------------------------------------------------------------
        //
        // PSEUDO:
        //
        //   voidTreasury.transferOwnership(cfg.roles.treasuryOwner);
        //   opsTreasury.transferOwnership(cfg.roles.opsTreasuryOwner);
        //   rewardEngine.transferOwnership(cfg.roles.rewardEngineOwner);
        //   validatorSet.transferOwnership(cfg.roles.validatorSetOwner);
        //   adminGate.transferOwnership(cfg.roles.adminGateOwner);
        //   // updateGate/configGate wiring and ownership as needed.
        //
        console2.log("Step 5 (skeleton):");
        console2.log("  - transferOwnership(VoidTreasury -> treasuryOwner)");
        console2.log("  - transferOwnership(OpsTreasury  -> opsTreasuryOwner)");
        console2.log("  - transferOwnership(RewardEngine -> rewardEngineOwner)");
        console2.log("  - transferOwnership(ValidatorSet -> validatorSetOwner)");
        console2.log("  - transferOwnership(AdminGate   -> adminGateOwner)");
        console2.log("  - wire UpdateGate/ConfigGate as per final design");

        // ---------------------------------------------------------------------
        // Step 6: Update plan JSON with deployed addresses (off-chain)
        // ---------------------------------------------------------------------
        console2.log("Step 6 (skeleton):");
        console2.log("  - update config JSON .contracts.* with deployed addresses");
        console2.log("  - re-run PLAN + Prometheus hammers to confirm wiring");

        // No actual state changes in this skeleton.
        return d;
    }
}
