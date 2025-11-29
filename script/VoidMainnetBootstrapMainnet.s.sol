// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

/// @notice VOID mainnet bootstrap (Mainnet) script.
///
/// This script is the "real network" sibling of the dev bootstrap script:
///   - script/VoidMainnetBootstrapDev.s.sol
///
/// High-level responsibilities (when fully implemented):
///   1. Read a JSON config (the *.live.json plan file) containing:
///        - Roles: deployer, treasuryAdmin, opsTreasuryAdmin, validatorAdmin, etc.
///        - Contract addresses: AdminGate, UpdateGate, ConfigGate, ValidatorSet,
///          VoidToken, VoidTreasury, OpsTreasury, RewardEngine, etc.
///        - Validator0 data: reward address, consensus key, stake amount.
///   2. Sanity-check the config against the runtime chain (chainId == 2050, etc.).
///   3. For a **real broadcast run**, wire the on-chain state as per the plan:
///        - Ensure gates are wired to the correct owners and signers.
///        - Ensure premine vault / treasury / ops treasury layout matches the
///          locked tokenomics (MAX_SUPPLY / PREMINE / EMISSIONS).
///        - Register validator0 and ensure RewardEngine is configured to pay it.
///   4. For now, this Mainnet script remains a **STUB**:
///        - It **only** parses and logs the config view, then REVERTS.
///        - No broadcast, no mutations, no deployments.
///
/// The dev bootstrap script is where we iterate and rehearse the wiring:
///   - It runs against a local anvil chain (chainId 2050) and does real deployments.
///   - It validates the end-to-end flows and invariants.
///   - Once we're confident, we will translate that wiring logic into this script,
///     but keep a very hard separation between:
///       - "PLAN-only" / "DRY-RUN" flows, and
///       - "LIVE broadcast" flows.
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
        address voidTreasury;
        address opsTreasury;
        address rewardEngine;
    }

    struct Validator0 {
        address reward;
        bytes32 consensusKey;

        // NOTE: In the Mainnet template, stakeVOID is currently a string
        // placeholder "TODO_SET_STAKE_VOID". We'll wire the numeric stake
        // once the final ValidatorSet/tokenomics integration is locked and
        // we have an explicit stake number for validator0.
        string stakeVOID;
    }

    struct ConfigView {
        uint256 chainId;
        Roles roles;
        Contracts contracts;
        Validator0 validator0;
    }

    /// @dev Load the config into a lightweight in-memory view.
    ///
    /// This is intentionally a "read-only" parsing pass:
    ///   - NO broadcasts
    ///   - NO state mutations
    ///   - Only logs and struct population
    function loadConfigView(string memory configPath) internal view returns (ConfigView memory cfg) {
        // Read the raw JSON file via vm.
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
        cfg.contracts.voidTreasury = vm.parseJsonAddress(json, ".contracts.voidTreasury");
        cfg.contracts.opsTreasury = vm.parseJsonAddress(json, ".contracts.opsTreasury");
        cfg.contracts.rewardEngine = vm.parseJsonAddress(json, ".contracts.rewardEngine");

        // Validator0
        cfg.validator0.reward = vm.parseJsonAddress(json, ".validator0.reward");
        cfg.validator0.consensusKey = vm.parseJsonBytes32(json, ".validator0.consensusKey");

        // stakeVOID is a string in the template; keep it as such for now.
        cfg.validator0.stakeVOID = vm.parseJsonString(json, ".validator0.stakeVOID");

        return cfg;
    }

    /// @dev Log the parsed role addresses from the config view.
    function _logRoles(ConfigView memory cfg) internal view {
        console2.log("=== roles ===");
        console2.log("  deployer           :", cfg.roles.deployer);
        console2.log("  treasuryAdmin      :", cfg.roles.treasuryAdmin);
        console2.log("  opsTreasuryAdmin   :", cfg.roles.opsTreasuryAdmin);
        console2.log("  validatorAdmin     :", cfg.roles.validatorAdmin);
        console2.log("  adminGateOwner     :", cfg.roles.adminGateOwner);
        console2.log("  updateGateOwner    :", cfg.roles.updateGateOwner);
        console2.log("  configGateOwner    :", cfg.roles.configGateOwner);
        console2.log("  treasuryOwner      :", cfg.roles.treasuryOwner);
        console2.log("  opsTreasuryOwner   :", cfg.roles.opsTreasuryOwner);
        console2.log("  rewardEngineOwner  :", cfg.roles.rewardEngineOwner);
        console2.log("  validatorSetOwner  :", cfg.roles.validatorSetOwner);
    }

    /// @dev Log the parsed contract addresses from the config view.
    function _logContracts(ConfigView memory cfg) internal view {
        console2.log("=== contracts ===");
        console2.log("  updateGate         :", cfg.contracts.updateGate);
        console2.log("  adminGate          :", cfg.contracts.adminGate);
        console2.log("  configGate         :", cfg.contracts.configGate);
        console2.log("  validatorSet       :", cfg.contracts.validatorSet);
        console2.log("  voidToken          :", cfg.contracts.voidToken);
        console2.log("  voidTreasury       :", cfg.contracts.voidTreasury);
        console2.log("  opsTreasury        :", cfg.contracts.opsTreasury);
        console2.log("  rewardEngine       :", cfg.contracts.rewardEngine);
    }

    /// @dev Log the parsed validator0 fields from the config view.
    function _logValidator0(ConfigView memory cfg) internal view {
        console2.log("=== validator0 ===");
        console2.log("  reward             :", cfg.validator0.reward);
        console2.logBytes32(cfg.validator0.consensusKey);
        console2.log("  NOTE: validator0.stakeVOID is currently a TODO string in the template; not parsed yet.");
        console2.log("        We'll wire the numeric stake once final tokenomics wiring for ValidatorSet is locked.");
    }

    /// @dev Entry point for the Mainnet bootstrap script.
    ///
    /// CURRENTLY: STUB ONLY
    ///   - Parses and logs the config view.
    ///   - Always REVERTS with a clear stub message.
    ///
    /// LATER:
    ///   - We'll introduce an explicit "mode" (e.g. DRY_RUN vs BROADCAST) and
    ///     wire the real Mainnet bootstrap flow under strict guards.
    function run(string memory configPath) external {
        // 1) Load config view.
        ConfigView memory cfg = loadConfigView(configPath);

        // 2) Sanity-check chainId vs runtime.
        uint256 runtimeChainId = block.chainid;
        if (runtimeChainId != cfg.chainId) {
            console2.log("FATAL: chainId mismatch (runtime vs config)");
            console2.log("  runtime chainId :", runtimeChainId);
            console2.log("  config  chainId :", cfg.chainId);
            revert("VoidMainnetBootstrapMainnet: chainId mismatch");
        }

        // 3) Log a basic summary so we can see what the config looks like.
        console2.log("=== [VOID mainnet bootstrap mainnet stub v2] ===");
        console2.log("  runtime chainId :", block.chainid);
        console2.log("  config  chainId :", cfg.chainId);
        console2.log("  chainId sanity OK; parsed config view.");

        _logRoles(cfg);
        _logContracts(cfg);
        _logValidator0(cfg);

        // SAFETY FUSE:
        //   - This script MUST NOT silently succeed in its current form.
        //   - We enforce that by always reverting with a clear stub-only message.
        //   - When we are ready to do a real Mainnet broadcast, we will:
        //       * Move the "real wiring" into a clearly separated path, and
        //       * Keep a DRY-RUN / PLAN-only mode that never mutates state.
        console2.log("  chainId + config view sanity OK; this is still a STUB (no deployments).");
        revert("VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast");
    }
}
