// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/mainnet/DatanetContentCommitmentRegistryV1.sol";

contract DatanetUnauthorizedPublisherV1 {
    function callCommit(
        DatanetContentCommitmentRegistryV1 registry,
        bytes32 objectIdSha256,
        bytes32 contentSha256,
        uint64 byteLength
    ) external {
        registry.commit(objectIdSha256, contentSha256, byteLength);
    }
}

contract DatanetIncompatiblePredecessorV1 is IDatanetContentCommitmentRegistryV1 {
    uint256 internal immutable _version;
    uint64 internal immutable _maxBytes;

    constructor(uint256 version_, uint64 maxBytes_) {
        _version = version_;
        _maxBytes = maxBytes_;
    }

    function registryVersion() external view override returns (uint256) {
        return _version;
    }

    function maxObjectBytes() external view override returns (uint64) {
        return _maxBytes;
    }

    function isCommitted(bytes32) external pure override returns (bool) {
        return false;
    }

    function getCommitment(bytes32)
        external
        pure
        override
        returns (bool, bytes32, uint64, uint256)
    {
        return (false, bytes32(0), 0, 0);
    }
}

contract DatanetContentCommitmentRegistryV1Test {
    uint64 internal constant MAX_OBJECT_BYTES = 268_435_456;
    bytes32 internal constant CONTENT_A =
        0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;
    bytes32 internal constant CONTENT_B =
        0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb;

    function _assert(bool condition, string memory reason) internal pure {
        require(condition, reason);
    }

    function _object(string memory value) internal pure returns (bytes32) {
        return sha256(bytes(value));
    }

    function _deploy() internal returns (DatanetContentCommitmentRegistryV1 registry) {
        registry = new DatanetContentCommitmentRegistryV1(address(this), address(0));
    }

    function test_firstCommitRecordsExactDigestLengthAndBlock() public {
        DatanetContentCommitmentRegistryV1 registry = _deploy();
        bytes32 objectId = _object("void-object-a");

        registry.commit(objectId, CONTENT_A, 4096);

        (bool committed, bytes32 digest, uint64 byteLength, uint256 atBlock) =
            registry.getCommitment(objectId);
        _assert(committed, "not_committed");
        _assert(digest == CONTENT_A, "digest_mismatch");
        _assert(byteLength == 4096, "length_mismatch");
        _assert(atBlock == block.number, "block_mismatch");
        _assert(registry.isCommitted(objectId), "is_committed_false");
    }

    function test_sameObjectCannotBeReboundToDifferentBytes() public {
        DatanetContentCommitmentRegistryV1 registry = _deploy();
        bytes32 objectId = _object("void-object-a");
        registry.commit(objectId, CONTENT_A, 4096);

        try registry.commit(objectId, CONTENT_B, 8192) {
            revert("duplicate_rebind_accepted");
        } catch {}

        (, bytes32 digest, uint64 byteLength,) = registry.getCommitment(objectId);
        _assert(digest == CONTENT_A, "duplicate_changed_digest");
        _assert(byteLength == 4096, "duplicate_changed_length");
    }

    function test_onlyConfiguredPublisherCanCommit() public {
        DatanetContentCommitmentRegistryV1 registry = _deploy();
        DatanetUnauthorizedPublisherV1 caller = new DatanetUnauthorizedPublisherV1();
        bytes32 objectId = _object("void-object-a");

        try caller.callCommit(registry, objectId, CONTENT_A, 4096) {
            revert("unauthorized_commit_accepted");
        } catch {}

        _assert(!registry.isCommitted(objectId), "unauthorized_commit_persisted");
    }

    function test_zeroAndOversizeInputsFailClosed() public {
        DatanetContentCommitmentRegistryV1 registry = _deploy();
        bytes32 objectId = _object("void-object-a");

        try registry.commit(bytes32(0), CONTENT_A, 1) {
            revert("zero_object_accepted");
        } catch {}
        try registry.commit(objectId, bytes32(0), 1) {
            revert("zero_digest_accepted");
        } catch {}
        try registry.commit(objectId, CONTENT_A, 0) {
            revert("zero_length_accepted");
        } catch {}
        try registry.commit(objectId, CONTENT_A, MAX_OBJECT_BYTES + 1) {
            revert("oversize_accepted");
        } catch {}

        _assert(!registry.isCommitted(objectId), "invalid_input_persisted");
    }

    function test_exactStructuralMaximumIsAccepted() public {
        DatanetContentCommitmentRegistryV1 registry = _deploy();
        bytes32 objectId = _object("void-object-max");
        registry.commit(objectId, CONTENT_A, MAX_OBJECT_BYTES);

        (, bytes32 digest, uint64 byteLength,) = registry.getCommitment(objectId);
        _assert(digest == CONTENT_A, "max_digest_mismatch");
        _assert(byteLength == MAX_OBJECT_BYTES, "max_length_mismatch");
    }

    function test_successorPreservesPredecessorIdentityAndRejectsReplay() public {
        DatanetContentCommitmentRegistryV1 first = _deploy();
        bytes32 objectA = _object("void-object-a");
        bytes32 objectB = _object("void-object-b");
        first.commit(objectA, CONTENT_A, 4096);

        DatanetContentCommitmentRegistryV1 successor =
            new DatanetContentCommitmentRegistryV1(address(this), address(first));

        _assert(successor.isCommitted(objectA), "successor_lost_predecessor");

        try successor.commit(objectA, CONTENT_B, 8192) {
            revert("successor_replay_accepted");
        } catch {}

        successor.commit(objectB, CONTENT_B, 8192);

        (bool aCommitted, bytes32 aDigest, uint64 aLength,) =
            successor.getCommitment(objectA);
        (bool bCommitted, bytes32 bDigest, uint64 bLength,) =
            successor.getCommitment(objectB);

        _assert(aCommitted && aDigest == CONTENT_A && aLength == 4096, "predecessor_read_mismatch");
        _assert(bCommitted && bDigest == CONTENT_B && bLength == 8192, "successor_local_mismatch");
    }

    function test_successorRejectsIncompatiblePredecessorContract() public {
        DatanetIncompatiblePredecessorV1 wrongVersion =
            new DatanetIncompatiblePredecessorV1(2, MAX_OBJECT_BYTES);
        try new DatanetContentCommitmentRegistryV1(address(this), address(wrongVersion)) {
            revert("wrong_version_predecessor_accepted");
        } catch {}

        DatanetIncompatiblePredecessorV1 wrongLimit =
            new DatanetIncompatiblePredecessorV1(1, MAX_OBJECT_BYTES - 1);
        try new DatanetContentCommitmentRegistryV1(address(this), address(wrongLimit)) {
            revert("wrong_limit_predecessor_accepted");
        } catch {}
    }

    function test_zeroPublisherFailsClosed() public {
        try new DatanetContentCommitmentRegistryV1(address(0), address(0)) {
            revert("zero_publisher_accepted");
        } catch {}
    }
}
