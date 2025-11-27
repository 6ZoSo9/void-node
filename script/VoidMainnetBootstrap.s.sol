// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

/// @notice Stub bootstrap script for VOID mainnet.
///         For now it only logs a message; real deployment wiring will be added later.
contract VoidMainnetBootstrap is Script {
    function run() external {
        // NOTE: keep this string pure ASCII to avoid Solidity unicode literal issues.
        console2.log("VoidMainnetBootstrap: stub run() - no deployments yet");
    }
}
