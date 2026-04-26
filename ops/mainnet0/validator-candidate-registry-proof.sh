#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

export PATH="$HOME/.foundry/bin:$PATH"

PROOF_ROOT="${PROOF_ROOT:-/tmp/void-candidate-registry-proof.$$}"
rm -rf "$PROOF_ROOT"
mkdir -p "$PROOF_ROOT/src" "$PROOF_ROOT/test"

cp contracts/mainnet0/VoidValidatorCandidateRegistry.sol "$PROOF_ROOT/src/VoidValidatorCandidateRegistry.sol"

cat > "$PROOF_ROOT/foundry.toml" <<'TOML'
[profile.default]
src = "src"
test = "test"
out = "out"
libs = []
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200
TOML

cat > "$PROOF_ROOT/test/VoidValidatorCandidateRegistryHarness.t.sol" <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/VoidValidatorCandidateRegistry.sol";

contract CandidateActor {
    function register(
        VoidValidatorCandidateRegistry reg,
        address reward,
        bytes32 consensusKeyHash,
        bytes32 metadataHash
    ) external payable {
        reg.registerCandidate{value: msg.value}(reward, consensusKeyHash, metadataHash);
    }

    function moveToWaiting(VoidValidatorCandidateRegistry reg, address who) external {
        reg.moveToWaiting(who);
    }
}

contract VoidValidatorCandidateRegistryHarness {
    VoidValidatorCandidateRegistry reg;

    CandidateActor alice;
    CandidateActor bob;
    CandidateActor carol;

    uint256 constant MIN_STAKE = 1000 ether;

    function setUp() public {
        reg = new VoidValidatorCandidateRegistry({
            _minValidatorStake: MIN_STAKE,
            _maxActiveValidators: 2,
            _activationChurnLimit: 1
        });

        alice = new CandidateActor();
        bob = new CandidateActor();
        carol = new CandidateActor();
    }

    function testPublicRegistrationDoesNotActivate() public {
        setUp();
        uint256 activeBefore = reg.activeCount();

        alice.register{value: MIN_STAKE}(
            reg,
            address(alice),
            keccak256("alice-consensus-key"),
            keccak256("alice-metadata")
        );

        require(reg.candidateCount() == 1, "candidateCount changed wrong");
        require(reg.waitingCount() == 0, "waitingCount should stay zero");
        require(reg.activeCount() == activeBefore, "registration must not activate");

        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(address(alice));
        require(c.owner == address(alice), "wrong owner");
        require(
            uint256(c.state) == uint256(VoidValidatorCandidateRegistry.ValidatorState.Candidate),
            "wrong state"
        );
    }

    function testOnlyOwnerCanMoveCandidateToWaiting() public {
        setUp();

        alice.register{value: MIN_STAKE}(
            reg,
            address(alice),
            keccak256("alice-consensus-key"),
            keccak256("alice-metadata")
        );

        bool unauthorizedFailed = false;
        try bob.moveToWaiting(reg, address(alice)) {
            unauthorizedFailed = false;
        } catch {
            unauthorizedFailed = true;
        }
        require(unauthorizedFailed, "non-owner moved candidate");

        reg.moveToWaiting(address(alice));

        require(reg.waitingCount() == 1, "waiting count wrong");
        require(reg.activeCount() == 0, "active count should stay zero");
    }

    function testActivationIsChurnLimitedAndCapLimited() public {
        setUp();

        _registerAndWait(alice, "alice");
        _registerAndWait(bob, "bob");
        _registerAndWait(carol, "carol");

        address[] memory one = new address[](1);
        one[0] = address(alice);
        reg.markActiveBatch(one);

        require(reg.activeCount() == 1, "active count after alice wrong");
        require(reg.waitingCount() == 2, "waiting count after alice wrong");

        address[] memory two = new address[](2);
        two[0] = address(bob);
        two[1] = address(carol);

        bool churnFailed = false;
        try reg.markActiveBatch(two) {
            churnFailed = false;
        } catch {
            churnFailed = true;
        }
        require(churnFailed, "churn limit not enforced");

        one[0] = address(bob);
        reg.markActiveBatch(one);

        require(reg.activeCount() == 2, "active count after bob wrong");
        require(reg.waitingCount() == 1, "waiting count after bob wrong");

        one[0] = address(carol);

        bool capFailed = false;
        try reg.markActiveBatch(one) {
            capFailed = false;
        } catch {
            capFailed = true;
        }
        require(capFailed, "active cap not enforced");
    }

    function testStakeMinimumEnforced() public {
        setUp();

        bool stakeFailed = false;
        try alice.register{value: MIN_STAKE - 1}(
            reg,
            address(alice),
            keccak256("alice-consensus-key"),
            keccak256("alice-metadata")
        ) {
            stakeFailed = false;
        } catch {
            stakeFailed = true;
        }

        require(stakeFailed, "stake minimum not enforced");
    }

    function _registerAndWait(CandidateActor who, string memory label) internal {
        who.register{value: MIN_STAKE}(
            reg,
            address(who),
            keccak256(abi.encodePacked(label, "-consensus-key")),
            keccak256(abi.encodePacked(label, "-metadata"))
        );
        reg.moveToWaiting(address(who));
    }
}
SOL

echo "=== isolated validator candidate registry forge test ==="
(
  cd "$PROOF_ROOT"
  forge test -vvv
)

echo
echo "=== safety invariant ==="
cat <<'TXT'
[ok] public validator registration creates candidate/waiting state only
[ok] registration does not increase activeCount
[ok] owner/epoch admission path is separate
[ok] activation is churn-limited
[ok] active validator cap is enforced
TXT
