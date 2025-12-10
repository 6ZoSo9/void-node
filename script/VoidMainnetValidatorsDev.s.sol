// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

/// @dev PLAN-only dev harness for validator0 bootstrap.
/// - Reads the same live mainnet JSON we use for the main PLAN script
/// - Prints validator0 reward/consensusKey/stakeVOID
/// - No broadcasts, no state changes.
contract VoidMainnetValidatorsDev is Script {
    function run() external {
        plan();
    }

    function plan() public {
        // Reuse the same config as the main PLAN script by default.
        // You can override this with:
        //   export VOID_MAINNET_BOOTSTRAP_CONFIG=path/to/json
        string memory configPath = vm.envOr(
            "VOID_MAINNET_BOOTSTRAP_CONFIG",
            string("config/void-mainnet-bootstrap-mainnet.live.json")
        );

        console2.log("=== [VoidMainnetValidatorsDev.plan] BEGIN ===");
        console2.log("  configPath =", configPath);

        string memory json = vm.readFile(configPath);

        uint256 cfgChainId = vm.parseJsonUint(json, ".chainId");
        console2.log("  cfg.chainId   =", cfgChainId);
        console2.log("  runtime.chainId =", block.chainid);

        if (cfgChainId != block.chainid) {
            console2.log("  [WARN] chainId mismatch between config and runtime]");
        }

        console2.log("=== [validator0 from config] ===");

        address v0Reward = vm.parseJsonAddress(json, ".validator0.reward");
        bytes32 v0ConsensusKey = vm.parseJsonBytes32(json, ".validator0.consensusKey");
        uint256 v0StakeVOID = vm.parseJsonUint(json, ".validator0.stakeVOID");

        console2.log("  reward       :", v0Reward);
        console2.logBytes32(v0ConsensusKey);
        console2.log("  stakeVOID    :", v0StakeVOID);

        console2.log("=== [VoidMainnetValidatorsDev.plan] END ===");
    }
}
