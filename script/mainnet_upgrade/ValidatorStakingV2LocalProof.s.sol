// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";

contract MockVoidTokenProof {
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

contract ValidatorStakingV2LocalProof is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address controller = vm.addr(pk);
        address reward = address(0xBEEF);
        bytes32 consensusKey = bytes32(uint256(123456789));
        uint256 minStake_ = 1000 ether;
        uint256 unbond_ = 7 days;

        vm.startBroadcast(pk);

        MockVoidTokenProof token = new MockVoidTokenProof();
        ValidatorStakingV2 staking = new ValidatorStakingV2(address(token), minStake_, unbond_);

        token.mint(controller, 5000 ether);
        token.approve(address(staking), type(uint256).max);

        staking.registerAndStake(reward, consensusKey, minStake_);
        staking.activate();

        vm.stopBroadcast();

        console2.log("token", address(token));
        console2.log("staking", address(staking));
        console2.log("controller", controller);
        console2.log("reward", reward);
        console2.log("minStake", minStake_);
        console2.log("unbonding", unbond_);

        IValidatorStakingV2.ValidatorInfo memory info = staking.getValidator(reward);

        console2.log("validator.reward", info.reward);
        console2.log("validator.controller", info.controller);
        console2.logBytes32(info.consensusKey);
        console2.log("validator.stake", info.stakeVOID);
        console2.log("validator.active", info.active);
        console2.log("validator.pendingActivation", info.pendingActivation);
        console2.log("validator.pendingExit", info.pendingExit);
        console2.log("validator.jailed", info.jailed);
        console2.log("validator.unbondAmount", info.unbondAmount);
        console2.log("validator.unbondReadyAt", info.unbondReadyAt);
        console2.log("token.balanceOf(staking)", token.balanceOf(address(staking)));
        console2.log("staking.isActiveValidator(reward)", staking.isActiveValidator(reward));
        console2.log("staking.getValidatorCount()", staking.getValidatorCount());
    }
}
