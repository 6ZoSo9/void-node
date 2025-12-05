// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {WorkCreditsToken} from "../contracts/workcredits/WorkCreditsToken.sol";
import {WorkCreditsPoolV1} from "../contracts/workcredits/WorkCreditsPoolV1.sol";
import {WorkCreditsRelayerV1} from "../contracts/workcredits/WorkCreditsRelayerV1.sol";

/// @dev Devnet deploy script for Work Credits stack (token + pool + relayer).
/// Uses a devnet deployer key from DEVNET_DEPLOYER_KEY, and hardcodes the
/// devnet VoidToken address we already use in other scripts.
contract WorkCreditsDevnetDeploy is Script {
    // Keep this in sync with the VoidToken address on devnet (anvil-2050).
    // This is the same TOKEN address we've been using in dev bootstrap.
    address constant DEVNET_VOID_TOKEN = 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6;

    function run() external {
        // Private key for devnet deployer, as a uint256 (hex or decimal).
        uint256 deployerKey = vm.envUint("DEVNET_DEPLOYER_KEY");
        require(deployerKey != 0, "DEVNET_DEPLOYER_KEY not set");

        address deployer = vm.addr(deployerKey);
        console2.log("devnet deployer:", deployer);
        console2.log("devnet VoidToken:", DEVNET_VOID_TOKEN);

        vm.startBroadcast(deployerKey);

        // 1) Deploy WorkCreditsToken, controlled by the deployer on devnet.
        WorkCreditsToken wc = new WorkCreditsToken(deployer);
        console2.log("WorkCreditsToken:", address(wc));

        // 2) Deploy pool bound to devnet VoidToken + WorkCreditsToken.
        WorkCreditsPoolV1 pool = new WorkCreditsPoolV1(
            DEVNET_VOID_TOKEN,
            address(wc), deployer);
        console2.log("WorkCreditsPoolV1:", address(pool));

        // 3) Deploy relayer bound to the pool + tokens.
        WorkCreditsRelayerV1 relayer = new WorkCreditsRelayerV1(
            address(pool),
            DEVNET_VOID_TOKEN,
            address(wc)
        );
        console2.log("WorkCreditsRelayerV1:", address(relayer));

        vm.stopBroadcast();
    }
}
