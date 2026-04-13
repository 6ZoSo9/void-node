// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

/// @dev Compile-green maintained stub for Mainnet bootstrap PLAN lane.
///      This script is intentionally minimal and does NOT import project contracts.
///      It exists to provide a stable stub-only target for plan/artifact tooling
///      until the real compile-green mainnet bootstrap source is rebuilt.
contract VoidMainnetBootstrapMainnetStub is Script {
    string internal constant RUN_STUB_ONLY = "RUN_STUB_ONLY";
    string internal constant PLAN_VERSION = "void-mainnet-plan-stub-v2";

    function _emitLine(string memory k, string memory v) internal pure {
        console2.log(k);
        console2.log(v);
    }

    function _emitLineUint(string memory k, uint256 v) internal pure {
        console2.log(k);
        console2.logUint(v);
    }

    function _emitPlan(string memory configPath) internal view {
        console2.log("=== [VOID mainnet bootstrap PLAN (stub)] ===");

        _emitLine("PLAN_KIND", "mainnet_bootstrap_plan");
        _emitLine("PLAN_MODE", "stub_only");
        _emitLine("PLAN_VERSION", PLAN_VERSION);
        _emitLine("CONFIG_PATH", configPath);
        _emitLineUint("CHAIN_ID_EXPECTED", block.chainid);

        _emitLine("SECTION", "deploy_order");
        _emitLine("DEPLOY_01", "UpdateGate");
        _emitLine("DEPLOY_02", "AdminGate");
        _emitLine("DEPLOY_03", "ConfigGate");
        _emitLine("DEPLOY_04", "ValidatorSet");
        _emitLine("DEPLOY_05", "VoidToken");
        _emitLine("DEPLOY_06", "VoidTreasury");
        _emitLine("DEPLOY_07", "OpsTreasury");
        _emitLine("DEPLOY_08", "RewardEngine");

        _emitLine("SECTION", "locked_invariants");
        _emitLine("INVARIANT_01", "plan_only_no_broadcast");
        _emitLine("INVARIANT_02", "permissionless_user_contract_deploy_and_calls_preserved");
        _emitLine("INVARIANT_03", "master_key_gates_only_for_locked_admin_surfaces");
        _emitLine("INVARIANT_04", "treasury_and_tokenomics_must_match_live_json_plan");
        _emitLine("INVARIANT_05", "validator_and_gate_wiring_must_be_explicit_before_live_run");

        _emitLine("SECTION", "status");
        _emitLine("NOTE", "maintained stub-only bootstrap script");
        _emitLine("NOTE", "intentionally avoids project-contract imports");
        _emitLine("NOTE", "proves plan/artifact wiring while live bootstrap source is rebuilt");
        _emitLine("MARKER", RUN_STUB_ONLY);
    }

    function plan(string calldata configPath) external view {
        _emitPlan(configPath);
    }

    function run(string calldata configPath) external view {
        _emitPlan(configPath);
        revert(RUN_STUB_ONLY);
    }

    function run() external view {
        _emitPlan("ops/mainnet/void-mainnet.live.json");
        revert(RUN_STUB_ONLY);
    }
}
