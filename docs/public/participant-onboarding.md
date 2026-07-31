# VOID participant onboarding

<!-- VOID_PUBLIC_PARTICIPANT_ONBOARDING_CURRENT_STATE_V2 -->

This guide explains what a participant can do now and which actions remain guarded.

Open the participant application at:

```text
/app/
```

## 1. Understand the capability labels

VOID uses four practical states:

- **Live** — usable within the documented boundary.
- **Bounded pilot** — real, but capped or coordinator-gated.
- **Guarded** — requires explicit trusted action.
- **Planned** — not yet available.

See the [current capability matrix](current-capability-matrix.md).

## 2. Create or unlock your local account wallet

Wallet material must remain local to you.

- Never share a private key or seed phrase.
- Never upload a wallet file to a support ticket.
- Never paste secrets into chat, Discord, Reddit, GitHub, or a public receipt.
- Confirm network, chain ID, recipient, amount, and fee before signing.

VOID does not provide a public custodial signer.

## 3. Earn Work Credits

Work Credits account for useful, verifiable work.

Current earning is a bounded remote-executor pilot.

Participants who do not want to install or run a full VOID node can use the
[VOID Public Earn No-Node Client v1](void-public-earn-no-node-client-v1.md).
The client creates a private local Ed25519 executor identity and performs one
server-selected `datanet_fetch_verify` ticket at a time. A successful verified
run must prove an exact `+3 WC` change in the canonical redeemable balance.

Before using the client, obtain all three values from the trusted coordinator:

- your participant account ID;
- the Public Earn HTTPS gateway origin;
- the coordinator's exact 32-character lowercase hexadecimal node ID.

Run the client's `status` command before `run`. Availability remains
coordinator-gated. The client cannot select the task, dataset, input hash, or
award, and it grants no wallet, settlement, Buy VOID, validator, or operator
authority.

The flow is:

1. A coordinator issues a capability-bound ticket.
2. The participant executes the specified task.
3. The participant produces a result receipt.
4. The coordinator verifies the receipt and execution identity.
5. Duplicate and cap checks run.
6. The account receives the fixed or bounded award.

A participant does not need unrestricted ledger access. The ticket and receipt carry the minimum authority needed for the specific job.

Current boundaries:

- WC are intended to be unlimited accounting units.
- The policy conversion is `100 WC : 1 VOID`.
- A settlement tranche is not a lifetime WC supply cap.
- There is no public generic-credit route.
- Public self-service settlement is not enabled.
- A receipt is not automatically accepted merely because it exists.

## 4. Use DataNet

Participants can use DataNet workflows to publish, read, verify, mirror, pin, and review data within the available local or authorized path.

Public-node DataNet evidence is read-only. Public internet access to evidence does not grant public write authority.

Data weighting can consider verification, freshness, duplication, suspicion, tombstone state, storage tier, AI visibility, trust, and promotion eligibility.

## 5. Create a Buy VOID request

The Buy surface can guide request creation.

Fulfillment remains guarded:

1. Payment must be independently verified.
2. The recipient and request must match.
3. An operator must explicitly authorize fulfillment.
4. The VOID transaction reference must be recorded.
5. The participant should verify the result independently.

Automatic Buy VOID fulfillment is not enabled.

Do not send blind deposits, exchange withdrawals, custodial sends, or money based only on a direct message.

## 6. WC-to-VOID settlement

The policy conversion is `100 WC : 1 VOID`, but settlement is not a permissionless public route.

Settlement requires the documented explicit authorization, account checks, available settlement capacity, and transaction evidence.

## 7. Validator candidacy

A participant may follow the validator candidate path, but active admission remains disabled.

Positive-readiness evidence shows that the registration surface is prepared; it does not activate the candidate.

See [validator registration positive-readiness public release](../validators/validator-registration-positive-readiness-public-release-v1.md).

## 8. Verify before trusting

Use public proofs and receipts to verify exact claims:

- Node readiness.
- Peer visibility.
- DataNet object identity.
- Work Credit ticket and receipt status.
- Transaction reference.
- Operator evidence-pack checksums.
- Signed attestation binding.
- Validator candidate readiness.

A tester receipt, candidate record, public page, or operator signature has only the authority explicitly described by its schema and verification policy.

## Need help?

- [Start here](start-here.md)
- [Current public status](mainnet0-current-public-status.md)
- [Support guide](../../SUPPORT.md)
- [Security policy](../../SECURITY.md)
