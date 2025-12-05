// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {WorkCreditsRelayerTypes} from "../../contracts/workcredits/WorkCreditsRelayerTypes.sol";
import {WorkCreditsRelayerV1, IWC20} from "../../contracts/workcredits/WorkCreditsRelayerV1.sol";

contract DummyWC is IWC20 {
    string public name = "Dummy WC";
    string public symbol = "DWC";
    uint8 public decimals = 18;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;
    uint256 private _totalSupply;

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function transfer(address to, uint256 value) external override returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external override returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= value, "allowance");
        allowance[from][msg.sender] = a - value;
        _transfer(from, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(balanceOf[from] >= value, "balance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
    }

    function mint(address to, uint256 value) external {
        balanceOf[to] += value;
        _totalSupply += value;
    }
}

contract DummyTarget {
    uint256 public x;

    function setX(uint256 _x) external {
        x = _x;
    }
}

contract WorkCreditsRelayerV1Test is Test {
    using WorkCreditsRelayerTypes for WorkCreditsRelayerTypes.RelayedCall;

    DummyWC internal wc;
    DummyTarget internal target;
    WorkCreditsRelayerV1 internal relayer;

    address internal admin = address(0xA11CE);
    address internal feeRecipient = address(0xFEE);
    uint256 internal userPk;
    address internal user;

    function setUp() public {
        wc = new DummyWC();
        target = new DummyTarget();

        relayer = new WorkCreditsRelayerV1(admin, address(wc), feeRecipient);

        userPk = 0xAABBCC;
        user = vm.addr(userPk);

        wc.mint(user, 10_000e18);

        vm.prank(user);
        wc.approve(address(relayer), type(uint256).max);
    }

    function _signCall(WorkCreditsRelayerTypes.RelayedCall memory c)
        internal
        view
        returns (bytes memory sig)
    {
        uint256 chainId = block.chainid;
        bytes32 d = WorkCreditsRelayerTypes.digest(chainId, address(relayer), c);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPk, d);
        sig = abi.encodePacked(r, s, v);
    }

    function testExecuteRelayedCallHappyPath() public {
        WorkCreditsRelayerTypes.RelayedCall memory c = WorkCreditsRelayerTypes.RelayedCall({
            user: user,
            to: address(target),
            data: abi.encodeWithSelector(DummyTarget.setX.selector, uint256(123)),
            value: 0,
            nonce: 0,
            maxWCFee: 1_000e18,
            deadline: block.timestamp + 1 hours
        });

        bytes memory sig = _signCall(c);

        uint256 wcFee = 100e18;

        vm.prank(address(0xBEEF)); // relayer caller
        relayer.executeRelayedCall(c, sig, wcFee);

        assertEq(relayer.nonces(user), 1, "nonce not incremented");
        assertEq(wc.balanceOf(feeRecipient), wcFee, "feeRecipient did not receive WC");
        assertEq(target.x(), 123, "target call not executed");
    }

    function testExecuteRelayedCallRevertsWhenFeeTooHigh() public {
        WorkCreditsRelayerTypes.RelayedCall memory c = WorkCreditsRelayerTypes.RelayedCall({
            user: user,
            to: address(target),
            data: abi.encodeWithSelector(DummyTarget.setX.selector, uint256(123)),
            value: 0,
            nonce: 0,
            maxWCFee: 100e18,
            deadline: block.timestamp + 1 hours
        });

        bytes memory sig = _signCall(c);

        uint256 wcFee = 200e18; // > maxWCFee

        vm.expectRevert(WorkCreditsRelayerV1.FeeTooHigh.selector);
        relayer.executeRelayedCall(c, sig, wcFee);
    }

    function testExecuteRelayedCallRevertsOnBadSignature() public {
        // Same call but we sign with a different key
        WorkCreditsRelayerTypes.RelayedCall memory c = WorkCreditsRelayerTypes.RelayedCall({
            user: user,
            to: address(target),
            data: abi.encodeWithSelector(DummyTarget.setX.selector, uint256(123)),
            value: 0,
            nonce: 0,
            maxWCFee: 1_000e18,
            deadline: block.timestamp + 1 hours
        });

        uint256 otherPk = 0xDEADBEEF;
        bytes32 d = WorkCreditsRelayerTypes.digest(block.chainid, address(relayer), c);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(otherPk, d);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert(WorkCreditsRelayerV1.InvalidSignature.selector);
        relayer.executeRelayedCall(c, sig, 50e18);
    }
}
