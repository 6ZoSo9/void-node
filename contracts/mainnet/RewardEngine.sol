// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IVoidTokenLike} from "./IVoidTokenLike.sol";
import {IValidatorSetLike} from "./IValidatorSetLike.sol";
import {IRewardEngineLike} from "./IRewardEngineLike.sol";

/// @dev Reward engine skeleton for VOID emissions.
/// - Tracks a hard cap of 333,333,333 VOID (18 decimals).
/// - Lets an admin pull emissions in arbitrary chunks up to the cap.
/// - Maintains per-validator claimable balances.
/// - Uses IVoidTokenLike.transfer for payout; actual funding of this contract is wired externally.
contract RewardEngine is IRewardEngineLike {
    IVoidTokenLike public immutable override token;
    IValidatorSetLike public immutable override validatorSet;
    address public immutable override admin;

    /// @notice Total emissions budget: 333,333,333 * 1e18.
    uint256 public constant EMISSIONS_BUDGET = 333_333_333e18;

    /// @inheritdoc IRewardEngineLike
    uint256 public override totalEmitted;

    /// @dev Simple per-validator claimable balances.
    mapping(address => uint256) private _claimable;

    constructor(
        IVoidTokenLike _token,
        IValidatorSetLike _validatorSet,
        address _admin
    ) {
        require(address(_token) != address(0), "token=0");
        require(address(_validatorSet) != address(0), "validatorSet=0");
        require(_admin != address(0), "admin=0");

        token = _token;
        validatorSet = _validatorSet;
        admin = _admin;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    /// @inheritdoc IRewardEngineLike
    function emissionsBudget() external pure override returns (uint256) {
        return EMISSIONS_BUDGET;
    }

    /// @inheritdoc IRewardEngineLike
    function pullEmission(uint256 amount) external override onlyAdmin {
        require(amount > 0, "amount=0");
        uint256 newTotal = totalEmitted + amount;
        require(newTotal <= EMISSIONS_BUDGET, "emissions cap");
        totalEmitted = newTotal;

        // NOTE:
        //  - This contract only tracks accounting.
        //  - Actual token funding (mint/transfer into this contract) is handled off-chain / by other contracts.
    }

    /// @inheritdoc IRewardEngineLike
    function claimable(address validator) external view override returns (uint256) {
        return _claimable[validator];
    }

    /// @notice Admin-only hook to credit a validator with a share of emitted rewards.
    /// @dev For now this is manual; later we can derive from voting power / epochs.
    function credit(address validator, uint256 amount) external onlyAdmin {
        require(validator != address(0), "validator=0");
        require(amount > 0, "amount=0");
        _claimable[validator] += amount;
    }

    /// @inheritdoc IRewardEngineLike
    function claim() external override returns (uint256) {
        address validator = msg.sender;
        uint256 amount = _claimable[validator];
        require(amount > 0, "nothing to claim");

        _claimable[validator] = 0;

        bool ok = token.transfer(validator, amount);
        require(ok, "transfer failed");

        return amount;
    }
}
