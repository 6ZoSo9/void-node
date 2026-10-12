// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/ValidatorRuntimeConsumer.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenRuntimeMultiProof {
    string public name = "Mock VOID";
    string public symbol = "MVOID";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external returns (bool) {
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient_balance");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient_allowance");
        require(balanceOf[from] >= amount, "insufficient_balance");
        unchecked {
            allowance[from][msg.sender] = allowed - amount;
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        return true;
    }
}

contract ValidatorHelper {
    function approveToken(address token, address spender, uint256 amount) external {
        MockVoidTokenRuntimeMultiProof(token).approve(spender, amount);
    }

    function registerStakeActivate(
        address staking,
        address reward,
        bytes32 consensusKey,
        uint256 amount
    ) external {
        ValidatorStakingV2(staking).registerAndStake(reward, consensusKey, amount);
        ValidatorStakingV2(staking).activate();
    }

    function beginExit(address staking) external {
        ValidatorStakingV2(staking).beginExit();
    }
}

contract ValidatorRuntimeConsumerMultiValidatorLocalProof is Script {
    struct Env {
        MockVoidTokenRuntimeMultiProof token;
        ValidatorStakingV2 staking;
        ValidatorSelectionAdapter adapter;
        ValidatorSelectionRegistry registry;
        ValidatorRuntimeConsumer consumer;
        ValidatorHelper h1;
        ValidatorHelper h2;
        ValidatorHelper h3;
    }

    function _deploy(address admin, uint256 minStake_, uint256 unbond_) internal returns (Env memory e) {
        e.token = new MockVoidTokenRuntimeMultiProof();
        e.staking = new ValidatorStakingV2(address(e.token), minStake_, unbond_);
        e.adapter = new ValidatorSelectionAdapter(address(e.staking));
        e.registry = new ValidatorSelectionRegistry(admin, address(e.adapter));
        e.consumer = new ValidatorRuntimeConsumer(address(e.registry));
        e.h1 = new ValidatorHelper();
        e.h2 = new ValidatorHelper();
        e.h3 = new ValidatorHelper();
    }

    function _fundAndApprove(Env memory e) internal {
        e.token.mint(address(e.h1), 5000 ether);
        e.token.mint(address(e.h2), 5000 ether);
        e.token.mint(address(e.h3), 5000 ether);

        e.h1.approveToken(address(e.token), address(e.staking), type(uint256).max);
        e.h2.approveToken(address(e.token), address(e.staking), type(uint256).max);
        e.h3.approveToken(address(e.token), address(e.staking), type(uint256).max);
    }

    function _registerThree(Env memory e) internal {
        e.h1.registerStakeActivate(address(e.staking), address(0xB101), bytes32(uint256(101)), 1000 ether);
        e.h2.registerStakeActivate(address(e.staking), address(0xB102), bytes32(uint256(102)), 1500 ether);
        e.h3.registerStakeActivate(address(e.staking), address(0xB103), bytes32(uint256(103)), 2000 ether);
    }

    function _logSelectable(string memory label, IValidatorSelectionSource.SelectableValidator memory v) internal view {
        console2.log(label);
        console2.log("reward", v.reward);
        console2.log("controller", v.controller);
        console2.logBytes32(v.consensusKey);
        console2.log("power", v.effectivePower);
    }

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);

        Env memory e = _deploy(admin, 1000 ether, 7 days);
        _fundAndApprove(e);
        _registerThree(e);

        console2.log("token", address(e.token));
        console2.log("staking", address(e.staking));
        console2.log("adapter", address(e.adapter));
        console2.log("registry", address(e.registry));
        console2.log("consumer", address(e.consumer));
        console2.log("helper1", address(e.h1));
        console2.log("helper2", address(e.h2));
        console2.log("helper3", address(e.h3));

        console2.log("=== before exit ===");
        console2.log("consumer.count", e.consumer.validatorCount());
        console2.log("consumer.totalPower", e.consumer.totalPower());
        _logSelectable("v0", e.consumer.validatorAt(0));
        _logSelectable("v1", e.consumer.validatorAt(1));
        _logSelectable("v2", e.consumer.validatorAt(2));

        e.h2.beginExit(address(e.staking));

        console2.log("=== after helper2 exit ===");
        console2.log("consumer.count", e.consumer.validatorCount());
        console2.log("consumer.totalPower", e.consumer.totalPower());
        _logSelectable("a0", e.consumer.validatorAt(0));
        _logSelectable("a1", e.consumer.validatorAt(1));

        vm.stopBroadcast();
    }
}
