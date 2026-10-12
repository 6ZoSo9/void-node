// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBtcVoidCanonicalVoidTokenV1 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount)
        external
        returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Fixed Chain-2050 hashlock settlement primitive for BTC/VOID Phase-0.
/// @dev Source/compiler contract only until a separately reviewed deployment gate exists.
contract BtcVoidHashlockSettlementV1 {
    address public constant voidToken =
        0x470075B85352Eb86F7d089FB9ba88945f12AAd94;

    enum SwapState {
        None,
        Locked,
        Claimed,
        Refunded
    }

    struct Swap {
        bytes32 hashlock;
        address beneficiary;
        address refundAuthority;
        uint256 amountAtoms;
        uint256 refundAfterUnix;
        SwapState state;
    }

    error ZeroSwapId();
    error ZeroHashlock();
    error ZeroAddress();
    error BeneficiaryEqualsRefundAuthority();
    error InvalidAmount();
    error RefundDeadlineNotFuture();
    error SwapAlreadyExists(bytes32 swapId);
    error SwapNotFound(bytes32 swapId);
    error SwapTerminal(bytes32 swapId, uint8 state);
    error NotBeneficiary();
    error NotRefundAuthority();
    error InvalidPreimageLength(uint256 observedLength);
    error HashlockMismatch();
    error ClaimDeadlineReached(uint256 refundAfterUnix, uint256 observedUnix);
    error RefundDeadlineNotReached(uint256 refundAfterUnix, uint256 observedUnix);
    error TokenTransferFailed();
    error TokenBalanceDeltaMismatch(uint256 expectedBalance, uint256 observedBalance);

    mapping(bytes32 => Swap) private _swaps;

    event Locked(
        bytes32 indexed swapId,
        bytes32 indexed hashlock,
        address indexed beneficiary,
        address refundAuthority,
        uint256 amountAtoms,
        uint256 refundAfterUnix,
        uint256 lockedAtUnix
    );

    event Claimed(
        bytes32 indexed swapId,
        address indexed beneficiary,
        bytes32 indexed hashlock,
        bytes32 preimage,
        uint256 amountAtoms,
        uint256 claimedAtUnix
    );

    event Refunded(
        bytes32 indexed swapId,
        address indexed refundAuthority,
        uint256 amountAtoms,
        uint256 refundedAtUnix
    );

    function lock(
        bytes32 swapId,
        bytes32 hashlock,
        address beneficiary,
        uint256 amountAtoms,
        uint256 refundAfterUnix
    ) external {
        if (swapId == bytes32(0)) revert ZeroSwapId();
        if (hashlock == bytes32(0)) revert ZeroHashlock();
        if (beneficiary == address(0)) revert ZeroAddress();
        if (beneficiary == msg.sender) revert BeneficiaryEqualsRefundAuthority();
        if (amountAtoms == 0) revert InvalidAmount();
        if (refundAfterUnix <= block.timestamp) revert RefundDeadlineNotFuture();
        if (_swaps[swapId].state != SwapState.None) {
            revert SwapAlreadyExists(swapId);
        }

        IBtcVoidCanonicalVoidTokenV1 token = _token();
        uint256 balanceBefore = token.balanceOf(address(this));

        _swaps[swapId] = Swap({
            hashlock: hashlock,
            beneficiary: beneficiary,
            refundAuthority: msg.sender,
            amountAtoms: amountAtoms,
            refundAfterUnix: refundAfterUnix,
            state: SwapState.Locked
        });

        bool transferred = token.transferFrom(
            msg.sender,
            address(this),
            amountAtoms
        );
        if (!transferred) revert TokenTransferFailed();

        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 expectedBalance = balanceBefore + amountAtoms;
        if (balanceAfter != expectedBalance) {
            revert TokenBalanceDeltaMismatch(expectedBalance, balanceAfter);
        }

        emit Locked(
            swapId,
            hashlock,
            beneficiary,
            msg.sender,
            amountAtoms,
            refundAfterUnix,
            block.timestamp
        );
    }

    function claim(bytes32 swapId, bytes calldata preimage) external {
        Swap storage swap = _lockedSwap(swapId);
        if (msg.sender != swap.beneficiary) revert NotBeneficiary();
        if (block.timestamp >= swap.refundAfterUnix) {
            revert ClaimDeadlineReached(swap.refundAfterUnix, block.timestamp);
        }
        if (preimage.length != 32) {
            revert InvalidPreimageLength(preimage.length);
        }

        bytes32 preimageWord;
        assembly {
            preimageWord := calldataload(preimage.offset)
        }
        bytes32 observedHashlock = sha256(abi.encodePacked(preimageWord));
        if (observedHashlock != swap.hashlock) revert HashlockMismatch();

        address beneficiary = swap.beneficiary;
        uint256 amountAtoms = swap.amountAtoms;
        bytes32 hashlock = swap.hashlock;

        IBtcVoidCanonicalVoidTokenV1 token = _token();
        uint256 balanceBefore = token.balanceOf(address(this));
        if (balanceBefore < amountAtoms) {
            revert TokenBalanceDeltaMismatch(amountAtoms, balanceBefore);
        }

        swap.state = SwapState.Claimed;

        bool transferred = token.transfer(beneficiary, amountAtoms);
        if (!transferred) revert TokenTransferFailed();

        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 expectedBalance = balanceBefore - amountAtoms;
        if (balanceAfter != expectedBalance) {
            revert TokenBalanceDeltaMismatch(expectedBalance, balanceAfter);
        }

        emit Claimed(
            swapId,
            beneficiary,
            hashlock,
            preimageWord,
            amountAtoms,
            block.timestamp
        );
    }

    function refund(bytes32 swapId) external {
        Swap storage swap = _lockedSwap(swapId);
        if (msg.sender != swap.refundAuthority) revert NotRefundAuthority();
        if (block.timestamp < swap.refundAfterUnix) {
            revert RefundDeadlineNotReached(
                swap.refundAfterUnix,
                block.timestamp
            );
        }

        address refundAuthority = swap.refundAuthority;
        uint256 amountAtoms = swap.amountAtoms;

        IBtcVoidCanonicalVoidTokenV1 token = _token();
        uint256 balanceBefore = token.balanceOf(address(this));
        if (balanceBefore < amountAtoms) {
            revert TokenBalanceDeltaMismatch(amountAtoms, balanceBefore);
        }

        swap.state = SwapState.Refunded;

        bool transferred = token.transfer(refundAuthority, amountAtoms);
        if (!transferred) revert TokenTransferFailed();

        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 expectedBalance = balanceBefore - amountAtoms;
        if (balanceAfter != expectedBalance) {
            revert TokenBalanceDeltaMismatch(expectedBalance, balanceAfter);
        }

        emit Refunded(
            swapId,
            refundAuthority,
            amountAtoms,
            block.timestamp
        );
    }

    function getSwap(bytes32 swapId)
        external
        view
        returns (
            bytes32 hashlock,
            address beneficiary,
            address refundAuthority,
            uint256 amountAtoms,
            uint256 refundAfterUnix,
            SwapState state
        )
    {
        Swap storage swap = _swaps[swapId];
        return (
            swap.hashlock,
            swap.beneficiary,
            swap.refundAuthority,
            swap.amountAtoms,
            swap.refundAfterUnix,
            swap.state
        );
    }

    function stateOf(bytes32 swapId) external view returns (SwapState) {
        return _swaps[swapId].state;
    }

    function _lockedSwap(bytes32 swapId) internal view returns (Swap storage swap) {
        swap = _swaps[swapId];
        if (swap.state == SwapState.None) revert SwapNotFound(swapId);
        if (swap.state != SwapState.Locked) {
            revert SwapTerminal(swapId, uint8(swap.state));
        }
    }

    function _token()
        private
        pure
        returns (IBtcVoidCanonicalVoidTokenV1)
    {
        return IBtcVoidCanonicalVoidTokenV1(voidToken);
    }
}
