// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {WorkCreditsRelayerTypes} from "../../contracts/workcredits/WorkCreditsRelayerTypes.sol";

contract WorkCreditsRelayerTypesTest is Test {
    using WorkCreditsRelayerTypes for WorkCreditsRelayerTypes.RelayedCall;

    function testHashRelayedCallStable() public {
        WorkCreditsRelayerTypes.RelayedCall memory c = WorkCreditsRelayerTypes.RelayedCall({
            user: address(0x1234),
            to: address(0xBEEF),
            data: hex"deadbeef",
            value: 0,
            nonce: 42,
            maxWCFee: 1_000e18,
            deadline: 1700000000
        });

        bytes32 h1 = WorkCreditsRelayerTypes.hashRelayedCall(c);

        // Recompute manually to ensure we didn't mess up the encoding.
        bytes32 manual = keccak256(
            abi.encode(
                WorkCreditsRelayerTypes.RELAYED_CALL_TYPEHASH,
                c.user,
                c.to,
                keccak256(c.data),
                c.value,
                c.nonce,
                c.maxWCFee,
                c.deadline
            )
        );

        assertEq(h1, manual, "hashRelayedCall does not match manual encoding");
    }

    function testDigestLooksReasonable() public {
        WorkCreditsRelayerTypes.RelayedCall memory c = WorkCreditsRelayerTypes.RelayedCall({
            user: address(0x1234),
            to: address(0xBEEF),
            data: hex"deadbeef",
            value: 0,
            nonce: 1,
            maxWCFee: 5_000e18,
            deadline: 1800000000
        });

        uint256 chainId = 2050;
        address verifyingContract = address(0xDEAD);

        bytes32 d1 = WorkCreditsRelayerTypes.digest(chainId, verifyingContract, c);

        // Basic sanity: digest should be non-zero and depend on chainId + contract.
        vm.assume(verifyingContract != address(0));
        assertTrue(d1 != bytes32(0), "digest should not be zero");

        bytes32 d2 = WorkCreditsRelayerTypes.digest(chainId + 1, verifyingContract, c);
        assertTrue(d1 != d2, "digest should change with chainId");

        bytes32 d3 = WorkCreditsRelayerTypes.digest(chainId, address(0xBEEF), c);
        assertTrue(d1 != d3, "digest should change with verifyingContract");
    }
}
