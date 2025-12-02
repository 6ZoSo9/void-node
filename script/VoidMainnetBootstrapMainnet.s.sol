// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

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
contract VoidMainnetBootstrapMainnet is Script {
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

    struct Secrets {
        uint256 deployerKey;
        // Future extension:
        //   uint256 validatorAdminKey;
        //   uint256 treasuryAdminKey;
        //   uint256 opsTreasuryAdminKey;
        //   uint256 rewardEngineOwnerKey;
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
        console2.log("      * Emissions controller for budget.");

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
            console2.log("WARN: validator0.reward is zero-address (not yet chosen?)");
        }

        // validator0.stakeVOID: warn if zero.
        if (cfg.validator0.stakeVOID == 0) {
            console2.log("WARN: validator0.stakeVOID is zero (no stake configured?)");
        }
    }

    function _areContractsAllZero(Contracts memory c) internal pure returns (bool) {
        return
            c.updateGate == address(0) &&
            c.adminGate == address(0) &&
            c.configGate == address(0) &&
            c.validatorSet == address(0) &&
            c.voidToken == address(0) &&
            c.premineVault == address(0) &&
            c.treasury == address(0) &&
            c.voidTreasury == address(0) &&
            c.opsTreasury == address(0) &&
            c.rewardEngine == address(0);
    }

    function _hasAnyContractNonZero(Contracts memory c) internal pure returns (bool) {
        return
            c.updateGate != address(0) ||
            c.adminGate != address(0) ||
            c.configGate != address(0) ||
            c.validatorSet != address(0) ||
            c.voidToken != address(0) ||
            c.premineVault != address(0) ||
            c.treasury != address(0) ||
            c.voidTreasury != address(0) ||
            c.opsTreasury != address(0) ||
            c.rewardEngine != address(0);
    }

    /// @notice PLAN-only entrypoint (no broadcast).
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

        bool allZero = _areContractsAllZero(cfg.contracts);
        bool anyNonZero = _hasAnyContractNonZero(cfg.contracts);

        console2.log("=== [plan-status] ===");
        if (allZero) {
            console2.log("  status      : NOT_READY");
            console2.log("  reason      : all critical contracts are 0x0000... (pre-deploy state)");
            console2.log("  expectation : this is correct before any mainnet bootstrap broadcast.");
        } else if (anyNonZero) {
            console2.log("  status      : READY_OR_LIVE");
            console2.log("  reason      : at least one critical contract address is non-zero.");
            console2.log("  expectation : this config should reflect a rehearsed or live wiring.");
        } else {
            console2.log("  status      : UNKNOWN");
            console2.log("  reason      : contracts state is inconsistent (this should not happen).");
        }

        console2.log("=== [VoidMainnetBootstrapMainnet.plan] END ===");
    }

    /// @notice Stub run() entrypoint: calls plan() then always reverts.
    function run(string memory configPath) external {
        plan(configPath);
        revert("VoidMainnetBootstrapMainnet: RUN_STUB_ONLY");
    }
}
