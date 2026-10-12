// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/ValidatorSelectionOrderedView.sol";
import "../../contracts/mainnet/ValidatorRuntimeConsumer.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenRegistrySwapProof {
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

contract ValidatorHelperSwap {
    function approveToken(address token, address spender, uint256 amount) external {
        MockVoidTokenRegistrySwapProof(token).approve(spender, amount);
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
}

contract ValidatorRegistrySourceSwapLocalProof is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);

        MockVoidTokenRegistrySwapProof token = new MockVoidTokenRegistrySwapProof();
        ValidatorStakingV2 staking = new ValidatorStakingV2(address(token), 1000 ether, 7 days);
        ValidatorSelectionAdapter adapter = new ValidatorSelectionAdapter(address(staking));
        ValidatorSelectionRegistry registry = new ValidatorSelectionRegistry(admin, address(adapter));
        ValidatorSelectionOrderedView ordered = new ValidatorSelectionOrderedView(address(adapter));
        ValidatorRuntimeConsumer consumer = new ValidatorRuntimeConsumer(address(registry));

        ValidatorHelperSwap h1 = new ValidatorHelperSwap();
        ValidatorHelperSwap h2 = new ValidatorHelperSwap();
        ValidatorHelperSwap h3 = new ValidatorHelperSwap();

        token.mint(address(h1), 5000 ether);
        token.mint(address(h2), 5000 ether);
        token.mint(address(h3), 5000 ether);

        h1.approveToken(address(token), address(staking), type(uint256).max);
        h2.approveToken(address(token), address(staking), type(uint256).max);
        h3.approveToken(address(token), address(staking), type(uint256).max);

        h1.registerStakeActivate(address(staking), address(0xB101), bytes32(uint256(101)), 1000 ether);
        h2.registerStakeActivate(address(staking), address(0xB102), bytes32(uint256(102)), 2000 ether);
        h3.registerStakeActivate(address(staking), address(0xB103), bytes32(uint256(103)), 1500 ether);

        console2.log("=== before registry source swap ===");
        console2.log("count", consumer.validatorCount());
        console2.log("totalPower", consumer.totalPower());

        IValidatorSelectionSource.SelectableValidator memory b0 = consumer.validatorAt(0);
        IValidatorSelectionSource.SelectableValidator memory b1 = consumer.validatorAt(1);
        IValidatorSelectionSource.SelectableValidator memory b2 = consumer.validatorAt(2);

        console2.log("b0.reward", b0.reward);
        console2.log("b0.power", b0.effectivePower);
        console2.log("b1.reward", b1.reward);
        console2.log("b1.power", b1.effectivePower);
        console2.log("b2.reward", b2.reward);
        console2.log("b2.power", b2.effectivePower);

        registry.setSelectionSource(address(ordered));

        console2.log("=== after registry source swap ===");
        console2.log("count", consumer.validatorCount());
        console2.log("totalPower", consumer.totalPower());

        IValidatorSelectionSource.SelectableValidator memory a0 = consumer.validatorAt(0);
        IValidatorSelectionSource.SelectableValidator memory a1 = consumer.validatorAt(1);
        IValidatorSelectionSource.SelectableValidator memory a2 = consumer.validatorAt(2);

        console2.log("a0.reward", a0.reward);
        console2.log("a0.power", a0.effectivePower);
        console2.log("a1.reward", a1.reward);
        console2.log("a1.power", a1.effectivePower);
        console2.log("a2.reward", a2.reward);
        console2.log("a2.power", a2.effectivePower);

        vm.stopBroadcast();
    }
}
