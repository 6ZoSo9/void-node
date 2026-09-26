// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/epoch2/VoidEpoch2TokenV1.sol";

interface VmEpoch2TokenV1 {
    function etch(address target, bytes calldata code) external;
    function store(address target, bytes32 slot, bytes32 value) external;
    function prank(address sender) external;
}

contract VoidEpoch2TokenV1Test {
    VmEpoch2TokenV1 internal constant vm =
        VmEpoch2TokenV1(address(uint160(uint256(keccak256("hevm cheat code")))));

    address internal constant TOKEN =
        0x470075B85352Eb86F7d089FB9ba88945f12AAd94;
    address internal constant OWNER =
        0x54ded2DAA618a257093556A5F54c43805b9BD516;
    address internal constant LEGACY_OWNER =
        0x0d66fCDf95d38f7Db6B4206BF183f34cD816C2AA;

    address internal constant TREASURY =
        0x554eCc7be6f0b7cC3d1c578c2BB848e535c02514;
    address internal constant STAKING =
        0x77DFEedD19A4741f299C902AD5bBe0DE917a9e59;
    address internal constant PRESALE =
        0xa40a43ADfd174F88309173cB3Daa6E09C10154a7;

    uint256 internal constant TREASURY_BALANCE = 323_207_333 ether;
    uint256 internal constant STAKING_BALANCE = 126_000 ether;
    uint256 internal constant PRESALE_BALANCE = 10_000_000 ether;

    address internal constant RECIPIENT = address(0xBEEF);
    address internal constant SPENDER = address(0xCAFE);

    function _assert(bool condition, string memory reason) internal pure {
        require(condition, reason);
    }

    function _eq(string memory left, string memory right)
        internal
        pure
        returns (bool)
    {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }

    function _mappingKey(address account, uint256 slot)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(account, slot));
    }

    function _nestedMappingKey(
        address outer,
        address inner,
        uint256 slot
    ) internal pure returns (bytes32) {
        bytes32 outerKey = keccak256(abi.encode(outer, slot));
        return keccak256(abi.encode(inner, outerKey));
    }

    function _installFrozenState() internal returns (VoidEpoch2TokenV1 token) {
        vm.etch(TOKEN, type(VoidEpoch2TokenV1).runtimeCode);

        // slot 0 = totalSupply
        vm.store(
            TOKEN,
            bytes32(uint256(0)),
            bytes32(VoidEpoch2TokenV1(TOKEN).PREMINE())
        );

        // slot 1 = balanceOf mapping root
        vm.store(
            TOKEN,
            _mappingKey(TREASURY, 1),
            bytes32(TREASURY_BALANCE)
        );
        vm.store(
            TOKEN,
            _mappingKey(STAKING, 1),
            bytes32(STAKING_BALANCE)
        );
        vm.store(
            TOKEN,
            _mappingKey(PRESALE, 1),
            bytes32(PRESALE_BALANCE)
        );

        token = VoidEpoch2TokenV1(TOKEN);
    }

    function test_metadataAndAuthorityMatchObservedLegacySurface() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        _assert(_eq(token.name(), "VoidStones"), "name");
        _assert(_eq(token.symbol(), "VOID"), "symbol");
        _assert(token.decimals() == 18, "decimals");
        _assert(token.PREMINE() == 333_333_333 ether, "premine");
        _assert(token.MAX_SUPPLY() == 666_666_666 ether, "max_supply");
        _assert(token.owner() == OWNER, "owner");
    }

    function test_frozenSupplyAndThreeHolderBalancesImportExactly() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        _assert(token.totalSupply() == 333_333_333 ether, "total_supply");
        _assert(token.balanceOf(TREASURY) == TREASURY_BALANCE, "treasury");
        _assert(token.balanceOf(STAKING) == STAKING_BALANCE, "staking");
        _assert(token.balanceOf(PRESALE) == PRESALE_BALANCE, "presale");

        _assert(
            token.balanceOf(TREASURY) +
                token.balanceOf(STAKING) +
                token.balanceOf(PRESALE) ==
                token.totalSupply(),
            "holder_sum"
        );
    }

    function test_transferAndApproveReturnTrueLikeObservedLegacyCalls() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        vm.prank(TREASURY);
        bool transferOk = token.transfer(RECIPIENT, 1);
        _assert(transferOk, "transfer_return");
        _assert(token.balanceOf(RECIPIENT) == 1, "transfer_value");

        vm.prank(TREASURY);
        bool approveOk = token.approve(SPENDER, 7);
        _assert(approveOk, "approve_return");
        _assert(token.allowance(TREASURY, SPENDER) == 7, "allowance");
    }

    function test_transferFromUsesAllowanceAndReturnsTrue() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        vm.prank(TREASURY);
        token.approve(SPENDER, 10);

        vm.prank(SPENDER);
        bool ok = token.transferFrom(TREASURY, RECIPIENT, 4);

        _assert(ok, "transfer_from_return");
        _assert(token.balanceOf(RECIPIENT) == 4, "transfer_from_value");
        _assert(token.allowance(TREASURY, SPENDER) == 6, "allowance_decrement");
    }

    function test_mintIsCeremonyOwnerOnlyAndLegacyOwnerHasNoPower() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        vm.prank(OWNER);
        bool ownerOk = token.mint(RECIPIENT, 1);
        _assert(ownerOk, "owner_mint");
        _assert(token.balanceOf(RECIPIENT) == 1, "owner_mint_value");

        vm.prank(LEGACY_OWNER);
        try token.mint(RECIPIENT, 1) returns (bool) {
            revert("legacy_owner_mint_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: not owner"), "legacy_owner_reason");
        }
    }

    function test_mintCapMatchesObservedLegacyBoundary() public {
        VoidEpoch2TokenV1 token = _installFrozenState();
        uint256 remaining = token.MAX_SUPPLY() - token.totalSupply();

        vm.prank(OWNER);
        bool ok = token.mint(RECIPIENT, remaining);
        _assert(ok, "mint_to_cap");
        _assert(token.totalSupply() == token.MAX_SUPPLY(), "cap_total");

        vm.prank(OWNER);
        try token.mint(RECIPIENT, 1) returns (bool) {
            revert("mint_above_cap_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: cap exceeded"), "cap_reason");
        }
    }

    function test_mintToZeroMatchesObservedLegacyFailure() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        vm.prank(OWNER);
        try token.mint(address(0), 1) returns (bool) {
            revert("mint_to_zero_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: mint to zero"), "mint_zero_reason");
        }
    }

    function test_edgeTransferSemanticsMatchFrozenLegacyCensus() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        vm.prank(TREASURY);
        bool zeroTransferOk = token.transfer(RECIPIENT, 0);
        _assert(zeroTransferOk, "zero_transfer_return");

        vm.prank(TREASURY);
        try token.transfer(address(0), 1) returns (bool) {
            revert("transfer_to_zero_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: transfer to zero"), "transfer_zero_reason");
        }

        address zeroBalance = address(0x1111);
        vm.prank(zeroBalance);
        try token.transfer(RECIPIENT, 1) returns (bool) {
            revert("zero_balance_transfer_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: balance too low"), "balance_reason");
        }

        vm.prank(zeroBalance);
        bool zeroFromZeroBalanceOk = token.transfer(RECIPIENT, 0);
        _assert(zeroFromZeroBalanceOk, "zero_from_zero_balance");

        uint256 beforeBalance = token.balanceOf(TREASURY);
        vm.prank(TREASURY);
        bool selfOk = token.transfer(TREASURY, 1);
        _assert(selfOk, "self_transfer_return");
        _assert(token.balanceOf(TREASURY) == beforeBalance, "self_transfer_balance");
    }

    function test_edgeApproveSemanticsMatchFrozenLegacyCensus() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        vm.prank(TREASURY);
        try token.approve(address(0), 1) returns (bool) {
            revert("approve_zero_spender_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: approve to zero"), "approve_zero_reason");
        }

        vm.prank(TREASURY);
        bool zeroApproveOk = token.approve(SPENDER, 0);
        _assert(zeroApproveOk, "approve_zero_amount_return");
        _assert(token.allowance(TREASURY, SPENDER) == 0, "approve_zero_amount_state");
    }

    function test_edgeTransferFromSemanticsMatchFrozenLegacyCensus() public {
        VoidEpoch2TokenV1 token = _installFrozenState();
        address noAllowanceSpender = address(0x2222);

        vm.prank(noAllowanceSpender);
        try token.transferFrom(TREASURY, RECIPIENT, 1) returns (bool) {
            revert("transfer_from_without_allowance_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: allowance exceeded"), "allowance_reason");
        }

        vm.prank(noAllowanceSpender);
        bool zeroOk = token.transferFrom(TREASURY, RECIPIENT, 0);
        _assert(zeroOk, "transfer_from_zero_return");

        vm.prank(noAllowanceSpender);
        try token.transferFrom(TREASURY, address(0), 0) returns (bool) {
            revert("transfer_from_zero_to_zero_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: transfer to zero"), "tf_zero_reason");
        }
    }

    function test_edgeMintZeroSemanticsMatchFrozenLegacyCensus() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        vm.prank(OWNER);
        bool ownerZeroOk = token.mint(RECIPIENT, 0);
        _assert(ownerZeroOk, "owner_zero_mint");

        vm.prank(TREASURY);
        try token.mint(RECIPIENT, 0) returns (bool) {
            revert("non_owner_zero_mint_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: not owner"), "non_owner_zero_reason");
        }

        vm.prank(OWNER);
        try token.mint(address(0), 0) returns (bool) {
            revert("owner_zero_mint_to_zero_accepted");
        } catch Error(string memory reason) {
            _assert(_eq(reason, "VoidToken: mint to zero"), "owner_zero_to_zero_reason");
        }
    }

    function test_noOwnershipTransferSurface() public {
        _installFrozenState();

        vm.prank(OWNER);
        (bool ok,) = TOKEN.call(
            abi.encodeWithSignature("transferOwnership(address)", RECIPIENT)
        );
        _assert(!ok, "ownership_transfer_surface_present");
    }

    function test_allowanceStorageRootIsDeterministicForGenesisImport() public {
        VoidEpoch2TokenV1 token = _installFrozenState();

        bytes32 allowanceKey = _nestedMappingKey(TREASURY, SPENDER, 2);
        vm.store(TOKEN, allowanceKey, bytes32(uint256(9)));

        _assert(token.allowance(TREASURY, SPENDER) == 9, "allowance_storage");
    }
}
