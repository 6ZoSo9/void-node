// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

/// @notice RewardEngine econ spec v1
/// - Asserts config/void-mainnet-rewardengine-params.json exists,
///   is non-empty, and is valid JSON.
/// - Schema-level checks come later once params + contract are frozen.
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
