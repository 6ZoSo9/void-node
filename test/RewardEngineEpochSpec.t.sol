// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

/// @notice RewardEngine econ spec v1 (minimal)
/// - Asserts config/void-mainnet-rewardengine-params.json exists
///   and is non-empty.
/// - Asserts it is valid JSON (vm.parseJson does not revert).
/// Full econ consistency is enforced by ops + Prom gauges:
///   - void_mainnet_rewardengine_econ_json_ok
///   - void_mainnet_rewardengine_econ_self_consistent
contract RewardEngineEpochSpec is Test {
    function testRewardEngineParamsJsonPresentAndValid() public {
        // Resolve project root as seen by forge
        string memory root = vm.projectRoot();
        string memory path = string.concat(
            root,
            "/config/void-mainnet-rewardengine-params.json"
        );

        // 1) File must exist and be non-empty
        string memory raw = vm.readFile(path);
        bytes memory rawBytes = bytes(raw);
        assertGt(
            rawBytes.length,
            0,
            "void-mainnet-rewardengine-params.json must not be empty"
        );

        // 2) It must be valid JSON (no structural errors).
        //    vm.parseJson will revert if the JSON is invalid.
        bytes memory parsed = vm.parseJson(raw);
        assertGt(
            parsed.length,
            0,
            "parsed RewardEngine econ JSON must not be empty"
        );
    }
}
