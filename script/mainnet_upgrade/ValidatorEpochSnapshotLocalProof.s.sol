// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/mainnet/ValidatorStakingV2.sol";
import "../../contracts/mainnet/ValidatorSelectionAdapter.sol";
import "../../contracts/mainnet/ValidatorSelectionRegistry.sol";
import "../../contracts/mainnet/ValidatorSelectionOrderedView.sol";
import "../../contracts/mainnet/ValidatorEpochSnapshot.sol";
import "../../contracts/mainnet/IValidatorSelectionSource.sol";

contract MockVoidTokenEpochSnapshotProof {
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

contract ValidatorHelperEpoch {
    function approveToken(address token, address spender, uint256 amount) external {
        MockVoidTokenEpochSnapshotProof(token).approve(spender, amount);
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

contract ValidatorEpochSnapshotLocalProof is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);

        MockVoidTokenEpochSnapshotProof token = new MockVoidTokenEpochSnapshotProof();
        ValidatorStakingV2 staking = new ValidatorStakingV2(address(token), 1000 ether, 7 days);
        ValidatorSelectionAdapter adapter = new ValidatorSelectionAdapter(address(staking));
        ValidatorSelectionRegistry registry = new ValidatorSelectionRegistry(admin, address(adapter));
        ValidatorSelectionOrderedView ordered = new ValidatorSelectionOrderedView(address(registry));
        ValidatorEpochSnapshot snapshot = new ValidatorEpochSnapshot(admin, address(ordered));

        ValidatorHelperEpoch h1 = new ValidatorHelperEpoch();
        ValidatorHelperEpoch h2 = new ValidatorHelperEpoch();
        ValidatorHelperEpoch h3 = new ValidatorHelperEpoch();

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

        console2.log("=== epoch 1 ===");
        console2.log("count", snapshot.getEpochValidatorCount(1));
        console2.log("totalPower", snapshot.getEpochTotalPower(1));

        IValidatorSelectionSource.SelectableValidator memory e10 = snapshot.getEpochValidatorAt(1, 0);
        IValidatorSelectionSource.SelectableValidator memory e11 = snapshot.getEpochValidatorAt(1, 1);
        IValidatorSelectionSource.SelectableValidator memory e12 = snapshot.getEpochValidatorAt(1, 2);

        console2.log("e10.reward", e10.reward);
        console2.log("e10.power", e10.effectivePower);
        console2.log("e11.reward", e11.reward);
        console2.log("e11.power", e11.effectivePower);
        console2.log("e12.reward", e12.reward);
        console2.log("e12.power", e12.effectivePower);

        h2.beginExit(address(staking));
        snapshot.captureEpoch(2);

        console2.log("=== epoch 2 ===");
        console2.log("count", snapshot.getEpochValidatorCount(2));
        console2.log("totalPower", snapshot.getEpochTotalPower(2));

        IValidatorSelectionSource.SelectableValidator memory e20 = snapshot.getEpochValidatorAt(2, 0);
        IValidatorSelectionSource.SelectableValidator memory e21 = snapshot.getEpochValidatorAt(2, 1);

        console2.log("e20.reward", e20.reward);
        console2.log("e20.power", e20.effectivePower);
        console2.log("e21.reward", e21.reward);
        console2.log("e21.power", e21.effectivePower);

        vm.stopBroadcast();
    }
}
