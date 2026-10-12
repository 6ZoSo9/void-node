// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/mainnet/BuyVoidPresaleFulfillmentV1.sol";

contract BuyVoidMockTokenV1 {
    mapping(address => uint256) public balanceOf;
    bool public failTransfers;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function setFailTransfers(bool value) external {
        failTransfers = value;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (failTransfers) return false;
        require(balanceOf[msg.sender] >= amount, "insufficient_balance");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        return true;
    }
}

contract BuyVoidUnauthorizedCallerV1 {
    function callFulfill(
        BuyVoidPresaleFulfillmentV1 registry,
        bytes32 paymentDeliveryId,
        address recipient,
        uint256 amountAtoms
    ) external {
        registry.fulfill(paymentDeliveryId, recipient, amountAtoms);
    }
}

contract BuyVoidPresaleFulfillmentV1Test {
    uint256 internal constant CAP = 10_000_000 ether;
    bytes32 internal constant PAYMENT_A = keccak256("base:tx-a:0");
    bytes32 internal constant PAYMENT_B = keccak256("ethereum:tx-b:7");

    function _assert(bool condition, string memory reason) internal pure {
        require(condition, reason);
    }

    function _deploy()
        internal
        returns (BuyVoidMockTokenV1 token, BuyVoidPresaleFulfillmentV1 registry)
    {
        token = new BuyVoidMockTokenV1();
        registry = new BuyVoidPresaleFulfillmentV1(address(token), address(this), address(0));
        token.mint(address(registry), CAP);
    }

    function test_firstFulfillmentTransfersAndRecordsExactIdentity() public {
        (BuyVoidMockTokenV1 token, BuyVoidPresaleFulfillmentV1 registry) = _deploy();
        address recipient = address(0xBEEF);
        uint256 amount = 2 ether;

        registry.fulfill(PAYMENT_A, recipient, amount);

        (bool fulfilled, address storedRecipient, uint256 storedAmount, uint256 blockNumber) =
            registry.getFulfillment(PAYMENT_A);
        _assert(fulfilled, "not_fulfilled");
        _assert(storedRecipient == recipient, "recipient_mismatch");
        _assert(storedAmount == amount, "amount_mismatch");
        _assert(blockNumber == block.number, "block_mismatch");
        _assert(token.balanceOf(recipient) == amount, "recipient_balance_mismatch");
        _assert(registry.localFulfilledAtoms() == amount, "local_total_mismatch");
        _assert(registry.totalFulfilledAtoms() == amount, "total_mismatch");
        _assert(registry.remainingInventoryAtoms() == CAP - amount, "remaining_mismatch");
    }

    function test_duplicatePaymentCannotTransferAgainEvenWithChangedRecipientOrAmount() public {
        (BuyVoidMockTokenV1 token, BuyVoidPresaleFulfillmentV1 registry) = _deploy();
        registry.fulfill(PAYMENT_A, address(0xA11CE), 2 ether);

        uint256 beforeBalance = token.balanceOf(address(0xCAFE));
        try registry.fulfill(PAYMENT_A, address(0xCAFE), 3 ether) {
            revert("duplicate_accepted");
        } catch {}

        _assert(token.balanceOf(address(0xCAFE)) == beforeBalance, "duplicate_transferred");
        _assert(registry.totalFulfilledAtoms() == 2 ether, "duplicate_changed_total");
    }

    function test_onlyConfiguredFulfillerCanMutate() public {
        (, BuyVoidPresaleFulfillmentV1 registry) = _deploy();
        BuyVoidUnauthorizedCallerV1 caller = new BuyVoidUnauthorizedCallerV1();

        try caller.callFulfill(registry, PAYMENT_A, address(0xBEEF), 1 ether) {
            revert("unauthorized_accepted");
        } catch {}

        _assert(!registry.isFulfilled(PAYMENT_A), "unauthorized_claimed_payment");
        _assert(registry.totalFulfilledAtoms() == 0, "unauthorized_changed_total");
    }

    function test_failedTokenTransferRevertsClaimAndAllowsExactRetry() public {
        (BuyVoidMockTokenV1 token, BuyVoidPresaleFulfillmentV1 registry) = _deploy();
        token.setFailTransfers(true);

        try registry.fulfill(PAYMENT_A, address(0xBEEF), 2 ether) {
            revert("failed_transfer_accepted");
        } catch {}

        _assert(!registry.isFulfilled(PAYMENT_A), "failed_transfer_claimed_payment");
        _assert(registry.totalFulfilledAtoms() == 0, "failed_transfer_changed_total");

        token.setFailTransfers(false);
        registry.fulfill(PAYMENT_A, address(0xBEEF), 2 ether);
        _assert(registry.isFulfilled(PAYMENT_A), "retry_not_fulfilled");
        _assert(registry.totalFulfilledAtoms() == 2 ether, "retry_total_mismatch");
    }

    function test_inventoryCapIsExactTenMillionVoidAtoms() public {
        (BuyVoidMockTokenV1 token, BuyVoidPresaleFulfillmentV1 registry) = _deploy();
        registry.fulfill(PAYMENT_A, address(0xBEEF), CAP);

        token.mint(address(registry), 1 ether);
        try registry.fulfill(PAYMENT_B, address(0xCAFE), 1) {
            revert("cap_exceeded");
        } catch {}

        _assert(registry.totalFulfilledAtoms() == CAP, "cap_total_mismatch");
        _assert(registry.remainingInventoryAtoms() == 0, "cap_remaining_nonzero");
        _assert(!registry.isFulfilled(PAYMENT_B), "cap_failure_claimed_payment");
    }

    function test_successorPreservesPaymentIdentityAndInventoryAcrossGenerations() public {
        BuyVoidMockTokenV1 token = new BuyVoidMockTokenV1();
        BuyVoidPresaleFulfillmentV1 first =
            new BuyVoidPresaleFulfillmentV1(address(token), address(this), address(0));
        token.mint(address(first), 4 ether);
        first.fulfill(PAYMENT_A, address(0xA11CE), 2 ether);

        BuyVoidPresaleFulfillmentV1 successor =
            new BuyVoidPresaleFulfillmentV1(address(token), address(this), address(first));
        token.mint(address(successor), CAP);

        _assert(successor.isFulfilled(PAYMENT_A), "successor_lost_payment_identity");
        _assert(successor.totalFulfilledAtoms() == 2 ether, "successor_lost_history");

        try successor.fulfill(PAYMENT_A, address(0xCAFE), 1 ether) {
            revert("successor_replayed_payment");
        } catch {}

        successor.fulfill(PAYMENT_B, address(0xBEEF), 3 ether);
        _assert(successor.totalFulfilledAtoms() == 5 ether, "successor_total_mismatch");

        (bool fulfilled, address recipient, uint256 amount,) = successor.getFulfillment(PAYMENT_A);
        _assert(fulfilled, "predecessor_lookup_not_fulfilled");
        _assert(recipient == address(0xA11CE), "predecessor_recipient_mismatch");
        _assert(amount == 2 ether, "predecessor_amount_mismatch");
    }

    function test_successorRejectsDifferentTokenLineage() public {
        BuyVoidMockTokenV1 tokenA = new BuyVoidMockTokenV1();
        BuyVoidMockTokenV1 tokenB = new BuyVoidMockTokenV1();
        BuyVoidPresaleFulfillmentV1 first =
            new BuyVoidPresaleFulfillmentV1(address(tokenA), address(this), address(0));

        try new BuyVoidPresaleFulfillmentV1(address(tokenB), address(this), address(first)) {
            revert("mismatched_lineage_accepted");
        } catch {}
    }

    function test_zeroInputsFailClosed() public {
        (BuyVoidMockTokenV1 token, BuyVoidPresaleFulfillmentV1 registry) = _deploy();
        uint256 beforeBalance = token.balanceOf(address(0xBEEF));

        try registry.fulfill(bytes32(0), address(0xBEEF), 1 ether) {
            revert("zero_payment_id_accepted");
        } catch {}
        try registry.fulfill(PAYMENT_A, address(0), 1 ether) {
            revert("zero_recipient_accepted");
        } catch {}
        try registry.fulfill(PAYMENT_A, address(0xBEEF), 0) {
            revert("zero_amount_accepted");
        } catch {}

        _assert(token.balanceOf(address(0xBEEF)) == beforeBalance, "zero_input_transferred");
        _assert(registry.totalFulfilledAtoms() == 0, "zero_input_changed_total");
    }
}
