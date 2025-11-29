// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "forge-std/Script.sol";

/// @notice Read-only PLAN viewer for VOID mainnet bootstrap.
///         Reads the *.live.json, prints roles/contracts/validator0 and a structural READY/NOT READY flag.
///         No broadcast, no state changes.
contract VoidMainnetBootstrapPlanView is Script {
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
        string stakeVOID; // string/TODO, same as JSON
    }

    function run(string memory configPath) external {
        string memory json = vm.readFile(configPath);

        uint256 chainIdCfg = vm.parseJsonUint(json, ".chainId");
        uint256 chainIdRuntime = block.chainid;

        Roles memory r = _parseRoles(json);
        Contracts memory c = _parseContracts(json);
        Validator0 memory v0 = _parseValidator0(json);

        console.log("=== [VOID mainnet PLAN view] ===");
        console.log("  configPath       :", configPath);
        console.log("  chainId (config) :", chainIdCfg);
        console.log("  chainId (runtime):", chainIdRuntime);

        if (chainIdCfg == 2050 && chainIdRuntime == 2050) {
            console.log("  chainId sanity   : OK (2050/2050)");
        } else if (chainIdCfg == 2050) {
            console.log("  chainId sanity   : MISMATCH (config 2050, runtime != 2050)");
        } else {
            console.log("  chainId sanity   : BAD (config != 2050)");
        }

        console.log("");
        console.log("=== roles ===");
        _printRoles(r);

        console.log("");
        console.log("=== contracts ===");
        _printContracts(c);

        console.log("");
        console.log("=== validator0 ===");
        _printValidator0(v0);

        (bool cfgOk, bool structOk) = _computeHealth(chainIdCfg, r, c, v0);

        console.log("");
        console.log("=== structural health ===");
        console.log("  CONFIG_OK :", cfgOk ? 1 : 0);
        console.log("  HEALTH_OK :", structOk ? 1 : 0);

        if (!cfgOk) {
            console.log("  RESULT: NOT CONFIGURED (config JSON/shape/chainId not sane).");
        } else if (!structOk) {
            console.log("  RESULT: CONFIGURED BUT NOT READY (critical roles/contracts/validator0 missing).");
        } else {
            console.log("  RESULT: PLAN READY (subject to keys/ops checks before broadcast).");
        }

        console.log("");
        console.log("NOTE: This script is READ-ONLY (no broadcast, no deployments).");
    }

    // ---------- internals ----------

    function _parseRoles(string memory json) internal pure returns (Roles memory r) {
        r.deployer          = vm.parseJsonAddress(json, ".roles.deployer");
        r.treasuryAdmin     = vm.parseJsonAddress(json, ".roles.treasuryAdmin");
        r.opsTreasuryAdmin  = vm.parseJsonAddress(json, ".roles.opsTreasuryAdmin");
        r.validatorAdmin    = vm.parseJsonAddress(json, ".roles.validatorAdmin");
        r.adminGateOwner    = vm.parseJsonAddress(json, ".roles.adminGateOwner");
        r.updateGateOwner   = vm.parseJsonAddress(json, ".roles.updateGateOwner");
        r.configGateOwner   = vm.parseJsonAddress(json, ".roles.configGateOwner");
        r.treasuryOwner     = vm.parseJsonAddress(json, ".roles.treasuryOwner");
        r.opsTreasuryOwner  = vm.parseJsonAddress(json, ".roles.opsTreasuryOwner");
        r.rewardEngineOwner = vm.parseJsonAddress(json, ".roles.rewardEngineOwner");
        r.validatorSetOwner = vm.parseJsonAddress(json, ".roles.validatorSetOwner");
    }

    function _parseContracts(string memory json) internal pure returns (Contracts memory c) {
        c.updateGate    = vm.parseJsonAddress(json, ".contracts.updateGate");
        c.adminGate     = vm.parseJsonAddress(json, ".contracts.adminGate");
        c.configGate    = vm.parseJsonAddress(json, ".contracts.configGate");
        c.validatorSet  = vm.parseJsonAddress(json, ".contracts.validatorSet");
        c.voidToken     = vm.parseJsonAddress(json, ".contracts.voidToken");

        // NOTE: premineVault / treasury are currently null in the *.live.json template.
        // vm.parseJsonAddress cannot handle null, so while they are unset we treat them as address(0).
        // Once the JSON is upgraded to real addresses, we can switch these to parseJsonAddress.
        c.premineVault  = address(0);
        c.treasury      = address(0);

        c.voidTreasury  = vm.parseJsonAddress(json, ".contracts.voidTreasury");
        c.opsTreasury   = vm.parseJsonAddress(json, ".contracts.opsTreasury");
        c.rewardEngine  = vm.parseJsonAddress(json, ".contracts.rewardEngine");
    }

    function _parseValidator0(string memory json) internal pure returns (Validator0 memory v0) {
        v0.reward       = vm.parseJsonAddress(json, ".validator0.reward");
        v0.consensusKey = vm.parseJsonBytes32(json, ".validator0.consensusKey");
        v0.stakeVOID    = vm.parseJsonString(json, ".validator0.stakeVOID");
    }

    function _printRoles(Roles memory r) internal pure {
        console.log("  deployer          :", r.deployer);
        console.log("  treasuryAdmin     :", r.treasuryAdmin);
        console.log("  opsTreasuryAdmin  :", r.opsTreasuryAdmin);
        console.log("  validatorAdmin    :", r.validatorAdmin);
        console.log("  adminGateOwner    :", r.adminGateOwner);
        console.log("  updateGateOwner   :", r.updateGateOwner);
        console.log("  configGateOwner   :", r.configGateOwner);
        console.log("  treasuryOwner     :", r.treasuryOwner);
        console.log("  opsTreasuryOwner  :", r.opsTreasuryOwner);
        console.log("  rewardEngineOwner :", r.rewardEngineOwner);
        console.log("  validatorSetOwner :", r.validatorSetOwner);
    }

    function _printContracts(Contracts memory c) internal pure {
        console.log("  updateGate        :", c.updateGate);
        console.log("  adminGate         :", c.adminGate);
        console.log("  configGate        :", c.configGate);
        console.log("  validatorSet      :", c.validatorSet);
        console.log("  voidToken         :", c.voidToken);
        console.log("  premineVault      :", c.premineVault);
        console.log("  treasury          :", c.treasury);
        console.log("  voidTreasury      :", c.voidTreasury);
        console.log("  opsTreasury       :", c.opsTreasury);
        console.log("  rewardEngine      :", c.rewardEngine);
    }

    function _printValidator0(Validator0 memory v0) internal pure {
        console.log("  reward            :", v0.reward);
        console.log("  consensusKey      :");
        console.logBytes32(v0.consensusKey);
        console.log("  stakeVOID (raw)   :", v0.stakeVOID);
    }

    function _isUnsetAddr(address a) internal pure returns (bool) {
        return a == address(0);
    }

    function _isUnsetBytes32(bytes32 b) internal pure returns (bool) {
        return b == bytes32(0);
    }

    function _computeHealth(
        uint256 chainIdCfg,
        Roles memory r,
        Contracts memory c,
        Validator0 memory v0
    ) internal pure returns (bool cfgOk, bool structOk) {
        cfgOk = (chainIdCfg == 2050);

        bool rolesBad = (
            _isUnsetAddr(r.deployer) ||
            _isUnsetAddr(r.treasuryAdmin) ||
            _isUnsetAddr(r.opsTreasuryAdmin) ||
            _isUnsetAddr(r.validatorAdmin)
        );

        bool contractsBad = (
            _isUnsetAddr(c.voidToken)   ||
            _isUnsetAddr(c.premineVault)||
            _isUnsetAddr(c.treasury)    ||
            _isUnsetAddr(c.opsTreasury) ||
            _isUnsetAddr(c.rewardEngine)
        );

        bool valBad = (
            _isUnsetAddr(v0.reward) ||
            _isUnsetBytes32(v0.consensusKey) ||
            _isStakeTodo(v0.stakeVOID)
        );

        structOk = !(rolesBad || contractsBad || valBad);
    }

    function _isStakeTodo(string memory s) internal pure returns (bool) {
        bytes memory b = bytes(s);
        bytes memory todo = bytes("TODO_SET_STAKE_VOID");
        if (b.length != todo.length) {
            return false;
        }
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] != todo[i]) {
                return false;
            }
        }
        return true;
    }
}
