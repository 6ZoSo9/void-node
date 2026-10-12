// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/ValidatorSelectionOrderedView.sol";
import "../../contracts/mainnet/ValidatorEpochSnapshot.sol";
import "../../contracts/mainnet/ValidatorEpochRuntimeConsumer.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenEpochConsumerProof {
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

contract ValidatorHelperEpochConsumer {
    function approveToken(address token, address spender, uint256 amount) external {
        MockVoidTokenEpochConsumerProof(token).approve(spender, amount);
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

contract ValidatorEpochRuntimeConsumerLocalProof is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);

        MockVoidTokenEpochConsumerProof token = new MockVoidTokenEpochConsumerProof();
        ValidatorStakingV2 staking = new ValidatorStakingV2(address(token), 1000 ether, 7 days);
        ValidatorSelectionAdapter adapter = new ValidatorSelectionAdapter(address(staking));
        ValidatorSelectionRegistry registry = new ValidatorSelectionRegistry(admin, address(adapter));
        ValidatorSelectionOrderedView ordered = new ValidatorSelectionOrderedView(address(registry));
        ValidatorEpochSnapshot snapshot = new ValidatorEpochSnapshot(admin, address(ordered));
        ValidatorEpochRuntimeConsumer consumer = new ValidatorEpochRuntimeConsumer(address(snapshot));

        ValidatorHelperEpochConsumer h1 = new ValidatorHelperEpochConsumer();
        ValidatorHelperEpochConsumer h2 = new ValidatorHelperEpochConsumer();
        ValidatorHelperEpochConsumer h3 = new ValidatorHelperEpochConsumer();

        token.mint(address(h1), 5000 ether);
        token.mint(address(h2), 5000 ether);
        token.mint(address(h3), 5000 ether);

        h1.approveToken(address(token), address(staking), type(uint256).max);
        h2.approveToken(address(token), address(staking), type(uint256).max);
        h3.approveToken(address(token), address(staking), type(uint256).max);

        h1.registerStakeActivate(address(staking), address(0xB101), bytes32(uint256(101)), 1000 ether);
        h2.registerStakeActivate(address(staking), address(0xB102), bytes32(uint256(102)), 2000 ether);
        h3.registerStakeActivate(address(staking), address(0xB103), bytes32(uint256(103)), 1500 ether);

        snapshot.captureEpoch(1);

        console2.log("=== epoch 1 through consumer ===");
        console2.log("count", consumer.validatorCount(1));
        console2.log("totalPower", consumer.totalPower(1));

        IValidatorSelectionSource.SelectableValidator memory e10 = consumer.validatorAt(1, 0);
        IValidatorSelectionSource.SelectableValidator memory e11 = consumer.validatorAt(1, 1);
        IValidatorSelectionSource.SelectableValidator memory e12 = consumer.validatorAt(1, 2);

        console2.log("e10.reward", e10.reward);
        console2.log("e10.power", e10.effectivePower);
        console2.log("e11.reward", e11.reward);
        console2.log("e11.power", e11.effectivePower);
        console2.log("e12.reward", e12.reward);
        console2.log("e12.power", e12.effectivePower);

        h2.beginExit(address(staking));
        snapshot.captureEpoch(2);

        console2.log("=== epoch 2 through consumer ===");
        console2.log("count", consumer.validatorCount(2));
        console2.log("totalPower", consumer.totalPower(2));

        IValidatorSelectionSource.SelectableValidator memory e20 = consumer.validatorAt(2, 0);
        IValidatorSelectionSource.SelectableValidator memory e21 = consumer.validatorAt(2, 1);

        console2.log("e20.reward", e20.reward);
        console2.log("e20.power", e20.effectivePower);
        console2.log("e21.reward", e21.reward);
        console2.log("e21.power", e21.effectivePower);

        vm.stopBroadcast();
    }
}
