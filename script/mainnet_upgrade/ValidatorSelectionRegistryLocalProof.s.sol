// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenSelectionRegistryProof {
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

contract ValidatorSelectionRegistryLocalProof is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address controller = vm.addr(pk);
        address reward = address(0xBEEF);
        bytes32 consensusKey = bytes32(uint256(123456789));
        uint256 minStake_ = 1000 ether;
        uint256 unbond_ = 7 days;

        vm.startBroadcast(pk);

        MockVoidTokenSelectionRegistryProof token = new MockVoidTokenSelectionRegistryProof();
        ValidatorStakingV2 staking = new ValidatorStakingV2(address(token), minStake_, unbond_);
        ValidatorSelectionAdapter adapter = new ValidatorSelectionAdapter(address(staking));
        ValidatorSelectionRegistry registry = new ValidatorSelectionRegistry(controller, address(adapter));

        token.mint(controller, 5000 ether);
        token.approve(address(staking), type(uint256).max);

        staking.registerAndStake(reward, consensusKey, minStake_);
        staking.activate();

        vm.stopBroadcast();

        console2.log("token", address(token));
        console2.log("staking", address(staking));
        console2.log("adapter", address(adapter));
        console2.log("registry", address(registry));
        console2.log("controller", controller);
        console2.log("reward", reward);

        uint256 count = registry.getSelectableValidatorCount();
        uint256 total = registry.totalSelectablePower();
        IValidatorSelectionSource.SelectableValidator memory v = registry.getSelectableValidatorAt(0);

        console2.log("registry.selectable.count", count);
        console2.log("registry.selectable.totalPower", total);
        console2.log("registry.selected.reward", v.reward);
        console2.log("registry.selected.controller", v.controller);
        console2.logBytes32(v.consensusKey);
        console2.log("registry.selected.effectivePower", v.effectivePower);
    }
}
