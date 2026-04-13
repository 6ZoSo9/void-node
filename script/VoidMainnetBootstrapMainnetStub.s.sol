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

    function _emitPlan(string memory configPath) internal view {
        console2.log("=== [VOID mainnet bootstrap PLAN (stub)] ===");
        console2.log("configPath:");
        console2.log(configPath);
        console2.log("chainId expected:");
        console2.logUint(block.chainid);
        console2.log("note:");
        console2.log("This is a maintained stub-only bootstrap script.");
        console2.log("It intentionally avoids project-contract imports.");
        console2.log("Use it to prove plan/artifact wiring while live bootstrap source is rebuilt.");
        console2.log("marker:");
        console2.log(RUN_STUB_ONLY);
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
