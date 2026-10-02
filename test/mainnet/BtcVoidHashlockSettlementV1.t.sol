// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/mainnet/BtcVoidHashlockSettlementV1.sol";

interface VmBtcVoidHashlockV1 {
    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function etch(address target, bytes calldata code) external;
    function prank(address sender) external;
    function warp(uint256 timestamp) external;
    function recordLogs() external;
    function getRecordedLogs() external returns (Log[] memory logs);
}

contract BtcVoidHashlockMockTokenV1 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    bool public failTransfer;
    bool public failTransferFrom;
    bool public skipTransfer;
    bool public skipTransferFrom;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function setFailTransfer(bool value) external {
        failTransfer = value;
    }

    function setFailTransferFrom(bool value) external {
        failTransferFrom = value;
    }

    function setSkipTransfer(bool value) external {
        skipTransfer = value;
    }

    function setSkipTransferFrom(bool value) external {
        skipTransferFrom = value;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (failTransfer) return false;
        if (skipTransfer) return true;
        uint256 balance = balanceOf[msg.sender];
        require(balance >= amount, "mock: balance");
        unchecked {
            balanceOf[msg.sender] = balance - amount;
        }
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount)
        external
        returns (bool)
    {
        if (failTransferFrom) return false;
        if (skipTransferFrom) return true;
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "mock: allowance");
        uint256 balance = balanceOf[from];
        require(balance >= amount, "mock: balance");
        unchecked {
            allowance[from][msg.sender] = allowed - amount;
            balanceOf[from] = balance - amount;
        }
        balanceOf[to] += amount;
        return true;
    }
}

contract BtcVoidHashlockSettlementV1Test {
    VmBtcVoidHashlockV1 internal constant vm =
        VmBtcVoidHashlockV1(address(uint160(uint256(keccak256("hevm cheat code")))));

    address internal constant TOKEN =
        0x470075B85352Eb86F7d089FB9ba88945f12AAd94;
    address internal constant FUNDER = address(0xF00D);
    address internal constant BENEFICIARY = address(0xBEEF);
    address internal constant OTHER = address(0xCAFE);
    uint256 internal constant AMOUNT = 25 ether;
    uint256 internal constant START = 1_900_000_000;

    bytes32 internal constant SWAP_A = keccak256("btc-void:swap:a");
    bytes32 internal constant SWAP_B = keccak256("btc-void:swap:b");
    bytes32 internal constant PREIMAGE =
        0x1111111111111111111111111111111111111111111111111111111111111111;
    bytes32 internal constant PREIMAGE_B =
        0x2222222222222222222222222222222222222222222222222222222222222222;

    function _assert(bool condition, string memory reason) internal pure {
        require(condition, reason);
    }

    function _token() internal pure returns (BtcVoidHashlockMockTokenV1) {
        return BtcVoidHashlockMockTokenV1(TOKEN);
    }

    function _hashlock() internal pure returns (bytes32) {
        return sha256(abi.encodePacked(PREIMAGE));
    }

    function _preimageBytes() internal pure returns (bytes memory) {
        return abi.encodePacked(PREIMAGE);
    }

    function _preimageBytes(bytes32 preimage)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(preimage);
    }

    function _hashlock(bytes32 preimage) internal pure returns (bytes32) {
        return sha256(abi.encodePacked(preimage));
    }

    function _deploy()
        internal
        returns (BtcVoidHashlockSettlementV1 settlement)
    {
        vm.etch(TOKEN, type(BtcVoidHashlockMockTokenV1).runtimeCode);
        vm.warp(START);
        settlement = new BtcVoidHashlockSettlementV1();
        _token().mint(FUNDER, 1_000 ether);
    }

    function _callAs(address sender, address target, bytes memory data)
        internal
        returns (bool ok)
    {
        vm.prank(sender);
        (ok,) = target.call(data);
    }

    function _approve(BtcVoidHashlockSettlementV1 settlement, uint256 amount)
        internal
    {
        vm.prank(FUNDER);
        _token().approve(address(settlement), amount);
    }

    function _lock(
        BtcVoidHashlockSettlementV1 settlement,
        bytes32 swapId,
        uint256 deadline
    ) internal {
        _approve(settlement, AMOUNT);
        bytes32 hashlock = _hashlock();
        vm.prank(FUNDER);
        settlement.lock(
            swapId,
            hashlock,
            BENEFICIARY,
            AMOUNT,
            deadline
        );
    }

    function test_lockBindsFundingCallerAndExactCanonicalTokenAmount() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        uint256 deadline = START + 1000;

        _lock(settlement, SWAP_A, deadline);

        (
            bytes32 hashlock,
            address beneficiary,
            address refundAuthority,
            uint256 amountAtoms,
            uint256 refundAfterUnix,
            BtcVoidHashlockSettlementV1.SwapState state
        ) = settlement.getSwap(SWAP_A);

        _assert(settlement.voidToken() == TOKEN, "canonical_token");
        _assert(hashlock == _hashlock(), "hashlock");
        _assert(beneficiary == BENEFICIARY, "beneficiary");
        _assert(refundAuthority == FUNDER, "refund_authority");
        _assert(amountAtoms == AMOUNT, "amount");
        _assert(refundAfterUnix == deadline, "deadline");
        _assert(
            state == BtcVoidHashlockSettlementV1.SwapState.Locked,
            "locked_state"
        );
        _assert(_token().balanceOf(address(settlement)) == AMOUNT, "escrow");
        _assert(_token().balanceOf(FUNDER) == 1_000 ether - AMOUNT, "funder");
    }

    function test_claimRequiresBeneficiaryExact32BytePreimageAndPreDeadline()
        public
    {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        _lock(settlement, SWAP_A, START + 1000);

        bool otherOk = _callAs(
            OTHER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.claim,
                (SWAP_A, _preimageBytes())
            )
        );
        _assert(!otherOk, "non_beneficiary_claim_accepted");

        bytes memory shortPreimage = hex"11";
        bool shortOk = _callAs(
            BENEFICIARY,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.claim,
                (SWAP_A, shortPreimage)
            )
        );
        _assert(!shortOk, "short_preimage_accepted");

        bytes memory wrong = new bytes(32);
        wrong[31] = 0x22;
        bool wrongOk = _callAs(
            BENEFICIARY,
            address(settlement),
            abi.encodeCall(BtcVoidHashlockSettlementV1.claim, (SWAP_A, wrong))
        );
        _assert(!wrongOk, "wrong_preimage_accepted");

        vm.prank(BENEFICIARY);
        settlement.claim(SWAP_A, _preimageBytes());

        _assert(
            settlement.stateOf(SWAP_A) ==
                BtcVoidHashlockSettlementV1.SwapState.Claimed,
            "claimed_state"
        );
        _assert(_token().balanceOf(BENEFICIARY) == AMOUNT, "beneficiary_paid");
        _assert(_token().balanceOf(address(settlement)) == 0, "escrow_empty");
    }

    function test_twoLiveSwapsRemainStateAndEscrowIsolated() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        uint256 deadlineA = START + 1000;
        uint256 deadlineB = START + 2000;
        bytes32 hashlockA = _hashlock(PREIMAGE);
        bytes32 hashlockB = _hashlock(PREIMAGE_B);

        _approve(settlement, AMOUNT * 2);
        vm.prank(FUNDER);
        settlement.lock(
            SWAP_A,
            hashlockA,
            BENEFICIARY,
            AMOUNT,
            deadlineA
        );
        vm.prank(FUNDER);
        settlement.lock(
            SWAP_B,
            hashlockB,
            OTHER,
            AMOUNT,
            deadlineB
        );

        _assert(
            _token().balanceOf(address(settlement)) == AMOUNT * 2,
            "two_swap_escrow"
        );
        _assert(
            _token().balanceOf(FUNDER) == 1_000 ether - (AMOUNT * 2),
            "two_swap_funder_debit"
        );

        (
            bytes32 beforeHashlockB,
            address beforeBeneficiaryB,
            address beforeRefundAuthorityB,
            uint256 beforeAmountB,
            uint256 beforeDeadlineB,
            BtcVoidHashlockSettlementV1.SwapState beforeStateB
        ) = settlement.getSwap(SWAP_B);

        vm.prank(BENEFICIARY);
        settlement.claim(SWAP_A, _preimageBytes());

        (
            bytes32 afterHashlockB,
            address afterBeneficiaryB,
            address afterRefundAuthorityB,
            uint256 afterAmountB,
            uint256 afterDeadlineB,
            BtcVoidHashlockSettlementV1.SwapState afterStateB
        ) = settlement.getSwap(SWAP_B);

        _assert(
            settlement.stateOf(SWAP_A) ==
                BtcVoidHashlockSettlementV1.SwapState.Claimed,
            "swap_a_not_claimed"
        );
        _assert(beforeHashlockB == afterHashlockB, "swap_b_hashlock_changed");
        _assert(
            beforeBeneficiaryB == afterBeneficiaryB,
            "swap_b_beneficiary_changed"
        );
        _assert(
            beforeRefundAuthorityB == afterRefundAuthorityB,
            "swap_b_refund_authority_changed"
        );
        _assert(beforeAmountB == afterAmountB, "swap_b_amount_changed");
        _assert(beforeDeadlineB == afterDeadlineB, "swap_b_deadline_changed");
        _assert(
            beforeStateB == BtcVoidHashlockSettlementV1.SwapState.Locked &&
                afterStateB == BtcVoidHashlockSettlementV1.SwapState.Locked,
            "swap_b_state_changed"
        );
        _assert(afterHashlockB == hashlockB, "swap_b_hashlock_wrong");
        _assert(afterBeneficiaryB == OTHER, "swap_b_beneficiary_wrong");
        _assert(afterRefundAuthorityB == FUNDER, "swap_b_refund_authority_wrong");
        _assert(afterAmountB == AMOUNT, "swap_b_amount_wrong");
        _assert(afterDeadlineB == deadlineB, "swap_b_deadline_wrong");
        _assert(
            _token().balanceOf(address(settlement)) == AMOUNT,
            "swap_a_claim_consumed_swap_b_escrow"
        );
        _assert(_token().balanceOf(BENEFICIARY) == AMOUNT, "swap_a_payout_wrong");
        _assert(_token().balanceOf(OTHER) == 0, "swap_b_beneficiary_paid_early");

        vm.warp(deadlineB);
        vm.prank(FUNDER);
        settlement.refund(SWAP_B);

        _assert(
            settlement.stateOf(SWAP_B) ==
                BtcVoidHashlockSettlementV1.SwapState.Refunded,
            "swap_b_not_refunded"
        );
        _assert(_token().balanceOf(address(settlement)) == 0, "final_escrow_not_zero");
        _assert(_token().balanceOf(OTHER) == 0, "swap_b_beneficiary_paid");
        _assert(
            _token().balanceOf(FUNDER) == 1_000 ether - AMOUNT,
            "swap_b_refund_wrong"
        );
    }

    function test_claimedEventExposesExactPreimageEvidence() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        bytes32 hashlock = _hashlock(PREIMAGE);
        _lock(settlement, SWAP_A, START + 1000);

        vm.recordLogs();
        vm.prank(BENEFICIARY);
        settlement.claim(SWAP_A, _preimageBytes());

        VmBtcVoidHashlockV1.Log[] memory logs = vm.getRecordedLogs();
        _assert(logs.length == 1, "claimed_log_count");
        _assert(logs[0].emitter == address(settlement), "claimed_emitter");
        _assert(logs[0].topics.length == 4, "claimed_topic_count");
        _assert(
            logs[0].topics[0] ==
                keccak256(
                    "Claimed(bytes32,address,bytes32,bytes32,uint256,uint256)"
                ),
            "claimed_topic0"
        );
        _assert(logs[0].topics[1] == SWAP_A, "claimed_swap_id");
        _assert(
            logs[0].topics[2] == bytes32(uint256(uint160(BENEFICIARY))),
            "claimed_beneficiary"
        );
        _assert(logs[0].topics[3] == hashlock, "claimed_hashlock");

        (
            bytes32 emittedPreimage,
            uint256 emittedAmount,
            uint256 emittedClaimedAt
        ) = abi.decode(logs[0].data, (bytes32, uint256, uint256));

        _assert(emittedPreimage == PREIMAGE, "claimed_preimage");
        _assert(emittedPreimage != PREIMAGE_B, "claimed_preimage_substitution");
        _assert(emittedAmount == AMOUNT, "claimed_amount");
        _assert(emittedClaimedAt == START, "claimed_timestamp");
        _assert(
            keccak256(logs[0].data) ==
                keccak256(abi.encode(PREIMAGE, AMOUNT, START)),
            "claimed_data_identity"
        );
    }

    function test_claimAtDeadlineFailsAndRefundAtDeadlineSucceeds() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        uint256 deadline = START + 1000;
        _lock(settlement, SWAP_A, deadline);
        vm.warp(deadline);

        bool claimOk = _callAs(
            BENEFICIARY,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.claim,
                (SWAP_A, _preimageBytes())
            )
        );
        _assert(!claimOk, "claim_at_deadline_accepted");

        vm.prank(FUNDER);
        settlement.refund(SWAP_A);

        _assert(
            settlement.stateOf(SWAP_A) ==
                BtcVoidHashlockSettlementV1.SwapState.Refunded,
            "refunded_state"
        );
        _assert(_token().balanceOf(FUNDER) == 1_000 ether, "refund_exact");
    }

    function test_refundRequiresBoundFundingCallerAndDeadline() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        uint256 deadline = START + 1000;
        _lock(settlement, SWAP_A, deadline);

        bool otherOk = _callAs(
            OTHER,
            address(settlement),
            abi.encodeCall(BtcVoidHashlockSettlementV1.refund, (SWAP_A))
        );
        _assert(!otherOk, "other_refund_accepted");

        bool earlyOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(BtcVoidHashlockSettlementV1.refund, (SWAP_A))
        );
        _assert(!earlyOk, "early_refund_accepted");

        vm.warp(deadline);
        vm.prank(FUNDER);
        settlement.refund(SWAP_A);
    }

    function test_terminalClaimCannotReplayOrRefund() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        _lock(settlement, SWAP_A, START + 1000);

        vm.prank(BENEFICIARY);
        settlement.claim(SWAP_A, _preimageBytes());

        bool replayOk = _callAs(
            BENEFICIARY,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.claim,
                (SWAP_A, _preimageBytes())
            )
        );
        _assert(!replayOk, "claim_replay_accepted");

        vm.warp(START + 1000);
        bool refundOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(BtcVoidHashlockSettlementV1.refund, (SWAP_A))
        );
        _assert(!refundOk, "refund_after_claim_accepted");

        _assert(_token().balanceOf(BENEFICIARY) == AMOUNT, "single_claim");
    }

    function test_terminalRefundCannotReplayOrClaim() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        uint256 deadline = START + 1000;
        _lock(settlement, SWAP_A, deadline);
        vm.warp(deadline);

        vm.prank(FUNDER);
        settlement.refund(SWAP_A);

        bool replayOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(BtcVoidHashlockSettlementV1.refund, (SWAP_A))
        );
        _assert(!replayOk, "refund_replay_accepted");

        bool claimOk = _callAs(
            BENEFICIARY,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.claim,
                (SWAP_A, _preimageBytes())
            )
        );
        _assert(!claimOk, "claim_after_refund_accepted");

        _assert(_token().balanceOf(FUNDER) == 1_000 ether, "single_refund");
    }

    function test_duplicateSwapIdAndInvalidLockParametersFailClosed() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        uint256 deadline = START + 1000;
        _lock(settlement, SWAP_A, deadline);
        _approve(settlement, AMOUNT * 8);

        bool duplicateOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.lock,
                (SWAP_A, _hashlock(), BENEFICIARY, AMOUNT, deadline)
            )
        );
        _assert(!duplicateOk, "duplicate_swap_accepted");

        bool zeroSwapOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.lock,
                (bytes32(0), _hashlock(), BENEFICIARY, AMOUNT, deadline)
            )
        );
        _assert(!zeroSwapOk, "zero_swap_accepted");

        bool zeroHashOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.lock,
                (SWAP_B, bytes32(0), BENEFICIARY, AMOUNT, deadline)
            )
        );
        _assert(!zeroHashOk, "zero_hashlock_accepted");

        bool zeroBeneficiaryOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.lock,
                (SWAP_B, _hashlock(), address(0), AMOUNT, deadline)
            )
        );
        _assert(!zeroBeneficiaryOk, "zero_beneficiary_accepted");

        bool sameRoleOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.lock,
                (SWAP_B, _hashlock(), FUNDER, AMOUNT, deadline)
            )
        );
        _assert(!sameRoleOk, "same_role_accepted");

        bool zeroAmountOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.lock,
                (SWAP_B, _hashlock(), BENEFICIARY, 0, deadline)
            )
        );
        _assert(!zeroAmountOk, "zero_amount_accepted");

        bool staleDeadlineOk = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.lock,
                (SWAP_B, _hashlock(), BENEFICIARY, AMOUNT, START)
            )
        );
        _assert(!staleDeadlineOk, "nonfuture_deadline_accepted");
    }

    function test_failedFundingTransferRollsBackLockState() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        _token().setFailTransferFrom(true);
        _approve(settlement, AMOUNT);

        bool ok = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.lock,
                (SWAP_A, _hashlock(), BENEFICIARY, AMOUNT, START + 1000)
            )
        );
        _assert(!ok, "failed_funding_accepted");
        _assert(
            settlement.stateOf(SWAP_A) ==
                BtcVoidHashlockSettlementV1.SwapState.None,
            "failed_funding_state_persisted"
        );
    }

    function test_failedClaimTransferRollsBackTerminalState() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        _lock(settlement, SWAP_A, START + 1000);
        _token().setFailTransfer(true);

        bool ok = _callAs(
            BENEFICIARY,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.claim,
                (SWAP_A, _preimageBytes())
            )
        );
        _assert(!ok, "failed_claim_transfer_accepted");
        _assert(
            settlement.stateOf(SWAP_A) ==
                BtcVoidHashlockSettlementV1.SwapState.Locked,
            "failed_claim_terminal_state_persisted"
        );
    }

    function test_failedRefundTransferRollsBackTerminalState() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        uint256 deadline = START + 1000;
        _lock(settlement, SWAP_A, deadline);
        vm.warp(deadline);
        _token().setFailTransfer(true);

        bool ok = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(BtcVoidHashlockSettlementV1.refund, (SWAP_A))
        );
        _assert(!ok, "failed_refund_transfer_accepted");
        _assert(
            settlement.stateOf(SWAP_A) ==
                BtcVoidHashlockSettlementV1.SwapState.Locked,
            "failed_refund_terminal_state_persisted"
        );
    }

    function test_trueButNoFundingTransferFailsExactBalanceDelta() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        _token().setSkipTransferFrom(true);
        _approve(settlement, AMOUNT);

        bool ok = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.lock,
                (SWAP_A, _hashlock(), BENEFICIARY, AMOUNT, START + 1000)
            )
        );
        _assert(!ok, "false_funding_delta_accepted");
        _assert(
            settlement.stateOf(SWAP_A) ==
                BtcVoidHashlockSettlementV1.SwapState.None,
            "false_funding_delta_state_persisted"
        );
        _assert(_token().balanceOf(address(settlement)) == 0, "false_funding_balance");
    }

    function test_trueButNoClaimTransferFailsExactBalanceDelta() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        _lock(settlement, SWAP_A, START + 1000);
        _token().setSkipTransfer(true);

        bool ok = _callAs(
            BENEFICIARY,
            address(settlement),
            abi.encodeCall(
                BtcVoidHashlockSettlementV1.claim,
                (SWAP_A, _preimageBytes())
            )
        );
        _assert(!ok, "false_claim_delta_accepted");
        _assert(
            settlement.stateOf(SWAP_A) ==
                BtcVoidHashlockSettlementV1.SwapState.Locked,
            "false_claim_delta_state_persisted"
        );
        _assert(
            _token().balanceOf(address(settlement)) == AMOUNT,
            "false_claim_delta_balance"
        );
    }

    function test_trueButNoRefundTransferFailsExactBalanceDelta() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();
        uint256 deadline = START + 1000;
        _lock(settlement, SWAP_A, deadline);
        vm.warp(deadline);
        _token().setSkipTransfer(true);

        bool ok = _callAs(
            FUNDER,
            address(settlement),
            abi.encodeCall(BtcVoidHashlockSettlementV1.refund, (SWAP_A))
        );
        _assert(!ok, "false_refund_delta_accepted");
        _assert(
            settlement.stateOf(SWAP_A) ==
                BtcVoidHashlockSettlementV1.SwapState.Locked,
            "false_refund_delta_state_persisted"
        );
        _assert(
            _token().balanceOf(address(settlement)) == AMOUNT,
            "false_refund_delta_balance"
        );
    }

    function test_noAdminOrWithdrawalSurface() public {
        BtcVoidHashlockSettlementV1 settlement = _deploy();

        (bool ownerOk,) = address(settlement).call(
            abi.encodeWithSignature("owner()")
        );
        (bool withdrawOk,) = address(settlement).call(
            abi.encodeWithSignature("withdraw(address,uint256)", OTHER, 1)
        );
        (bool rescueOk,) = address(settlement).call(
            abi.encodeWithSignature("rescue(address,uint256)", OTHER, 1)
        );
        (bool upgradeOk,) = address(settlement).call(
            abi.encodeWithSignature("upgradeTo(address)", OTHER)
        );

        _assert(!ownerOk, "owner_surface_present");
        _assert(!withdrawOk, "withdraw_surface_present");
        _assert(!rescueOk, "rescue_surface_present");
        _assert(!upgradeOk, "upgrade_surface_present");
    }
}
