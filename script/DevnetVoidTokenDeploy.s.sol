// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {VoidToken} from "../contracts/VoidToken.sol";

/// @dev Devnet helper script: deploys a VoidToken on chain 2050 and
///      premine-mints the full supply to DEVNET_VOID_PREMINE_RECIPIENT.
///      Uses DEVNET_DEPLOYER_KEY as the broadcast key.
contract DevnetVoidTokenDeploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEVNET_DEPLOYER_KEY");
        require(deployerKey != 0, "DEVNET_DEPLOYER_KEY not set");

        address premineRecipient = vm.envAddress("DEVNET_VOID_PREMINE_RECIPIENT");
        require(premineRecipient != address(0), "DEVNET_VOID_PREMINE_RECIPIENT not set");

        address deployer = vm.addr(deployerKey);
        console2.log("devnet deployer:", deployer);
        console2.log("premine recipient:", premineRecipient);

        vm.startBroadcast(deployerKey);

        // Deploy the main VoidToken contract with full premine to the recipient.
        VoidToken token = new VoidToken(premineRecipient);
        console2.log("Devnet VoidToken:", address(token));

        vm.stopBroadcast();
    }
}
