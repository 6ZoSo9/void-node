// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Script.sol";

/// @notice Dev-only rehearsal script for VOID mainnet bootstrap.
///         This is a stub: it compiles but performs no deployments yet.
///         Real logic will:
///           - Read config/void-mainnet-bootstrap.json
///           - Deploy VoidToken, VoidTreasury, OpsTreasury
///           - Wire AdminGate / UpdateGate / ConfigGate / ValidatorSet / RewardEngine
///           - Mint premine into Treasury and set up emissions.
///         We keep the pragma broad so it stays compatible with the
///         single solc version configured in foundry.toml.
contract VoidMainnetBootstrapDev is Script {
    function run() external view {
        // STUB ONLY:
        // We intentionally do nothing here for now.
        //
        // Future plan (high-level):
        //   1. string memory json = vm.readFile("config/void-mainnet-bootstrap.json");
        //   2. Parse tokenomics + addresses via vm.parseJson.
        //   3. vm.startBroadcast(<DEV_BOOTSTRAP_KEY>);
        //   4. Deploy VoidToken, Treasury, RewardEngine, gates, ValidatorSet.
        //   5. Mint premine to Treasury; wire OpsTreasury + reward flows.
        //   6. vm.stopBroadcast();
        //
        // Nothing is executed in this stub.
    }
}
