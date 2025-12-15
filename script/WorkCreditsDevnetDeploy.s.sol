// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {WorkCreditsToken} from "../contracts/workcredits/WorkCreditsToken.sol";
import {WorkCreditsPoolV1} from "../contracts/workcredits/WorkCreditsPoolV1.sol";
import {WorkCreditsRelayerV1} from "../contracts/workcredits/WorkCreditsRelayerV1.sol";

/// @dev Devnet deploy script for Work Credits stack (token + pool + relayer).
/// Uses a devnet deployer key from DEVNET_DEPLOYER_KEY, and the devnet
/// VoidToken address wired in DEVNET_VOID_TOKEN below.
contract WorkCreditsDevnetDeploy is Script {
    // TODO: replace this placeholder with the actual Devnet VoidToken address
    // printed by DevnetVoidTokenDeploy ("Devnet VoidToken: 0x...").
    address constant DEVNET_VOID_TOKEN = 0xF49183759D2C6510b131F0D2Ba584fff624fb8ec;

    function run() external {
        uint256 deployerKey = vm.envUint("DEVNET_DEPLOYER_KEY");
        require(deployerKey != 0, "DEVNET_DEPLOYER_KEY not set");

        address deployer = vm.addr(deployerKey);
        require(DEVNET_VOID_TOKEN != address(0), "DEVNET_VOID_TOKEN not set");

        console2.log("devnet deployer:", deployer);
        address devVoidToken = vm.envAddress("DEVNET_VOID_TOKEN");
        console2.log("devnet VoidToken:", devVoidToken);

        vm.startBroadcast(deployerKey);

        // 1) Deploy WorkCreditsToken, controlled by the deployer on devnet.
        WorkCreditsToken wc = new WorkCreditsToken(deployer);
        console2.log("WorkCreditsToken:", address(wc));

        // 2) Deploy pool bound to devnet VoidToken + WorkCreditsToken.
        WorkCreditsPoolV1 pool = new WorkCreditsPoolV1(
            devVoidToken,
            address(wc),
            deployer
        );
        console2.log("WorkCreditsPoolV1:", address(pool));

        // 3) Deploy relayer bound to the pool + tokens.
        WorkCreditsRelayerV1 relayer = new WorkCreditsRelayerV1(
            address(pool),
            devVoidToken,
            address(wc)
        );
        console2.log("WorkCreditsRelayerV1:", address(relayer));

        vm.stopBroadcast();
    }
}
