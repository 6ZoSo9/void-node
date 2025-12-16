// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {VoidToken} from "../contracts/VoidToken.sol";
import {WorkCreditsToken} from "../contracts/workcredits/WorkCreditsToken.sol";
import {VoidWorkCreditsPool} from "../contracts/workcredits/VoidWorkCreditsPool.sol";

/// @notice Devnet bootstrap for WorkCredits (WC/VOID pool) intended to mirror "realistic" seeding.
/// Default seed: 10,000,000 VOID + 10,000,000 WC (18 decimals).
///
/// ENV:
///   DEVNET_DEPLOYER_KEY : uint256 private key with funds on devnet/anvil
///   DEVNET_VOID_TOKEN   : address of devnet VOID token (must exist on this chain)
///
/// Notes:
/// - This script intentionally keeps logic simple to avoid solc/Yul "stack too deep" issues.
/// - If you need different seed sizes, edit the constants below (devnet only).
contract VoidWorkCreditsDevnetBootstrap is Script {
    uint256 internal constant SEED_VOID = 10_000_000e18;
    uint256 internal constant SEED_WC   = 10_000_000e18;

    function run() external {
        uint256 deployerKey = vm.envUint("DEVNET_DEPLOYER_KEY");
        address deployer = vm.addr(deployerKey);
        address devVoidToken = vm.envAddress("DEVNET_VOID_TOKEN");

        vm.startBroadcast(deployerKey);

        WorkCreditsToken wc = new WorkCreditsToken(deployer);

        VoidWorkCreditsPool pool = new VoidWorkCreditsPool(
            devVoidToken,
            address(wc),
            deployer
        );

        _seedPool(deployer, devVoidToken, wc, pool);

        vm.stopBroadcast();

        console2.log("DEVNET_VOID_TOKEN    :", devVoidToken);
        console2.log("WorkCreditsToken     :", address(wc));
        console2.log("VoidWorkCreditsPool  :", address(pool));
        console2.log("Deployer/Controller  :", deployer);

        _writeLiveJson(devVoidToken, address(wc), address(pool), deployer);
    }

    function _seedPool(
        address deployer,
        address devVoidToken,
        WorkCreditsToken wc,
        VoidWorkCreditsPool pool
    ) internal {
        // Mint WC to deployer, approve pool, seed.
        wc.mint(deployer, SEED_WC);

        VoidToken(devVoidToken).approve(address(pool), SEED_VOID);
        wc.approve(address(pool), SEED_WC);

        pool.seed(SEED_VOID, SEED_WC);
    }

    function _writeLiveJson(
        address devVoidToken,
        address wc,
        address pool,
        address deployer
    ) internal {
        // Build JSON using vm.serialize* to avoid large abi.encodePacked stacks.
        string memory obj = "cfg";
        vm.serializeUint(obj, "chainId", 2050);
        vm.serializeAddress(obj, "voidToken", devVoidToken);
        vm.serializeAddress(obj, "workCreditsToken", wc);
        vm.serializeAddress(obj, "workCreditsPool", pool);
        vm.serializeAddress(obj, "treasury", deployer);
        string memory json = vm.serializeAddress(obj, "opsTreasury", deployer);

        vm.writeJson(json, "config/void-workcredits-devnet.live.json");
        console2.log("Wrote config/void-workcredits-devnet.live.json");
    }
}
