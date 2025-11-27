// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

/// @notice Stub mainnet bootstrap script.
/// In later passes this will:
///  - Deploy VoidToken / VoidTreasury / OpsTreasury / ValidatorSet / RewardEngine
///  - Wire admins and emissions budget to match the locked specs.
/// For now it is a no-op that proves the wiring compiles.
contract VoidMainnetBootstrap is Script {
    function run() external {
        console2.log("VoidMainnetBootstrap: stub run() – no deployments yet");
    }
}
