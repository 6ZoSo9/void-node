// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "../contracts/ValidatorSet.sol";

/// @notice Minimal smoke tests for ValidatorSet v1.
/// @dev No forge-std; just bare require() to keep deps minimal.
contract ValidatorSetTest {
    ValidatorSet private set;

    constructor() {
        // Bind to VOID mainnet semantics: chainId 2050, this test as masterKey.
        set = new ValidatorSet(2050, address(this));
    }

    function testConstantsAndVersion() public {
        require(set.chainId() == 2050, "chainId mismatch");
        require(set.masterKey() == address(this), "masterKey mismatch");
        require(set.VERSION() == 1, "VERSION mismatch");
    }

    function testAddValidatorAndToggleActive() public {
        address v1 = address(0xBEEF);
        uint256 stake = 100 ether;

        uint256 id = set.addValidator(v1, stake);

        (address consensusAddr, uint256 bondedStake, bool active, uint64 joinedAt, uint64 updatedAt) =
            set.getValidator(id);

        require(consensusAddr == v1, "addr mismatch");
        require(bondedStake == stake, "stake mismatch");
        require(active, "expected active");
        require(joinedAt != 0, "joinedAt zero");
        require(updatedAt != 0, "updatedAt zero");
        require(set.isActive(v1), "isActive false");

        set.setValidatorActive(id, false);
        require(!set.isActive(v1), "still active");
    }

    function testUpdateStake() public {
        address v1 = address(0xCAFE);
        uint256 id = set.addValidator(v1, 10);

        set.setValidatorStake(id, 20);

        (, uint256 bondedStake,,,) = set.getValidator(id);
        require(bondedStake == 20, "stake not updated");
    }

    function testSetMasterKey() public {
        address newMaster = address(0x1234);
        set.setMasterKey(newMaster);
        require(set.masterKey() == newMaster, "masterKey not updated");
    }
}
