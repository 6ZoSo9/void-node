// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {WorkCreditsToken} from "../../contracts/mainnet/WorkCreditsToken.sol";
import {WorkCreditsMinter} from "../../contracts/mainnet/WorkCreditsMinter.sol";

contract WorkCreditsMinterTest is Test {
    WorkCreditsToken internal wc;
    WorkCreditsMinter internal minter;

    address internal admin        = address(0xA11CE);
    address internal rewardEngine = address(0xBEEF);
    address internal newReward    = address(0xCAFEBABE);
    address internal newAdmin     = address(0xDEAD);
    address internal worker       = address(0xC0DE);

    bytes32 internal pillar   = bytes32("mainnet-core");
    bytes32 internal agent    = bytes32("ai");
    bytes32 internal category = bytes32("design");

    function setUp() public {
        // Deploy WC with admin as governance
        vm.prank(admin);
        wc = new WorkCreditsToken(admin);

        // Deploy minter with WC + admin
        minter = new WorkCreditsMinter(address(wc), admin);

        // Admin wires minter as the sole WC minter
        vm.prank(admin);
        wc.setMinter(address(minter));

        // Admin sets reward engine
        vm.prank(admin);
        minter.setRewardEngine(rewardEngine);
    }

    function testInitialState() public {
        assertEq(address(minter.wc()), address(wc));
        assertEq(minter.admin(), admin);
        assertEq(minter.rewardEngine(), rewardEngine);
    }

    function testOnlyAdminCanSetRewardEngine() public {
        vm.prank(address(0xBAD));
        vm.expectRevert("WCMinter: not admin");
        minter.setRewardEngine(address(0x1234));

        vm.prank(admin);
        minter.setRewardEngine(newReward);
        assertEq(minter.rewardEngine(), newReward);
    }

    function testOnlyAdminCanSetAdmin() public {
        vm.prank(address(0xBAD));
        vm.expectRevert("WCMinter: not admin");
        minter.setAdmin(newAdmin);

        vm.prank(admin);
        minter.setAdmin(newAdmin);
        assertEq(minter.admin(), newAdmin);
    }

    function testSetAdminZeroReverts() public {
        vm.prank(admin);
        vm.expectRevert("WCMinter: admin zero");
        minter.setAdmin(address(0));
    }

    function testSetRewardEngineZeroReverts() public {
        vm.prank(admin);
        vm.expectRevert("WCMinter: rewardEngine zero");
        minter.setRewardEngine(address(0));
    }

    function testOnlyRewardEngineCanAward() public {
        // Non rewardEngine caller should revert
        vm.expectRevert("WCMinter: not rewardEngine");
        minter.award(worker, 1e18, pillar, agent, category);

        // RewardEngine can call successfully
        vm.prank(rewardEngine);
        minter.award(worker, 1e18, pillar, agent, category);

        assertEq(wc.balanceOf(worker), 1e18);
        assertEq(wc.totalSupply(), 1e18);
    }

    function testAwardZeroAmountReverts() public {
        vm.prank(rewardEngine);
        vm.expectRevert("WCMinter: zero amount");
        minter.award(worker, 0, pillar, agent, category);
    }

    function testAwardToZeroReverts() public {
        vm.prank(rewardEngine);
        vm.expectRevert("WCMinter: to zero");
        minter.award(address(0), 1e18, pillar, agent, category);
    }

    function testMultipleAwardsAccumulate() public {
        vm.startPrank(rewardEngine);
        minter.award(worker, 2e18, pillar, agent, category);
        minter.award(worker, 3e18, pillar, agent, category);
        vm.stopPrank();

        assertEq(wc.balanceOf(worker), 5e18);
        assertEq(wc.totalSupply(), 5e18);
    }
}
