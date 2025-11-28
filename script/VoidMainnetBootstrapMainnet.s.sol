// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

/// @notice VOID mainnet bootstrap script (mainnet path).
/// @dev STUB (v2):
///      - Parses the JSON config:
///          - .chainId
///          - .roles.*
///          - .contracts.*
///          - .validator0.reward
///          - .validator0.consensusKey
///      - Enforces chainId == 2050 (both runtime and config)
///      - Logs a summary of the parsed config
///      - Then *always* reverts
///      This lets us exercise the real config shape and forge signature now
///      without any risk of accidentally broadcasting a real mainnet bootstrap.
contract VoidMainnetBootstrapMainnet is Script {
    /// @dev Mirrors the high-level shape of config/void-mainnet-bootstrap-mainnet.template.json
    ///      for the fields we currently care about.
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

    struct Validator0View {
        address reward;
        bytes32 consensusKey;
        // NOTE: stakeVOID is intentionally not parsed yet because the template
        //       currently uses a placeholder string ("TODO_SET_STAKE_VOID").
        //       We'll wire this when we define the final numeric semantics.
    }

    struct ConfigView {
        uint256 chainId;
        Roles roles;
        Contracts contracts;
        Validator0View validator0;
    }

    /// @dev Load a read-only view of the config from JSON.
    ///      This function:
    ///        - reads the JSON file
    ///        - parses scalar fields we care about
    ///        - does *not* perform any state changes
    function _loadConfigView(string memory path) internal view returns (ConfigView memory cfg) {
        string memory json = vm.readFile(path);

        // Top-level chainId
        cfg.chainId = vm.parseJsonUint(json, ".chainId");

        // roles.*
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

        // contracts.*
        cfg.contracts.updateGate = vm.parseJsonAddress(json, ".contracts.updateGate");
        cfg.contracts.adminGate = vm.parseJsonAddress(json, ".contracts.adminGate");
        cfg.contracts.configGate = vm.parseJsonAddress(json, ".contracts.configGate");
        cfg.contracts.validatorSet = vm.parseJsonAddress(json, ".contracts.validatorSet");

        cfg.contracts.voidToken = vm.parseJsonAddress(json, ".contracts.voidToken");
        cfg.contracts.voidTreasury = vm.parseJsonAddress(json, ".contracts.voidTreasury");
        cfg.contracts.opsTreasury = vm.parseJsonAddress(json, ".contracts.opsTreasury");
        cfg.contracts.rewardEngine = vm.parseJsonAddress(json, ".contracts.rewardEngine");

        // validator0.*
        cfg.validator0.reward = vm.parseJsonAddress(json, ".validator0.reward");
        cfg.validator0.consensusKey = vm.parseJsonBytes32(json, ".validator0.consensusKey");
    }

    /// @notice Main entrypoint for forge:
    ///   forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \\
    ///     --sig "run(string)" config/void-mainnet-bootstrap-mainnet.live.json
    ///
    /// @dev This is still intentionally NON-FUNCTIONAL for live mainnet:
    ///      after sanity checks it always reverts.
    function run(string memory configPath) external {
        ConfigView memory cfg = _loadConfigView(configPath);
        uint256 runtimeChainId = block.chainid;

        console2.log("=== [VOID mainnet bootstrap mainnet stub v2] ===");
        console2.log("  runtime chainId :", runtimeChainId);
        console2.log("  config  chainId :", cfg.chainId);

        // Hard gate: this script must *only* ever run on VOID mainnet (chainId 2050).
        require(runtimeChainId == 2050, "VoidMainnetBootstrapMainnet: wrong runtime chainId (expected 2050)");
        require(cfg.chainId == 2050, "VoidMainnetBootstrapMainnet: config.chainId != 2050");
        require(cfg.chainId == runtimeChainId, "VoidMainnetBootstrapMainnet: config/runtime chainId mismatch");

        console2.log("  chainId sanity OK; parsed config view.");

        // Log roles
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

        // Log contracts
        console2.log("=== contracts ===");
        console2.log("  updateGate         :", cfg.contracts.updateGate);
        console2.log("  adminGate          :", cfg.contracts.adminGate);
        console2.log("  configGate         :", cfg.contracts.configGate);
        console2.log("  validatorSet       :", cfg.contracts.validatorSet);

        console2.log("  voidToken          :", cfg.contracts.voidToken);
        console2.log("  voidTreasury       :", cfg.contracts.voidTreasury);
        console2.log("  opsTreasury        :", cfg.contracts.opsTreasury);
        console2.log("  rewardEngine       :", cfg.contracts.rewardEngine);

        // Log validator0 view
        console2.log("=== validator0 ===");
        console2.log("  reward             :", cfg.validator0.reward);
        console2.logBytes32(cfg.validator0.consensusKey);

        console2.log("  NOTE: validator0.stakeVOID is currently a TODO string in the template; not parsed yet.");
        console2.log("        We'll wire the numeric stake once final tokenomics wiring for ValidatorSet is locked.");

        console2.log("  chainId + config view sanity OK; this is still a STUB (no deployments).");

        // SAFETY FUSE:
        //   Do not remove this until we are *actually* ready to implement
        //   the real mainnet bootstrap wiring and have triple-checked the plan.
        revert("VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast");
    }
}
