// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {VoidToken} from "../contracts/VoidToken.sol";
import {WorkCreditsToken} from "../contracts/workcredits/WorkCreditsToken.sol";
import {VoidWorkCreditsPool} from "../contracts/workcredits/VoidWorkCreditsPool.sol";

/// @notice Devnet bootstrap for WorkCredits:
/// - Deploys WorkCreditsToken(controller = deployer)
/// - Deploys VoidWorkCreditsPool (VOID/WC, owner = deployer)
/// - Seeds pool with some devnet VOID + WC
/// - Writes config/void-workcredits-devnet.live.json
///
/// ENV:
///   DEVNET_DEPLOYER_KEY : uint256 private key with VOID balance on devnet
///   DEVNET_VOID_TOKEN   : address of devnet VOID token (existing)
contract VoidWorkCreditsDevnetBootstrap is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEVNET_DEPLOYER_KEY");
        address deployer = vm.addr(deployerKey);
        address devVoidToken = vm.envAddress("DEVNET_VOID_TOKEN");

        vm.startBroadcast(deployerKey);

        // 1) Deploy WorkCredits token; deployer is controller.
        WorkCreditsToken wc = new WorkCreditsToken(deployer);

        // 2) Deploy VOID/WC pool; owner = deployer (devnet controller).
        VoidWorkCreditsPool pool = new VoidWorkCreditsPool(
            devVoidToken,
            address(wc),
            deployer
        );

        // 3) Seed with some arbitrary devnet liquidity.
        // Adjust these if your devnet balances differ.
        // [wc-big-seed-v1] optional big-seed toggle (default: small seed)
        bool bigSeed = true;
        try vm.envBool("WC_BIG_SEED") returns (bool v) { bigSeed = v; } catch {}
        uint256 initialVoid = bigSeed ? 10_000_000e18 : 1_000e18;
        uint256 initialWc   = bigSeed ? 10_000_000e18 : 100_000e18;
// Mint WC to deployer via controller.
        wc.mint(deployer, initialWc);

        // Approve pool to pull VOID + WC from deployer.
        VoidToken(devVoidToken).approve(address(pool), initialVoid);
        wc.approve(address(pool), initialWc);

        // Seed pool.
        pool.seed(initialVoid, initialWc);

        vm.stopBroadcast();

        console2.log("DEVNET_VOID_TOKEN    :", devVoidToken);
        console2.log("WorkCreditsToken     :", address(wc));
        console2.log("VoidWorkCreditsPool  :", address(pool));
        console2.log("Deployer/Controller  :", deployer);

        // 4) Emit a live JSON config for the node/exporter.
        string memory json = string(
            abi.encodePacked(
                "{\n",
                "  \"chainId\": 2050,\n",
                "  \"voidToken\": \"", vm.toString(devVoidToken), "\",\n",
                "  \"workCreditsToken\": \"", vm.toString(address(wc)), "\",\n",
                "  \"workCreditsPool\": \"", vm.toString(address(pool)), "\",\n",
                "  \"treasury\": \"", vm.toString(deployer), "\",\n",
                "  \"opsTreasury\": \"", vm.toString(deployer), "\"\n",
                "}\n"
            )
        );

        vm.writeFile("config/void-workcredits-devnet.live.json", json);
        console2.log("Wrote config/void-workcredits-devnet.live.json");
    }
}
