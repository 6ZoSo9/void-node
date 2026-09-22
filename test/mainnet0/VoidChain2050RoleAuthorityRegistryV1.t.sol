// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/mainnet0/VoidChain2050RoleAuthorityRegistryV1.sol";

interface VmRoleAuthorityV1 {
    function chainId(uint256 newChainId) external;
    function prank(address msgSender) external;
    function expectRevert(bytes4 revertData) external;
    function expectRevert(bytes calldata revertData) external;
}

abstract contract RoleAuthorityV1TestBase {
    VmRoleAuthorityV1 internal constant vm =
        VmRoleAuthorityV1(
            address(uint160(uint256(keccak256("hevm cheat code"))))
        );

    function assertTrue(bool value) internal pure {
        require(value, "expected true");
    }

    function assertFalse(bool value) internal pure {
        require(!value, "expected false");
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "uint mismatch");
    }

    function assertEq(address a, address b) internal pure {
        require(a == b, "address mismatch");
    }

    function assertEq(bytes32 a, bytes32 b) internal pure {
        require(a == b, "bytes32 mismatch");
    }

    function assertEq(string memory a, string memory b) internal pure {
        require(
            keccak256(bytes(a)) == keccak256(bytes(b)),
            "string mismatch"
        );
    }
}

contract VoidChain2050RoleAuthorityRegistryV1Test
    is RoleAuthorityV1TestBase
{
    VoidChain2050RoleAuthorityRegistryV1 internal reg;

    address internal owner = address(0xA11CE);
    address internal bob = address(0xB0B);

    bytes32 internal constant SUBJECT_A =
        0x1111111111111111111111111111111111111111111111111111111111111111;
    bytes32 internal constant SUBJECT_B =
        0x3333333333333333333333333333333333333333333333333333333333333333;
    bytes32 internal constant POLICY_A =
        0x2222222222222222222222222222222222222222222222222222222222222222;
    bytes32 internal constant POLICY_B =
        0x4444444444444444444444444444444444444444444444444444444444444444;

    bytes32 internal constant EXPECTED_EMPTY_ROOT =
        0xd50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7;
    bytes32 internal constant EXPECTED_ALICE_GENESIS_RECORD =
        0xa5c68c57f369e46923a2123330ad03b055361d1005447f6364b612bf5ab5d2ff;
    bytes32 internal constant EXPECTED_ALICE_GENESIS_ROOT =
        0x7d1d4d79c64fbcb8269b56dafcc8ecc573f23683f9989a548208f27f270fd975;

    function setUp() public {
        vm.chainId(2050);
        reg = new VoidChain2050RoleAuthorityRegistryV1(owner);
    }

    function testConstructorPinsChainAndExactEmptyRoot() public {
        assertEq(reg.CHAIN_ID(), 2050);
        assertEq(reg.owner(), owner);
        assertEq(reg.emptyRegistryRootSha256(), EXPECTED_EMPTY_ROOT);
        assertEq(reg.registryRootSha256(), EXPECTED_EMPTY_ROOT);
        assertEq(reg.entryCount(), 0);
        assertEq(reg.computeEmptyRegistryRootSha256(), EXPECTED_EMPTY_ROOT);

        vm.chainId(2051);
        vm.expectRevert(
            abi.encodeWithSelector(
                VoidChain2050RoleAuthorityRegistryV1.WrongChainId.selector,
                uint256(2051)
            )
        );
        new VoidChain2050RoleAuthorityRegistryV1(owner);

        vm.chainId(2050);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1.InvalidOwner.selector
        );
        new VoidChain2050RoleAuthorityRegistryV1(address(0));
    }

    function testGenesisParityAndReadSurface() public {
        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory input = _aliceGenesis();

        assertEq(
            reg.computeRoleRecordSha256(input),
            EXPECTED_ALICE_GENESIS_RECORD
        );
        assertEq(
            reg.computeRegistryRootSha256(
                EXPECTED_EMPTY_ROOT,
                0,
                input.identityId,
                input.roleAuthorityGeneration,
                EXPECTED_ALICE_GENESIS_RECORD
            ),
            EXPECTED_ALICE_GENESIS_ROOT
        );

        vm.prank(owner);
        (
            bool appended,
            uint64 index,
            bytes32 recordHash,
            bytes32 root
        ) = reg.appendRoleAuthorityRecord(input);

        assertTrue(appended);
        assertEq(index, 0);
        assertEq(recordHash, EXPECTED_ALICE_GENESIS_RECORD);
        assertEq(root, EXPECTED_ALICE_GENESIS_ROOT);
        assertEq(reg.registryRootSha256(), EXPECTED_ALICE_GENESIS_ROOT);
        assertEq(reg.entryCount(), 1);

        VoidChain2050RoleAuthorityRegistryV1.RegistryEntry memory entry =
            reg.getEntry(0);
        assertEq(entry.entryIndex, 0);
        assertEq(entry.previousRegistryRootSha256, EXPECTED_EMPTY_ROOT);
        assertEq(entry.roleRecordSha256, EXPECTED_ALICE_GENESIS_RECORD);
        assertEq(entry.registryRootSha256, EXPECTED_ALICE_GENESIS_ROOT);
        assertEq(entry.record.identityId, "participant.alice");
        assertEq(entry.record.role, "AGENT");
        assertEq(
            uint256(entry.record.authorityStatus),
            uint256(
                VoidChain2050RoleAuthorityRegistryV1.AuthorityStatus.Active
            )
        );
        assertEq(entry.record.roleAuthorityGeneration, 0);
        assertEq(entry.record.subjectBindingSha256, SUBJECT_A);
        assertEq(entry.record.authorityPolicySha256, POLICY_A);
        assertFalse(entry.record.hasPredecessor);
        assertEq(entry.record.predecessorRoleRecordSha256, bytes32(0));
        assertEq(
            uint256(entry.record.transition),
            uint256(
                VoidChain2050RoleAuthorityRegistryV1.Transition.GenesisGrant
            )
        );

        (
            bool exists,
            VoidChain2050RoleAuthorityRegistryV1.RegistryEntry
                memory current
        ) = reg.getCurrentRoleAuthorityRecord("participant.alice");
        assertTrue(exists);
        assertEq(current.roleRecordSha256, EXPECTED_ALICE_GENESIS_RECORD);

        (bool missing, ) =
            reg.getCurrentRoleAuthorityRecord("participant.missing");
        assertFalse(missing);

        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1.EntryIndexOutOfBounds.selector
        );
        reg.getEntry(1);
    }

    function testExactReplayDoesNotAppendOrMoveRoot() public {
        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory input = _aliceGenesis();

        vm.prank(owner);
        reg.appendRoleAuthorityRecord(input);
        bytes32 rootBefore = reg.registryRootSha256();

        vm.prank(owner);
        (
            bool appended,
            uint64 index,
            bytes32 recordHash,
            bytes32 root
        ) = reg.appendRoleAuthorityRecord(input);

        assertFalse(appended);
        assertEq(index, 0);
        assertEq(recordHash, EXPECTED_ALICE_GENESIS_RECORD);
        assertEq(root, rootBefore);
        assertEq(reg.entryCount(), 1);
        assertEq(reg.registryRootSha256(), rootBefore);
    }

    function testRevokeRestoreAndAuthorityFieldTransitions() public {
        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory a0 = _aliceGenesis();
        vm.prank(owner);
        (, , bytes32 a0Hash, ) = reg.appendRoleAuthorityRecord(a0);

        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory a1 = a0;
        a1.authorityStatus =
            VoidChain2050RoleAuthorityRegistryV1.AuthorityStatus.Revoked;
        a1.roleAuthorityGeneration = 1;
        a1.hasPredecessor = true;
        a1.predecessorRoleRecordSha256 = a0Hash;
        a1.transition =
            VoidChain2050RoleAuthorityRegistryV1.Transition.Revoke;

        vm.prank(owner);
        (bool appended1, uint64 index1, bytes32 a1Hash, ) =
            reg.appendRoleAuthorityRecord(a1);
        assertTrue(appended1);
        assertEq(index1, 1);

        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory a2 = a1;
        a2.authorityStatus =
            VoidChain2050RoleAuthorityRegistryV1.AuthorityStatus.Active;
        a2.roleAuthorityGeneration = 2;
        a2.predecessorRoleRecordSha256 = a1Hash;
        a2.transition =
            VoidChain2050RoleAuthorityRegistryV1.Transition.Restore;

        vm.prank(owner);
        (bool appended2, uint64 index2, bytes32 a2Hash, ) =
            reg.appendRoleAuthorityRecord(a2);
        assertTrue(appended2);
        assertEq(index2, 2);

        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory a3 = a2;
        a3.subjectBindingSha256 = SUBJECT_B;
        a3.roleAuthorityGeneration = 3;
        a3.predecessorRoleRecordSha256 = a2Hash;
        a3.transition =
            VoidChain2050RoleAuthorityRegistryV1.Transition
                .SubjectBindingChange;

        vm.prank(owner);
        (, , bytes32 a3Hash, ) = reg.appendRoleAuthorityRecord(a3);

        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory a4 = a3;
        a4.authorityPolicySha256 = POLICY_B;
        a4.roleAuthorityGeneration = 4;
        a4.predecessorRoleRecordSha256 = a3Hash;
        a4.transition =
            VoidChain2050RoleAuthorityRegistryV1.Transition.PolicyChange;

        vm.prank(owner);
        (, , bytes32 a4Hash, ) = reg.appendRoleAuthorityRecord(a4);

        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory a5 = a4;
        a5.role = "VALIDATOR";
        a5.roleAuthorityGeneration = 5;
        a5.predecessorRoleRecordSha256 = a4Hash;
        a5.transition =
            VoidChain2050RoleAuthorityRegistryV1.Transition.RoleChange;

        vm.prank(owner);
        (bool appended5, uint64 index5, , ) =
            reg.appendRoleAuthorityRecord(a5);

        assertTrue(appended5);
        assertEq(index5, 5);
        assertEq(reg.entryCount(), 6);

        (
            bool exists,
            VoidChain2050RoleAuthorityRegistryV1.RegistryEntry
                memory current
        ) = reg.getCurrentRoleAuthorityRecord("participant.alice");
        assertTrue(exists);
        assertEq(current.record.role, "VALIDATOR");
        assertEq(current.record.roleAuthorityGeneration, 5);
    }

    function testOnlyOwnerMayAppend() public {
        vm.prank(bob);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1.NotOwner.selector
        );
        reg.appendRoleAuthorityRecord(_aliceGenesis());
    }

    function testSameGenerationDifferentHashRejected() public {
        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory input = _aliceGenesis();
        vm.prank(owner);
        reg.appendRoleAuthorityRecord(input);

        input.authorityPolicySha256 = POLICY_B;
        vm.prank(owner);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1
                .SameGenerationDifferentHash
                .selector
        );
        reg.appendRoleAuthorityRecord(input);
    }

    function testGenerationSkipAndPredecessorMismatchRejected() public {
        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory a0 = _aliceGenesis();
        vm.prank(owner);
        (, , bytes32 a0Hash, ) = reg.appendRoleAuthorityRecord(a0);

        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory skipped = a0;
        skipped.authorityPolicySha256 = POLICY_B;
        skipped.roleAuthorityGeneration = 2;
        skipped.hasPredecessor = true;
        skipped.predecessorRoleRecordSha256 = a0Hash;
        skipped.transition =
            VoidChain2050RoleAuthorityRegistryV1.Transition.PolicyChange;

        vm.prank(owner);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1
                .GenerationMustIncrementByOne
                .selector
        );
        reg.appendRoleAuthorityRecord(skipped);

        skipped.roleAuthorityGeneration = 1;
        skipped.predecessorRoleRecordSha256 = bytes32(uint256(7));

        vm.prank(owner);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1
                .PredecessorMismatch
                .selector
        );
        reg.appendRoleAuthorityRecord(skipped);
    }

    function testMultiFieldAndWrongTransitionRejected() public {
        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory a0 = _aliceGenesis();
        vm.prank(owner);
        (, , bytes32 a0Hash, ) = reg.appendRoleAuthorityRecord(a0);

        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory multi = a0;
        multi.role = "VALIDATOR";
        multi.authorityPolicySha256 = POLICY_B;
        multi.roleAuthorityGeneration = 1;
        multi.hasPredecessor = true;
        multi.predecessorRoleRecordSha256 = a0Hash;
        multi.transition =
            VoidChain2050RoleAuthorityRegistryV1.Transition.RoleChange;

        vm.prank(owner);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1
                .TransitionMustChangeExactlyOneAuthorityField
                .selector
        );
        reg.appendRoleAuthorityRecord(multi);

        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory wrong = _aliceGenesis();
        wrong.authorityPolicySha256 = POLICY_B;
        wrong.roleAuthorityGeneration = 1;
        wrong.hasPredecessor = true;
        wrong.predecessorRoleRecordSha256 = a0Hash;
        wrong.transition =
            VoidChain2050RoleAuthorityRegistryV1.Transition.RoleChange;

        vm.prank(owner);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1
                .TransitionReasonMismatch
                .selector
        );
        reg.appendRoleAuthorityRecord(wrong);
    }

    function testInvalidIdentityRoleAndGenesisRejected() public {
        VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
            memory input = _aliceGenesis();

        input.identityId = "A";
        vm.prank(owner);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1.InvalidIdentityId.selector
        );
        reg.appendRoleAuthorityRecord(input);

        input = _aliceGenesis();
        input.role = "agent";
        vm.prank(owner);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1.InvalidRole.selector
        );
        reg.appendRoleAuthorityRecord(input);

        input = _aliceGenesis();
        input.authorityStatus =
            VoidChain2050RoleAuthorityRegistryV1.AuthorityStatus.Revoked;
        vm.prank(owner);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1.InvalidGenesis.selector
        );
        reg.appendRoleAuthorityRecord(input);
    }

    function testOwnershipTransferIsTwoStepAndCancelable() public {
        vm.prank(owner);
        reg.transferOwnership(bob);
        assertEq(reg.owner(), owner);
        assertEq(reg.pendingOwner(), bob);

        vm.prank(address(0xCAFE));
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1.NotPendingOwner.selector
        );
        reg.acceptOwnership();

        vm.prank(owner);
        reg.cancelOwnershipTransfer();
        assertEq(reg.pendingOwner(), address(0));

        vm.prank(owner);
        reg.transferOwnership(bob);
        vm.prank(bob);
        reg.acceptOwnership();

        assertEq(reg.owner(), bob);
        assertEq(reg.pendingOwner(), address(0));

        vm.prank(owner);
        vm.expectRevert(
            VoidChain2050RoleAuthorityRegistryV1.NotOwner.selector
        );
        reg.appendRoleAuthorityRecord(_aliceGenesis());

        vm.prank(bob);
        reg.appendRoleAuthorityRecord(_aliceGenesis());
        assertEq(reg.entryCount(), 1);
    }

    function _aliceGenesis()
        internal
        pure
        returns (
            VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput
                memory input
        )
    {
        input = VoidChain2050RoleAuthorityRegistryV1.RoleRecordInput({
            identityId: "participant.alice",
            role: "AGENT",
            authorityStatus:
                VoidChain2050RoleAuthorityRegistryV1
                    .AuthorityStatus
                    .Active,
            roleAuthorityGeneration: 0,
            subjectBindingSha256: SUBJECT_A,
            authorityPolicySha256: POLICY_A,
            hasPredecessor: false,
            predecessorRoleRecordSha256: bytes32(0),
            transition:
                VoidChain2050RoleAuthorityRegistryV1
                    .Transition
                    .GenesisGrant
        });
    }
}
