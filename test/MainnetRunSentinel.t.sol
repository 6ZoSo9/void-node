// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {MainnetRunSentinel} from "../contracts/mainnet/MainnetRunSentinel.sol";

contract MainnetRunSentinelTest is Test {
    MainnetRunSentinel sentinel;

    address admin = address(0xA1);
    address controller = address(0xB2);

    // Matches the liveConfigHash you have in the RUN state JSON/metrics.
    bytes32 initialHash = 0x70962bdcc965eee8a99e48e7aaa3efa63cb1ec18e6ddb0c16e040976528d947f;

    function setUp() public {
        // Simulate VOID mainnet chain id inside the test vm.
        vm.chainId(2050);
        sentinel = new MainnetRunSentinel(admin, controller, initialHash, block.chainid);
    }

    function testInitialState() public {
        assertEq(uint256(sentinel.status()), uint256(MainnetRunSentinel.RunStatus.NOT_STARTED));
        assertEq(sentinel.configHash(), initialHash);
        assertEq(sentinel.runTxs(), 0);
        assertEq(sentinel.startedAt(), 0);
        assertEq(sentinel.completedAt(), 0);
        assertEq(sentinel.CHAIN_ID(), 2050);
    }

    function testOnlyAdminOrControllerCanUpdate() public {
        // controller moves to IN_PROGRESS
        vm.prank(controller);
        sentinel.updateStatus(MainnetRunSentinel.RunStatus.IN_PROGRESS, bytes32(0), 1);

        // admin completes with final tx count
        vm.prank(admin);
        sentinel.updateStatus(MainnetRunSentinel.RunStatus.COMPLETED, bytes32(0), 10);

        MainnetRunSentinel.RunState memory st = sentinel.getState();
        assertEq(uint256(st.status), uint256(MainnetRunSentinel.RunStatus.COMPLETED));
        assertEq(st.runTxs, 10);
        assertTrue(st.startedAt != 0);
        assertTrue(st.completedAt != 0);
        assertTrue(st.updatedAt >= st.completedAt);
    }

    function testUnauthorizedReverts() public {
        vm.expectRevert(MainnetRunSentinel.NotAuthorized.selector);
        sentinel.updateStatus(MainnetRunSentinel.RunStatus.IN_PROGRESS, bytes32(0), 0);
    }

    function testInvalidChainIdReverts() public {
        vm.expectRevert(MainnetRunSentinel.InvalidChainId.selector);
        new MainnetRunSentinel(
            admin,
            controller,
            initialHash,
            1 // wrong chain
        );
    }

    function testInvalidTransitionNotStartedToCompletedReverts() public {
        vm.prank(controller);
        vm.expectRevert(MainnetRunSentinel.InvalidTransition.selector);
        sentinel.updateStatus(MainnetRunSentinel.RunStatus.COMPLETED, bytes32(0), 0);
    }

    function testSetControllerOnlyAdmin() public {
        address newController = address(0xC3);

        vm.prank(admin);
        sentinel.setController(newController);

        vm.prank(newController);
        sentinel.updateStatus(MainnetRunSentinel.RunStatus.IN_PROGRESS, bytes32(0), 1);

        MainnetRunSentinel.RunState memory st = sentinel.getState();
        assertEq(st.runTxs, 1);
        assertEq(uint256(st.status), uint256(MainnetRunSentinel.RunStatus.IN_PROGRESS));
    }
}
