// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/epoch2/VoidEpoch2TreasuryCustodyV1.sol";
import "../../contracts/epoch2/VoidEpoch2PresaleFulfillmentV1.sol";

interface Vm {
    function etch(address target, bytes calldata code) external;
    function prank(address sender) external;
}

contract Epoch2MockVoidTokenV1 {
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

contract VoidEpoch2CustodyContractsV1Test {
    Vm internal constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address internal constant TOKEN =
        0x470075B85352Eb86F7d089FB9ba88945f12AAd94;
    address internal constant TREASURY_AUTHORITY =
        0x54ded2DAA618a257093556A5F54c43805b9BD516;
    address internal constant PRESALE_FULFILLER =
        0x0F0B8Aa14e1c9764fa8E4FA8b38fd3D3b8C2498A;

    bytes32 internal constant ACTION_A = keccak256("epoch2:treasury:action-a");
    bytes32 internal constant ACTION_B = keccak256("epoch2:treasury:action-b");
    bytes32 internal constant PAYMENT_A = keccak256("epoch2:presale:payment-a");
    bytes32 internal constant PAYMENT_B = keccak256("epoch2:presale:payment-b");

    function _assert(bool condition, string memory reason) internal pure {
        require(condition, reason);
    }

    function _installCanonicalToken() internal returns (Epoch2MockVoidTokenV1 token) {
        Epoch2MockVoidTokenV1 implementation = new Epoch2MockVoidTokenV1();
        vm.etch(TOKEN, address(implementation).code);
        token = Epoch2MockVoidTokenV1(TOKEN);
    }

    function test_constantsBindCanonicalTokenEpochAndCeremonyRoles() public {
        VoidEpoch2TreasuryCustodyV1 treasury = new VoidEpoch2TreasuryCustodyV1();
        VoidEpoch2PresaleFulfillmentV1 presale = new VoidEpoch2PresaleFulfillmentV1();

        _assert(treasury.voidToken() == TOKEN, "treasury_token");
        _assert(treasury.authority() == TREASURY_AUTHORITY, "treasury_authority");
        _assert(treasury.executionEpoch() == 2, "treasury_epoch");

        _assert(presale.voidToken() == TOKEN, "presale_token");
        _assert(presale.fulfiller() == PRESALE_FULFILLER, "presale_fulfiller");
        _assert(presale.executionEpoch() == 2, "presale_epoch");
        _assert(presale.maxInventoryAtoms() == 10_000_000 ether, "presale_cap");
    }

    function test_treasuryReleaseIsCeremonyBoundAndReplaySafe() public {
        Epoch2MockVoidTokenV1 token = _installCanonicalToken();
        VoidEpoch2TreasuryCustodyV1 treasury = new VoidEpoch2TreasuryCustodyV1();

        token.mint(address(treasury), 100 ether);

        try treasury.release(ACTION_A, address(0xBEEF), 10 ether) {
            revert("unauthorized_release");
        } catch {}

        _assert(!treasury.executed(ACTION_A), "unauthorized_action_recorded");
        _assert(token.balanceOf(address(0xBEEF)) == 0, "unauthorized_value_moved");

        vm.prank(TREASURY_AUTHORITY);
        treasury.release(ACTION_A, address(0xBEEF), 10 ether);

        _assert(treasury.executed(ACTION_A), "authorized_action_missing");
        _assert(token.balanceOf(address(0xBEEF)) == 10 ether, "authorized_value_missing");

        vm.prank(TREASURY_AUTHORITY);
        try treasury.release(ACTION_A, address(0xCAFE), 1 ether) {
            revert("duplicate_release");
        } catch {}

        _assert(token.balanceOf(address(0xCAFE)) == 0, "duplicate_value_moved");
    }

    function test_treasuryFailedTransferRollsBackActionIdentity() public {
        Epoch2MockVoidTokenV1 token = _installCanonicalToken();
        VoidEpoch2TreasuryCustodyV1 treasury = new VoidEpoch2TreasuryCustodyV1();

        token.mint(address(treasury), 100 ether);
        token.setFailTransfers(true);

        vm.prank(TREASURY_AUTHORITY);
        try treasury.release(ACTION_B, address(0xBEEF), 10 ether) {
            revert("failed_transfer_accepted");
        } catch {}

        _assert(!treasury.executed(ACTION_B), "failed_transfer_burned_action_id");
        _assert(token.balanceOf(address(0xBEEF)) == 0, "failed_transfer_moved_value");

        token.setFailTransfers(false);
        vm.prank(TREASURY_AUTHORITY);
        treasury.release(ACTION_B, address(0xBEEF), 10 ether);

        _assert(treasury.executed(ACTION_B), "retry_action_missing");
        _assert(token.balanceOf(address(0xBEEF)) == 10 ether, "retry_value_missing");
    }

    function test_presaleIsCeremonyBoundPaymentKeyedAndInventoryCapped() public {
        Epoch2MockVoidTokenV1 token = _installCanonicalToken();
        VoidEpoch2PresaleFulfillmentV1 presale = new VoidEpoch2PresaleFulfillmentV1();
        uint256 cap = presale.maxInventoryAtoms();

        token.mint(address(presale), cap);

        try presale.fulfill(PAYMENT_A, address(0xBEEF), 2 ether) {
            revert("unauthorized_fulfillment");
        } catch {}

        _assert(!presale.isFulfilled(PAYMENT_A), "unauthorized_payment_claimed");

        vm.prank(PRESALE_FULFILLER);
        presale.fulfill(PAYMENT_A, address(0xBEEF), 2 ether);

        _assert(presale.isFulfilled(PAYMENT_A), "payment_not_fulfilled");
        _assert(presale.totalFulfilledAtoms() == 2 ether, "fulfilled_total");
        _assert(presale.remainingInventoryAtoms() == cap - 2 ether, "remaining_inventory");
        _assert(token.balanceOf(address(0xBEEF)) == 2 ether, "recipient_balance");

        vm.prank(PRESALE_FULFILLER);
        try presale.fulfill(PAYMENT_A, address(0xCAFE), 3 ether) {
            revert("duplicate_payment_accepted");
        } catch {}

        _assert(token.balanceOf(address(0xCAFE)) == 0, "duplicate_payment_moved_value");

        vm.prank(PRESALE_FULFILLER);
        try presale.fulfill(PAYMENT_B, address(0xCAFE), cap) {
            revert("inventory_cap_exceeded");
        } catch {}

        _assert(!presale.isFulfilled(PAYMENT_B), "cap_failure_claimed_payment");
    }

    function test_presaleFailedTransferRollsBackPaymentIdentity() public {
        Epoch2MockVoidTokenV1 token = _installCanonicalToken();
        VoidEpoch2PresaleFulfillmentV1 presale = new VoidEpoch2PresaleFulfillmentV1();

        token.mint(address(presale), 10 ether);
        token.setFailTransfers(true);

        vm.prank(PRESALE_FULFILLER);
        try presale.fulfill(PAYMENT_B, address(0xBEEF), 2 ether) {
            revert("failed_transfer_accepted");
        } catch {}

        _assert(!presale.isFulfilled(PAYMENT_B), "failed_transfer_claimed_payment");
        _assert(presale.totalFulfilledAtoms() == 0, "failed_transfer_changed_total");

        token.setFailTransfers(false);
        vm.prank(PRESALE_FULFILLER);
        presale.fulfill(PAYMENT_B, address(0xBEEF), 2 ether);

        _assert(presale.isFulfilled(PAYMENT_B), "retry_payment_not_fulfilled");
        _assert(presale.totalFulfilledAtoms() == 2 ether, "retry_total");
    }
}
