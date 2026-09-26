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
        0x0d66fcdf95d38f7db6b4206bf183f34cd816c2aa;

    address internal constant TREASURY =
        0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514;
    address internal constant STAKING =
        0x77dfeedd19a4741f299c902ad5bbe0de917a9e59;
    address internal constant PRESALE =
        0xa40a43adfd174f88309173cb3daa6e09c10154a7;

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
