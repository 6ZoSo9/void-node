// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {MainnetRunSentinel} from "../contracts/mainnet/MainnetRunSentinel.sol";

contract MainnetRunSentinelTest is Test {
    uint256 internal runtimeChainId;

    address internal constant ADMIN = address(0xA11CE);
    address internal constant CONTROLLER = address(0xB2);

    MainnetRunSentinel internal sentinel;

    function setUp() public {
        runtimeChainId = block.chainid;
        // For tests, bind expectedChainId to the actual chainId (anvil: 31337).
        sentinel = new MainnetRunSentinel(runtimeChainId, ADMIN, CONTROLLER);
    }

    function testInitialState() public {
        assertEq(sentinel.expectedChainId(), runtimeChainId);
        assertEq(sentinel.admin(), ADMIN);
        assertEq(sentinel.controller(), CONTROLLER);

        assertEq(uint8(sentinel.status()), uint8(MainnetRunSentinel.RunStatus.NotStarted));
        assertEq(sentinel.lastConfigHash(), bytes32(0));
        assertEq(sentinel.lastUpdatedBlock(), 0);
        assertEq(sentinel.lastUpdatedAt(), 0);
    }

    /// Happy path: controller can move NOT_STARTED -> IN_PROGRESS on the correct chain.
    function testAuthorizedUpdateHappyPath() public {
        bytes32 cfgHash = keccak256("plan-v1");
        uint64 bn = uint64(block.number);

        vm.prank(CONTROLLER);
        sentinel.updateStatus(MainnetRunSentinel.RunStatus.InProgress, cfgHash, bn);

        assertEq(uint8(sentinel.status()), uint8(MainnetRunSentinel.RunStatus.InProgress));
        assertEq(sentinel.lastConfigHash(), cfgHash);
        assertEq(sentinel.lastUpdatedBlock(), bn);
        assertGt(sentinel.lastUpdatedAt(), 0);
    }

    /// Wrong expectedChainId should revert (we don't care about exact error bytes in this planning phase).
    function testInvalidChainIdReverts() public {
        // Deploy a sentinel that EXPECTS the wrong chain id.
        MainnetRunSentinel bad = new MainnetRunSentinel(runtimeChainId + 1, ADMIN, CONTROLLER);

        vm.prank(ADMIN);
        vm.expectRevert(); // any revert is acceptable here
        bad.updateStatus(MainnetRunSentinel.RunStatus.InProgress, bytes32(0), uint64(block.number));
    }

    /// NOT_STARTED -> COMPLETED directly should revert.
    function testInvalidTransitionNotStartedToCompletedReverts() public {
        vm.prank(CONTROLLER);
        vm.expectRevert(); // expect some revert (InvalidTransition under the hood)
        sentinel.updateStatus(MainnetRunSentinel.RunStatus.Completed, bytes32(0), uint64(block.number));
    }

    /// Only admin or controller can call updateStatus.
    function testOnlyAdminOrControllerCanUpdate() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert(); // Unauthorized in the implementation
        sentinel.updateStatus(MainnetRunSentinel.RunStatus.InProgress, keccak256("cfg"), uint64(block.number));
    }

    /// setController is admin-only.
    function testSetControllerOnlyAdmin() public {
        address newController = address(0xCAFE);

        // Admin can set controller
        vm.prank(ADMIN);
        sentinel.setController(newController);
        assertEq(sentinel.controller(), newController);

        // Non-admin cannot
        vm.prank(address(0xDEAD));
        vm.expectRevert(); // Unauthorized in the implementation
        sentinel.setController(address(0xBEEF));
    }
}
