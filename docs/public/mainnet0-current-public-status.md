# VOID Mainnet-0 current public status

<!-- VOID_MAINNET0_CURRENT_PUBLIC_STATUS_V2 -->

Reviewed: **July 20, 2026**

Status: `PUBLIC_MAINNET0_LIVE_WITH_GUARDED_MUTATION`

VOID Mainnet-0 is live as an early public network with real multi-node operation, public discovery, DataNet evidence, Work Credit earning proofs, operator evidence workflows, and validator readiness evidence.

It is not yet a permissionless production network. Public visibility is intentionally ahead of public mutation authority.

## Current hosted entry point

- Public node: `https://zoso-alienware-aurora-r7.taila47fd.ts.net/public-node`
- Machine discovery: `/.well-known/void-public-node.json`
- Participant application: `/app/`

The repository and discovery document remain the canonical way to understand routes and capability boundaries. A hosted endpoint may change without changing the protocol.

## Capability status

### Live and public read-only

- Public-node dashboard and route discovery.
- Public runtime, build-map, DataNet, Work Credit, validator-candidate, and proof evidence.
- DataNet read, verify, mirror, pin, and public evidence surfaces.
- Work Credit proof summaries and verifier links.
- Native Voidchain and NullFeed public-site routes.
- Public operator self-check and offline evidence review.
- Evidence-pack creation and offline pack review.
- Signed operator evidence attestation and independent verification.
- One-command operator evidence workflow.
- Validator registration positive-readiness public evidence.

### Live as a bounded pilot

- Coordinator-issued Work Credit earning tickets.
- Remote execution by an outside participant or executor.
- Verified receipt submission.
- Fixed or bounded award policy.
- Per-account and global caps.
- Duplicate-ticket and duplicate-receipt protection.
- Participant command-line workflow.

This is real earning, but it is not unrestricted public issuance.

### Guarded

- Work Credit award authorization.
- WC-to-VOID settlement.
- Wallet signing and VOID transfer.
- Buy VOID payment verification and fulfillment.
- Validator activation and validator-set mutation.
- Treasury spending.
- Private RPC and operator mutation routes.

### Not enabled

- Public anonymous ledger writes.
- Permissionless WC minting.
- Automatic Buy VOID fulfillment.
- Public active-validator admission.
- Public treasury control.
- Public wallet or signer custody.

## Work Credit policy

Work Credits account for useful, verifiable work.

- WC are intended to be unlimited accounting units.
- A funded settlement tranche is not a lifetime WC supply cap.
- The policy conversion is `100 WC : 1 VOID`.
- A valid earning result requires a capability-bound ticket, acceptable work, a verified receipt, and successful duplicate/cap checks.
- Current settlement remains explicit and guarded.

## Buy VOID status

The application can guide a participant through a Buy VOID request.

Fulfillment remains:

1. Payment verified.
2. Recipient and request checked.
3. VOID transaction explicitly submitted.
4. Transaction reference recorded.
5. Result independently reviewable.

Automatic fulfillment is not enabled.

## Validator status

Validator registration has positive-readiness public evidence, but registration remains candidate/waiting only.

- Active admission is disabled.
- Stake, identity, readiness, and operator policy remain separate checks.
- A public readiness document does not itself grant validator authority.

See [validator registration positive-readiness public release](../validators/validator-registration-positive-readiness-public-release-v1.md).

## Operator evidence status

The public operator evidence workflow is complete and post-merge proven.

It composes:

1. Public-node self-check.
2. Offline self-check receipt review.
3. Evidence-pack creation.
4. Offline evidence-pack review.
5. Dedicated-domain signed attestation.
6. Independent attestation verification.
7. Recursive checksum verification.

The workflow is read-only. It does not restart a node or mutate chain, DataNet, Work Credit, wallet, Buy VOID, validator, or treasury state.

See [public-node operator evidence workflow](../public-node/public-node-operator-evidence-workflow-v1.md).

## Honest network posture

The project-operated multi-node mesh proves real networking and role separation. It does not by itself prove broad external decentralization.

The next activation goals remain:

- More outside operators.
- More independent public evidence packs.
- More useful-work participation.
- Safer reduction of coordinator dependence.
- Bounded automatic Buy VOID fulfillment after its payment and replay boundaries are fully proven.
- Candidate-to-active validator admission only after the public policy and runtime gates are ready.

## Safety line

Never share private keys, seed phrases, wallet files, `.env` contents, operator credentials, or unredacted receipts containing secrets.

Do not treat a public page, tester receipt, candidate record, or signed evidence pack as authority beyond the exact claim it verifies.

For a role-based introduction, see [Start here](start-here.md). For a compact status table, see the [current capability matrix](current-capability-matrix.md).
