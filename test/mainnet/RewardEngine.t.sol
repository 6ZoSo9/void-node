// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {IVoidTokenLike} from "../../contracts/mainnet/IVoidTokenLike.sol";
import {IValidatorSetLike} from "../../contracts/mainnet/IValidatorSetLike.sol";
import {IRewardEngineLike} from "../../contracts/mainnet/IRewardEngineLike.sol";
import {RewardEngine} from "../../contracts/mainnet/RewardEngine.sol";

/// @dev Simple VOID-like token for reward tests only.
contract MockVoidTokenRewards is IVoidTokenLike {
    string public constant name = "Mock VOID (rewards)";
    string public constant symbol = "mVOID-R";
    uint8 public constant decimals = 18;

    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 amount);

    function transfer(address to, uint256 amount) external override returns (bool) {
        address from = msg.sender;
        uint256 bal = balanceOf[from];
        require(bal >= amount, "insufficient");
        unchecked {
            balanceOf[from] = bal - amount;
        }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

/// @dev Minimal validator set mock: just two validators with fixed power.
contract MockValidatorSet is IValidatorSetLike {
    address[] internal _validators;
    mapping(address => uint256) internal _power;

    constructor(address v1, uint256 p1, address v2, uint256 p2) {
        _validators.push(v1);
        _validators.push(v2);
        _power[v1] = p1;
        _power[v2] = p2;
    }

    function getActiveValidators() external view returns (address[] memory) {
        return _validators;
    }

    function getVotingPower(address validator) external view returns (uint256) {
        return _power[validator];
    }
}

contract RewardEngineTest is Test {
    MockVoidTokenRewards internal token;
    MockValidatorSet internal validatorSet;
    RewardEngine internal engine;

    address internal admin = address(0xA11CE);
    address internal val1 = address(0x1111);
    address internal val2 = address(0x2222);

    function setUp() public {
        token = new MockVoidTokenRewards();

        // No local arrays, just pass directly to the mock constructor.
        validatorSet = new MockValidatorSet(val1, 10, val2, 20);

        engine = new RewardEngine(
            IVoidTokenLike(address(token)),
            IValidatorSetLike(address(validatorSet)),
            admin
        );
    }

    function testEmissionsBudgetMatchesSpec() public {
        uint256 budget = engine.emissionsBudget();
        assertEq(budget, 333_333_333e18, "emissionsBudget mismatch");
    }

    function testOnlyAdminCanPullEmission() public {
        vm.expectRevert("not admin");
        engine.pullEmission(1e18);
    }

    function testPullEmissionCapsAtBudget() public {
        uint256 budget = engine.emissionsBudget();

        // First pull: small chunk.
        vm.prank(admin);
        engine.pullEmission(100e18);
        assertEq(engine.totalEmitted(), 100e18, "totalEmitted after first pull");

        // Second pull: fill to exactly budget.
        uint256 remaining = budget - 100e18;
        vm.prank(admin);
        engine.pullEmission(remaining);
        assertEq(engine.totalEmitted(), budget, "should reach full budget");

        // Third pull: any extra must revert.
        vm.prank(admin);
        vm.expectRevert("emissions cap");
        engine.pullEmission(1);
    }

    function testClaimFlow() public {
        // Admin pulls some emissions into accounting.
        vm.prank(admin);
        engine.pullEmission(100e18);

        // Admin credits val1 with a share.
        vm.prank(admin);
        engine.credit(val1, 50e18);

        // Fund the engine with actual tokens so it can pay out.
        token.mint(address(engine), 50e18);

        // Sanity: claimable matches.
        uint256 claimableBefore = engine.claimable(val1);
        assertEq(claimableBefore, 50e18, "claimable before claim");

        // val1 claims.
        vm.prank(val1);
        uint256 claimed = engine.claim();
        assertEq(claimed, 50e18, "claimed amount");

        // Balances updated correctly.
        assertEq(token.balanceOf(val1), 50e18, "validator should receive 50");
        assertEq(engine.claimable(val1), 0, "claimable should be zero after claim");
    }

    function testClaimRevertsWhenNothingToClaim() public {
        vm.prank(val1);
        vm.expectRevert("nothing to claim");
        engine.claim();
    }
}
