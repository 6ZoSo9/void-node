# VALIDATOR STAKING UPGRADE ONBOARDING POLICY

Status: operator and participant policy for onboarding additional validators onto
the upgrade-track staking/runtime path.

## Purpose

This policy defines when a new validator may register as a candidate, when an
operator may advance that candidate, and what proof must be captured before the
validator is considered active.

## Scope

This policy applies to the upgrade-track validator stack and the Mainnet-0
candidate/waiting boundary.

It does not:

- mutate frozen Mainnet-0 validator contracts;
- remove the frozen rollback path;
- give a downloaded node automatic validator authority;
- let an operator collect a participant wallet key; or
- treat candidate registration as active consensus.

## Minimum validator onboarding requirements

A candidate validator must have:

- a unique participant-controlled candidate wallet;
- a participant-selected reward address;
- a unique public consensus-key fingerprint bound to the node identity;
- enough native gas for the candidate transaction;
- at least **10,000 VOID** for the candidate stake;
- a healthy node with readiness, latest-block, and peer evidence;
- public endpoint or P2P metadata where applicable; and
- an exact participant-signed candidate registration.

The participant wallet remains self-custodied. Private keys, seed phrases,
mnemonics, and wallet files must never be supplied to VOID tooling or an
operator.

## Participant-signed candidate registration

The public candidate transaction is:

```text
registerCandidate(reward, consensusKeyHash, metadataHash)
```

on chain ID `2050`, with exactly 10,000 VOID as the transaction value unless a
later locked policy explicitly changes the minimum.

The participant onboarding tool may prepare and content-address the unsigned
transaction, and may verify an already signed transaction. It cannot sign for
the participant.

A successful registration creates **Candidate** state only.

## Candidate, Waiting, and Active separation

The Mainnet-0 sequence is:

1. participant registers Candidate with self-custodied stake;
2. registry authority reviews evidence and may move Candidate to Waiting;
3. selection respects the active cap and activation churn limit;
4. registry authority may move a bounded Waiting batch to Active;
5. runtime/epoch evidence proves the active node is actually participating; and
6. public status is updated only after exact proof.

There is **no automatic promotion** from Candidate to Waiting or from Waiting to
Active.

## Funding model

Public candidate onboarding does not use the historical treasury-funded
operator sequence. The participant supplies their own candidate stake and gas.

The older operator-funded path remains historical evidence for controlled
validators. It must not be presented as the public participant path and must not
be used to request participant secrets.

## Required proof after candidate registration

Candidate registration is successful only if:

- the transaction succeeded on chain ID `2050`;
- the registry record owner equals the participant wallet;
- reward, consensus-key hash, metadata hash, and stake match the reviewed packet;
- stake is at least 10,000 VOID;
- state is exactly `Candidate`; and
- Waiting, Active, and runtime-consensus claims remain false.

## Required proof after Waiting admission

Waiting admission is valid only if:

- the exact candidate record was reviewed;
- the authority transaction succeeded;
- state is exactly `Waiting`;
- active validator count did not increase; and
- no runtime consensus claim is made.

## Required proof after active onboarding

A validator onboarding is considered active only when all of the following are true:

- registry state is `Active`;
- the activation batch respected the cap and churn limit;
- the candidate address appears in the active validator set;
- next-epoch manifest verifies successfully;
- next-epoch validator count and power change as expected;
- published and published-match checks are true;
- runtime live routes load the new epoch successfully;
- shadow mismatch count remains zero; and
- multivalidator readiness remains green.

## Rollback and failure policy

If any step partially succeeds but proof fails:

- do not continue onboarding more validators;
- do not claim active validation;
- inspect candidate, waiting, active, and epoch state;
- inspect latest manifest and shadow diagnostics; and
- prefer halting further mutation over piling on additional state changes.

## Current minimum stake

The locked Mainnet-0 minimum is **10,000 VOID** per validator candidate.

Any proof, deployment parameter, documentation, or interface that still assumes
1,000 VOID is stale and must fail review.

## Current operator posture

Until a reviewed public candidate-registry address is deployed and published,
participant tooling must stop at readiness and unsigned-packet preparation.
After deployment, participant registration remains self-signed, while Waiting
and Active transitions remain controlled, explicit, auditable, and separate.

## Machine gates

Before active onboarding, run:

- `ops/mainnet/validator-staking-upgrade-multivalidator-readiness.sh`;
- `ops/mainnet/validator-staking-upgrade-onboarding-runbook-gate.sh`; and
- `npm run participant:onboard:proof`.

If any gate fails, do not activate the validator.
