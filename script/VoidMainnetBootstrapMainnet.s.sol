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
///   2. In "PLAN-only" mode:
///        - Load + log the config.
///        - Validate invariants (non-zero addresses, sane stake amounts, etc.).
///        - NEVER broadcast or mutate on-chain state.
///   3. In "LIVE broadcast" mode (future work):
///        - Perform the actual mainnet deployment & wiring using the config.
///        - Enforce strict safety gates to prevent accidental misuse.
///
/// In this version, ONLY the PLAN path is effectively usable:
///   - `plan(configPath)`:
///        - Loads the config.
///        - Checks `block.chainid` matches `cfg.chainId`.
///        - Logs roles, contracts, validator0.
///        - No broadcast, no deployments.
///   - `run(configPath)`:
///        - Reuses the PLAN path for validation/logging.
///        - ALWAYS reverts as a stub safety fuse.
///        - No deployments, no state changes.
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
        cfg.contracts.premineVault = vm.parseJsonAddress(json, ".contracts.premineVault");
        cfg.contracts.treasury = vm.parseJsonAddress(json, ".contracts.treasury");
        cfg.contracts.voidTreasury = vm.parseJsonAddress(json, ".contracts.voidTreasury");
        cfg.contracts.opsTreasury = vm.parseJsonAddress(json, ".contracts.opsTreasury");
        cfg.contracts.rewardEngine = vm.parseJsonAddress(json, ".contracts.rewardEngine");

        // Validator0
        // NOTE: For reward we allow "MISSING" sentinel in the JSON for now,
        // so scripts that read the file should be robust to that.
        // Here, we treat "0x0000..." as "missing" and just log it.
        // consensusKey is parsed as bytes32 from hex.
        // stakeVOID is the raw token amount (not scaled here).
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

    /// @dev Log roles in a compact way.
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

    /// @dev Log contract addresses in a compact way.
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

    /// @dev Log validator0 info.
    function _logValidator0(ConfigView memory cfg) internal view {
        console2.log("=== [validator0] ===");
        console2.log("  reward       :", cfg.validator0.reward);
        console2.logBytes32(cfg.validator0.consensusKey);
        console2.log("  stakeVOID    :", cfg.validator0.stakeVOID);
    }

    /// @notice PLAN-only entry point.
    /// This function:
    ///   - Loads and validates the LIVE config against the runtime chainId.
    ///   - Logs the roles, contracts, and validator0 data.
    ///   - NEVER broadcasts or mutates state.
    /// It is intended to be called via `forge script` in read-only "PLAN" mode
    /// against either an anvil-2050 rehearsal or a real mainnet RPC.
    function plan(string memory configPath) public {
        // 1) Load config view.
        ConfigView memory cfg = loadConfigView(configPath);

        // 2) Sanity-check chainId vs runtime.
        uint256 runtimeChainId = block.chainid;
        if (runtimeChainId != cfg.chainId) {
            console2.log("FATAL: chainId mismatch (runtime vs config) [PLAN]");
            console2.log("  runtime chainId :", runtimeChainId);
            console2.log("  config  chainId :", cfg.chainId);
            revert("VoidMainnetBootstrapMainnet: chainId mismatch (PLAN)");
        }

        // 3) Validate critical invariants for PLAN.
        {
            bool anyZero =
                cfg.roles.deployer == address(0) ||
                cfg.roles.treasuryAdmin == address(0) ||
                cfg.roles.opsTreasuryAdmin == address(0) ||
                cfg.roles.validatorAdmin == address(0) ||
                cfg.roles.adminGateOwner == address(0) ||
                cfg.roles.updateGateOwner == address(0) ||
                cfg.roles.configGateOwner == address(0) ||
                cfg.roles.treasuryOwner == address(0) ||
                cfg.roles.opsTreasuryOwner == address(0) ||
                cfg.roles.rewardEngineOwner == address(0) ||
                cfg.roles.validatorSetOwner == address(0);

            if (anyZero) {
                revert("VoidMainnetBootstrapMainnet: zero address in critical roles (PLAN)");
            }

            if (cfg.validator0.stakeVOID == 0) {
                revert("VoidMainnetBootstrapMainnet: validator0 stakeVOID must be > 0 (PLAN)");
            }

            bool contractsPrefilled =
                cfg.contracts.updateGate != address(0) ||
                cfg.contracts.adminGate != address(0) ||
                cfg.contracts.configGate != address(0) ||
                cfg.contracts.validatorSet != address(0) ||
                cfg.contracts.voidToken != address(0) ||
                cfg.contracts.premineVault != address(0) ||
                cfg.contracts.treasury != address(0) ||
                cfg.contracts.voidTreasury != address(0) ||
                cfg.contracts.opsTreasury != address(0) ||
                cfg.contracts.rewardEngine != address(0);

            if (contractsPrefilled) {
                revert("VoidMainnetBootstrapMainnet: contracts.* must be zeroed pre-broadcast (PLAN)");
            }
        }

        // 4) Log a basic summary so we can see what the config looks like.
        console2.log("=== [VOID mainnet bootstrap mainnet PLAN] ===");
        console2.log("  runtime chainId :", block.chainid);
        console2.log("  config  chainId :", cfg.chainId);
        console2.log("  chainId sanity OK; parsed config view (PLAN).");

        _logRoles(cfg);
        _logContracts(cfg);
        _logValidator0(cfg);

        console2.log("  PLAN mode: no broadcasts, no state changes, no deployments.");
    }

    /// @notice LIVE/broadcast entry point (currently STUB ONLY).
    /// This function:
    ///   - Reuses the PLAN path for loading + logging.
    ///   - Then *always* reverts as a safety fuse until real wiring is implemented.
    /// When we are ready for a real Mainnet broadcast, this will be replaced
    /// with the actual deployment/wiring logic, and PLAN will remain read-only.
    function run(string memory configPath) external {
        // Reuse PLAN path for config load + logging + chainId sanity.
        plan(configPath);

        // SAFETY FUSE:
        //   - This script MUST NOT silently succeed in its current form.
        //   - We enforce that by always reverting with a clear stub-only message.
        //   - When we are ready to do a real Mainnet broadcast, we will:
        //       * Move the "real wiring" into a clearly separated path, and
        //       * Keep a DRY-RUN / PLAN-only mode that never mutates state.
        console2.log("  STUB ONLY: no deployments performed; run() always reverts until mainnet wiring is implemented.");
        revert("VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast");
    }
}
