// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Append-only Chain-2050 role-authority registry source v1.
/// @dev The contract computes the same SHA-256 canonical JSON record/root identities
///      used by src/security/chain2050_role_authority_{record,registry}_v1.ts.
contract VoidChain2050RoleAuthorityRegistryV1 {
    uint256 public constant CHAIN_ID = 2050;
    string public constant RECORD_SCHEMA =
        "void.chain2050-role-authority-record.v1";
    string public constant REGISTRY_ROOT_DOMAIN =
        "void.chain2050-role-authority-registry-root.v1";

    enum AuthorityStatus {
        Active,
        Revoked
    }

    enum Transition {
        GenesisGrant,
        Revoke,
        Restore,
        SubjectBindingChange,
        PolicyChange,
        RoleChange
    }

    struct RoleRecordInput {
        string identityId;
        string role;
        AuthorityStatus authorityStatus;
        uint64 roleAuthorityGeneration;
        bytes32 subjectBindingSha256;
        bytes32 authorityPolicySha256;
        bool hasPredecessor;
        bytes32 predecessorRoleRecordSha256;
        Transition transition;
    }

    struct RoleRecord {
        string identityId;
        string role;
        AuthorityStatus authorityStatus;
        uint64 roleAuthorityGeneration;
        bytes32 subjectBindingSha256;
        bytes32 authorityPolicySha256;
        bool hasPredecessor;
        bytes32 predecessorRoleRecordSha256;
        Transition transition;
        bytes32 roleRecordSha256;
    }

    struct RegistryEntry {
        uint64 entryIndex;
        bytes32 previousRegistryRootSha256;
        bytes32 roleRecordSha256;
        bytes32 registryRootSha256;
        RoleRecord record;
    }

    address public owner;
    address public pendingOwner;
    bytes32 public immutable emptyRegistryRootSha256;
    bytes32 public registryRootSha256;

    RegistryEntry[] private entries;
    mapping(bytes32 => uint256) private currentEntryPlusOne;

    event RoleAuthorityRecordAppended(
        uint64 indexed entryIndex,
        bytes32 indexed identityKey,
        string identityId,
        string role,
        AuthorityStatus authorityStatus,
        uint64 roleAuthorityGeneration,
        bytes32 subjectBindingSha256,
        bytes32 authorityPolicySha256,
        bool hasPredecessor,
        bytes32 predecessorRoleRecordSha256,
        Transition transition,
        bytes32 roleRecordSha256,
        bytes32 previousRegistryRootSha256,
        bytes32 registryRootSha256
    );
    event OwnershipTransferStarted(
        address indexed currentOwner,
        address indexed pendingOwner
    );
    event OwnershipTransferCanceled(
        address indexed currentOwner,
        address indexed canceledPendingOwner
    );
    event OwnershipTransferred(
        address indexed oldOwner,
        address indexed newOwner
    );

    error WrongChainId(uint256 observed);
    error NotOwner();
    error NotPendingOwner();
    error InvalidOwner();
    error OwnershipTransferPending();
    error NoOwnershipTransferPending();
    error InvalidIdentityId();
    error InvalidRole();
    error InvalidGenesis();
    error InvalidPredecessorShape();
    error SameGenerationDifferentHash();
    error GenerationExhausted();
    error GenerationMustIncrementByOne();
    error PredecessorMismatch();
    error GenesisTransitionAfterGenesis();
    error TransitionMustChangeExactlyOneAuthorityField();
    error TransitionReasonMismatch();
    error EntryIndexExhausted();
    error EntryIndexOutOfBounds();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        if (block.chainid != CHAIN_ID) revert WrongChainId(block.chainid);
        if (initialOwner == address(0)) revert InvalidOwner();
        owner = initialOwner;
        emptyRegistryRootSha256 = _computeEmptyRegistryRootSha256();
        registryRootSha256 = emptyRegistryRootSha256;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function entryCount() external view returns (uint256) {
        return entries.length;
    }

    function getEntry(
        uint256 index
    ) external view returns (RegistryEntry memory) {
        if (index >= entries.length) revert EntryIndexOutOfBounds();
        return entries[index];
    }

    function getCurrentRoleAuthorityRecord(
        string calldata identityId
    ) external view returns (bool exists, RegistryEntry memory entry) {
        bytes32 key = _identityKey(identityId);
        uint256 plusOne = currentEntryPlusOne[key];
        if (plusOne == 0) return (false, entry);
        return (true, entries[plusOne - 1]);
    }

    /// @notice Append one exact authority record, or accept an exact idempotent replay.
    /// @dev Exact replay returns appended=false and performs no storage/event mutation.
    function appendRoleAuthorityRecord(
        RoleRecordInput calldata input
    )
        external
        onlyOwner
        returns (
            bool appended,
            uint64 entryIndex,
            bytes32 roleRecordSha256,
            bytes32 nextRegistryRootSha256
        )
    {
        _validateIdentityId(input.identityId);
        _validateRole(input.role);

        bytes32 key = _identityKey(input.identityId);
        uint256 currentPlusOne = currentEntryPlusOne[key];
        bytes32 candidateHash = computeRoleRecordSha256(input);

        if (currentPlusOne == 0) {
            _validateGenesis(input);
        } else {
            RegistryEntry storage current = entries[currentPlusOne - 1];

            if (
                input.roleAuthorityGeneration ==
                current.record.roleAuthorityGeneration
            ) {
                if (candidateHash == current.record.roleRecordSha256) {
                    return (
                        false,
                        current.entryIndex,
                        current.record.roleRecordSha256,
                        registryRootSha256
                    );
                }
                revert SameGenerationDifferentHash();
            }

            _validateTransition(current.record, input);
        }

        if (entries.length > type(uint64).max) revert EntryIndexExhausted();
        entryIndex = uint64(entries.length);

        bytes32 previousRoot = registryRootSha256;
        nextRegistryRootSha256 = computeRegistryRootSha256(
            previousRoot,
            entryIndex,
            input.identityId,
            input.roleAuthorityGeneration,
            candidateHash
        );

        RoleRecord memory record = RoleRecord({
            identityId: input.identityId,
            role: input.role,
            authorityStatus: input.authorityStatus,
            roleAuthorityGeneration: input.roleAuthorityGeneration,
            subjectBindingSha256: input.subjectBindingSha256,
            authorityPolicySha256: input.authorityPolicySha256,
            hasPredecessor: input.hasPredecessor,
            predecessorRoleRecordSha256:
                input.predecessorRoleRecordSha256,
            transition: input.transition,
            roleRecordSha256: candidateHash
        });

        entries.push(
            RegistryEntry({
                entryIndex: entryIndex,
                previousRegistryRootSha256: previousRoot,
                roleRecordSha256: candidateHash,
                registryRootSha256: nextRegistryRootSha256,
                record: record
            })
        );

        currentEntryPlusOne[key] = entries.length;
        registryRootSha256 = nextRegistryRootSha256;

        emit RoleAuthorityRecordAppended(
            entryIndex,
            key,
            input.identityId,
            input.role,
            input.authorityStatus,
            input.roleAuthorityGeneration,
            input.subjectBindingSha256,
            input.authorityPolicySha256,
            input.hasPredecessor,
            input.predecessorRoleRecordSha256,
            input.transition,
            candidateHash,
            previousRoot,
            nextRegistryRootSha256
        );

        return (
            true,
            entryIndex,
            candidateHash,
            nextRegistryRootSha256
        );
    }

    function computeRoleRecordSha256(
        RoleRecordInput calldata input
    ) public pure returns (bytes32) {
        _validateIdentityId(input.identityId);
        _validateRole(input.role);
        if (
            !input.hasPredecessor &&
            input.predecessorRoleRecordSha256 != bytes32(0)
        ) {
            revert InvalidPredecessorShape();
        }
        return sha256(_canonicalRoleRecordJson(input));
    }

    function computeRegistryRootSha256(
        bytes32 previousRegistryRoot,
        uint64 entryIndex,
        string calldata identityId,
        uint64 roleAuthorityGeneration,
        bytes32 roleRecordSha256
    ) public pure returns (bytes32) {
        _validateIdentityId(identityId);
        return sha256(
            abi.encodePacked(
                '{"chain_id":2050,"domain":"',
                REGISTRY_ROOT_DOMAIN,
                '","entry_index":"',
                _uintToString(entryIndex),
                '","identity_id":"',
                identityId,
                '","previous_registry_root_sha256":"',
                _hex32(previousRegistryRoot),
                '","role_authority_generation":"',
                _uintToString(roleAuthorityGeneration),
                '","role_record_sha256":"',
                _hex32(roleRecordSha256),
                '"}'
            )
        );
    }

    function computeEmptyRegistryRootSha256()
        external
        pure
        returns (bytes32)
    {
        return _computeEmptyRegistryRootSha256();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0) || newOwner == owner) {
            revert InvalidOwner();
        }
        if (pendingOwner != address(0)) {
            revert OwnershipTransferPending();
        }
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function cancelOwnershipTransfer() external onlyOwner {
        address canceled = pendingOwner;
        if (canceled == address(0)) revert NoOwnershipTransferPending();
        pendingOwner = address(0);
        emit OwnershipTransferCanceled(owner, canceled);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address oldOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, msg.sender);
    }

    function _validateGenesis(RoleRecordInput calldata input) private pure {
        if (
            input.roleAuthorityGeneration != 0 ||
            input.hasPredecessor ||
            input.predecessorRoleRecordSha256 != bytes32(0) ||
            input.transition != Transition.GenesisGrant ||
            input.authorityStatus != AuthorityStatus.Active
        ) {
            revert InvalidGenesis();
        }
    }

    function _validateTransition(
        RoleRecord storage current,
        RoleRecordInput calldata next
    ) private view {
        if (
            keccak256(bytes(current.identityId)) !=
            keccak256(bytes(next.identityId))
        ) {
            revert InvalidIdentityId();
        }

        if (
            current.roleAuthorityGeneration == type(uint64).max
        ) {
            revert GenerationExhausted();
        }
        if (
            next.roleAuthorityGeneration !=
            current.roleAuthorityGeneration + 1
        ) {
            revert GenerationMustIncrementByOne();
        }
        if (
            !next.hasPredecessor ||
            next.predecessorRoleRecordSha256 !=
            current.roleRecordSha256
        ) {
            revert PredecessorMismatch();
        }
        if (next.transition == Transition.GenesisGrant) {
            revert GenesisTransitionAfterGenesis();
        }

        bool roleChanged =
            keccak256(bytes(current.role)) !=
            keccak256(bytes(next.role));
        bool statusChanged =
            current.authorityStatus != next.authorityStatus;
        bool subjectChanged =
            current.subjectBindingSha256 != next.subjectBindingSha256;
        bool policyChanged =
            current.authorityPolicySha256 != next.authorityPolicySha256;

        uint256 changeCount =
            (roleChanged ? 1 : 0) +
            (statusChanged ? 1 : 0) +
            (subjectChanged ? 1 : 0) +
            (policyChanged ? 1 : 0);

        if (changeCount != 1) {
            revert TransitionMustChangeExactlyOneAuthorityField();
        }

        Transition expected;
        if (statusChanged) {
            if (
                current.authorityStatus == AuthorityStatus.Active &&
                next.authorityStatus == AuthorityStatus.Revoked
            ) {
                expected = Transition.Revoke;
            } else if (
                current.authorityStatus == AuthorityStatus.Revoked &&
                next.authorityStatus == AuthorityStatus.Active
            ) {
                expected = Transition.Restore;
            } else {
                revert TransitionReasonMismatch();
            }
        } else if (roleChanged) {
            expected = Transition.RoleChange;
        } else if (subjectChanged) {
            expected = Transition.SubjectBindingChange;
        } else {
            expected = Transition.PolicyChange;
        }

        if (next.transition != expected) {
            revert TransitionReasonMismatch();
        }
    }

    function _canonicalRoleRecordJson(
        RoleRecordInput calldata input
    ) private pure returns (bytes memory) {
        bytes memory predecessorJson = input.hasPredecessor
            ? abi.encodePacked(
                '"',
                _hex32(input.predecessorRoleRecordSha256),
                '"'
            )
            : bytes("null");

        return abi.encodePacked(
            '{"authority_policy_sha256":"',
            _hex32(input.authorityPolicySha256),
            '","authority_status":"',
            _statusString(input.authorityStatus),
            '","chain_id":2050,"identity_id":"',
            input.identityId,
            '","predecessor_role_record_sha256":',
            predecessorJson,
            ',"role":"',
            input.role,
            '","role_authority_generation":"',
            _uintToString(input.roleAuthorityGeneration),
            '","schema":"',
            RECORD_SCHEMA,
            '","subject_binding_sha256":"',
            _hex32(input.subjectBindingSha256),
            '","transition":"',
            _transitionString(input.transition),
            '"}'
        );
    }

    function _computeEmptyRegistryRootSha256()
        private
        pure
        returns (bytes32)
    {
        return sha256(
            abi.encodePacked(
                '{"chain_id":2050,"domain":"',
                REGISTRY_ROOT_DOMAIN,
                '","empty":true}'
            )
        );
    }

    function _identityKey(
        string memory identityId
    ) private pure returns (bytes32) {
        return sha256(bytes(identityId));
    }

    function _validateIdentityId(string memory value) private pure {
        bytes memory raw = bytes(value);
        if (raw.length < 3 || raw.length > 192) {
            revert InvalidIdentityId();
        }

        uint8 first = uint8(raw[0]);
        if (!_lowerOrDigit(first)) revert InvalidIdentityId();

        for (uint256 i = 1; i < raw.length; i++) {
            uint8 c = uint8(raw[i]);
            if (
                !_lowerOrDigit(c) &&
                c != 0x2e && // .
                c != 0x5f && // _
                c != 0x3a && // :
                c != 0x2d    // -
            ) {
                revert InvalidIdentityId();
            }
        }
    }

    function _validateRole(string memory value) private pure {
        bytes memory raw = bytes(value);
        if (raw.length < 2 || raw.length > 64) revert InvalidRole();

        uint8 first = uint8(raw[0]);
        if (first < 0x41 || first > 0x5a) revert InvalidRole();

        for (uint256 i = 1; i < raw.length; i++) {
            uint8 c = uint8(raw[i]);
            bool upper = c >= 0x41 && c <= 0x5a;
            bool digit = c >= 0x30 && c <= 0x39;
            if (!upper && !digit && c != 0x5f) revert InvalidRole();
        }
    }

    function _lowerOrDigit(uint8 c) private pure returns (bool) {
        return (
            (c >= 0x61 && c <= 0x7a) ||
            (c >= 0x30 && c <= 0x39)
        );
    }

    function _statusString(
        AuthorityStatus status
    ) private pure returns (string memory) {
        return status == AuthorityStatus.Active ? "active" : "revoked";
    }

    function _transitionString(
        Transition transition
    ) private pure returns (string memory) {
        if (transition == Transition.GenesisGrant) return "genesis_grant";
        if (transition == Transition.Revoke) return "revoke";
        if (transition == Transition.Restore) return "restore";
        if (transition == Transition.SubjectBindingChange) {
            return "subject_binding_change";
        }
        if (transition == Transition.PolicyChange) return "policy_change";
        return "role_change";
    }

    function _uintToString(
        uint256 value
    ) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _hex32(
        bytes32 value
    ) private pure returns (string memory) {
        bytes16 symbols = "0123456789abcdef";
        bytes memory output = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            uint8 b = uint8(value[i]);
            output[2 * i] = symbols[b >> 4];
            output[2 * i + 1] = symbols[b & 0x0f];
        }
        return string(output);
    }
}
